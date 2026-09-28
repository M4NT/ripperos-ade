import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  BOT_GROUP_MESSAGE_MAX_LENGTH,
  normalizeBotGroupName,
  parseStoredBotGroup,
  parseStoredBotGroupMessage,
  type BotGroup,
  type BotGroupCreateInput,
  type BotGroupMessage,
  type BotGroupMessageAuthor,
  type BotGroupUpdateInput
} from '../../shared/bot-group-types'
import { durableWriteTempPath, writeFileDurable } from '../durable-file-write'
import { getDataFile } from '../persistence/loading-store/user-data-path'

const SCHEMA_VERSION = 1
/** Kept per group; older messages drop off (bots keep their own session memory). */
export const BOT_GROUP_HISTORY_LIMIT = 500

/** A bot's conversation inside one group: its Claude session and what it has already read. */
export type BotGroupMemberSession = {
  providerSessionId: string | null
  lastSeenMessageId: string | null
}

type PersistedGroups = {
  schemaVersion: number
  groups: unknown[]
  messages: unknown[]
  sessions: Record<string, BotGroupMemberSession>
}

export function getBotGroupsFile(dataFile = getDataFile()): string {
  return join(dirname(dataFile), 'ripperos-bot-groups.json')
}

function sessionKey(groupId: string, botId: string): string {
  return `${groupId}:${botId}`
}

function readPersisted(file: string): Omit<PersistedGroups, 'schemaVersion'> {
  const empty = { groups: [], messages: [], sessions: {} }
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return empty
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return empty
    }
    const groups: unknown = Reflect.get(parsed, 'groups')
    const messages: unknown = Reflect.get(parsed, 'messages')
    const sessions: unknown = Reflect.get(parsed, 'sessions')
    return {
      groups: Array.isArray(groups) ? groups : [],
      messages: Array.isArray(messages) ? messages : [],
      sessions: sessions && typeof sessions === 'object' ? { ...sessions } : {}
    }
  } catch (error) {
    console.warn('[bot-groups] ignoring unreadable groups file:', error)
    return empty
  }
}

export class BotGroupStore {
  private groups: BotGroup[]
  private messages: BotGroupMessage[]
  private sessions: Record<string, BotGroupMemberSession>
  private writeChain: Promise<void> = Promise.resolve()
  private readonly groupListeners = new Set<(groups: BotGroup[]) => void>()
  private readonly messageListeners = new Set<
    (groupId: string, messages: BotGroupMessage[]) => void
  >()

  constructor(
    private readonly file: string = getBotGroupsFile(),
    private readonly now: () => number = Date.now,
    private readonly historyLimit = BOT_GROUP_HISTORY_LIMIT
  ) {
    const persisted = readPersisted(file)
    this.groups = persisted.groups
      .map(parseStoredBotGroup)
      .filter((group): group is BotGroup => group !== null)
    this.messages = persisted.messages
      .map(parseStoredBotGroupMessage)
      .filter((message): message is BotGroupMessage => message !== null)
    this.sessions = {}
    for (const [key, value] of Object.entries(persisted.sessions)) {
      if (value && typeof value === 'object') {
        const providerSessionId: unknown = Reflect.get(value, 'providerSessionId')
        const lastSeenMessageId: unknown = Reflect.get(value, 'lastSeenMessageId')
        this.sessions[key] = {
          providerSessionId: typeof providerSessionId === 'string' ? providerSessionId : null,
          lastSeenMessageId: typeof lastSeenMessageId === 'string' ? lastSeenMessageId : null
        }
      }
    }
  }

  listGroups(): BotGroup[] {
    return [...this.groups]
  }

  getGroup(id: string): BotGroup | null {
    return this.groups.find((group) => group.id === id) ?? null
  }

  listMessages(groupId: string): BotGroupMessage[] {
    return this.messages.filter((message) => message.groupId === groupId)
  }

  getMemberSession(groupId: string, botId: string): BotGroupMemberSession {
    return (
      this.sessions[sessionKey(groupId, botId)] ?? {
        providerSessionId: null,
        lastSeenMessageId: null
      }
    )
  }

  /** Messages a member has not seen yet, oldest first. */
  unseenMessages(groupId: string, botId: string): BotGroupMessage[] {
    const all = this.listMessages(groupId)
    const lastSeen = this.getMemberSession(groupId, botId).lastSeenMessageId
    const index = lastSeen ? all.findIndex((message) => message.id === lastSeen) : -1
    return all.slice(index + 1)
  }

  onGroupsChange(listener: (groups: BotGroup[]) => void): () => void {
    this.groupListeners.add(listener)
    return () => this.groupListeners.delete(listener)
  }

  onMessagesChange(listener: (groupId: string, messages: BotGroupMessage[]) => void): () => void {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  async createGroup(input: BotGroupCreateInput): Promise<BotGroup> {
    const name = normalizeBotGroupName(input.name)
    if (!name) {
      throw new Error('A group needs a name.')
    }
    if (!Array.isArray(input.botIds) || input.botIds.length < 2) {
      throw new Error('A group needs at least two bots.')
    }
    const at = this.now()
    const group: BotGroup = {
      id: randomUUID(),
      name,
      projectId: input.projectId,
      botIds: [...new Set(input.botIds)],
      createdAt: at,
      updatedAt: at
    }
    this.groups = [...this.groups, group]
    await this.persist()
    this.emitGroups()
    return group
  }

  async updateGroup(id: string, patch: BotGroupUpdateInput): Promise<BotGroup> {
    const current = this.getGroup(id)
    if (!current) {
      throw new Error(`No group with id ${id}.`)
    }
    const name = patch.name === undefined ? current.name : normalizeBotGroupName(patch.name)
    if (!name) {
      throw new Error('A group needs a name.')
    }
    const next: BotGroup = {
      ...current,
      name,
      botIds: patch.botIds === undefined ? current.botIds : [...new Set(patch.botIds)],
      updatedAt: this.now()
    }
    this.groups = this.groups.map((group) => (group.id === id ? next : group))
    await this.persist()
    this.emitGroups()
    return next
  }

  async removeGroup(id: string): Promise<void> {
    if (!this.getGroup(id)) {
      return
    }
    this.groups = this.groups.filter((group) => group.id !== id)
    this.messages = this.messages.filter((message) => message.groupId !== id)
    for (const key of Object.keys(this.sessions)) {
      if (key.startsWith(`${id}:`)) {
        delete this.sessions[key]
      }
    }
    await this.persist()
    this.emitGroups()
  }

  async appendMessage(
    groupId: string,
    author: BotGroupMessageAuthor,
    text: string
  ): Promise<BotGroupMessage> {
    if (!this.getGroup(groupId)) {
      throw new Error(`No group with id ${groupId}.`)
    }
    const message: BotGroupMessage = {
      id: randomUUID(),
      groupId,
      author,
      text: text.slice(0, BOT_GROUP_MESSAGE_MAX_LENGTH),
      createdAt: this.now()
    }
    const inGroup = [...this.listMessages(groupId), message].slice(-this.historyLimit)
    this.messages = [...this.messages.filter((m) => m.groupId !== groupId), ...inGroup]
    await this.persist()
    this.emitMessages(groupId)
    return message
  }

  async setMemberSession(
    groupId: string,
    botId: string,
    session: BotGroupMemberSession
  ): Promise<void> {
    this.sessions[sessionKey(groupId, botId)] = session
    await this.persist()
  }

  private emitGroups(): void {
    for (const listener of this.groupListeners) {
      listener(this.listGroups())
    }
  }

  private emitMessages(groupId: string): void {
    const messages = this.listMessages(groupId)
    for (const listener of this.messageListeners) {
      listener(groupId, messages)
    }
  }

  private async persist(): Promise<void> {
    const payload: PersistedGroups = {
      schemaVersion: SCHEMA_VERSION,
      groups: this.groups,
      messages: this.messages,
      sessions: this.sessions
    }
    const text = `${JSON.stringify(payload, null, 2)}\n`
    // Writes are serialized so an older snapshot can never land after a newer one.
    const write = this.writeChain.then(() =>
      writeFileDurable(durableWriteTempPath(this.file), this.file, text)
    )
    this.writeChain = write.catch(() => {})
    await write
  }
}
