import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  normalizeBotAgent,
  normalizeBotAvatar,
  normalizeBotInstructions,
  normalizeBotName,
  normalizeBotRole,
  botOwnsWorkspace,
  parseStoredBot,
  type Bot,
  type BotCreateInput,
  type BotUpdateInput
} from '../../shared/bot-types'
import { durableWriteTempPath, writeFileDurable } from '../durable-file-write'
import { getDataFile } from '../persistence/loading-store/user-data-path'

const SCHEMA_VERSION = 1

type PersistedBots = { schemaVersion: number; bots: unknown[] }

// Why a sidecar next to orca-data.json: bots are fork-owned and stay out of the upstream profile-state schema.
export function getBotsFile(dataFile = getDataFile()): string {
  return join(dirname(dataFile), 'ripperos-bots.json')
}

function readPersistedBots(file: string): Bot[] {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    const list: unknown = parsed && typeof parsed === 'object' ? Reflect.get(parsed, 'bots') : null
    if (!Array.isArray(list)) {
      return []
    }
    return list.map(parseStoredBot).filter((bot): bot is Bot => bot !== null)
  } catch (error) {
    // A corrupt file must not take the app down; the next write replaces it.
    console.warn('[bots] ignoring unreadable bots file:', error)
    return []
  }
}

export class BotStore {
  private bots: Bot[]
  private writeChain: Promise<void> = Promise.resolve()
  private readonly listeners = new Set<(bots: Bot[]) => void>()

  constructor(
    private readonly file: string = getBotsFile(),
    private readonly now: () => number = Date.now
  ) {
    this.bots = readPersistedBots(file)
  }

  list(): Bot[] {
    return [...this.bots]
  }

  get(id: string): Bot | null {
    return this.bots.find((bot) => bot.id === id) ?? null
  }

  /** The bot that owns a workspace, if any; the first created wins when several claim it. */
  findByWorkspace(workspaceId: string): Bot | null {
    return this.bots.find((bot) => botOwnsWorkspace(bot, workspaceId)) ?? null
  }

  onChange(listener: (bots: Bot[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async create(input: BotCreateInput): Promise<Bot> {
    const name = normalizeBotName(input.name)
    if (!name) {
      throw new Error('A bot needs a name.')
    }
    if (typeof input.projectId !== 'string' || !input.projectId) {
      throw new Error('A bot must belong to a project.')
    }
    const at = this.now()
    const bot: Bot = {
      id: randomUUID(),
      projectId: input.projectId,
      name,
      role: normalizeBotRole(input.role),
      avatar: normalizeBotAvatar(input.avatar),
      instructions: normalizeBotInstructions(input.instructions),
      agent: normalizeBotAgent(input.agent),
      workspaceId: input.workspaceId || null,
      tokenRipper: input.tokenRipper !== false,
      createdAt: at,
      updatedAt: at
    }
    await this.commit([...this.bots, bot])
    return bot
  }

  async update(id: string, patch: BotUpdateInput): Promise<Bot> {
    const current = this.get(id)
    if (!current) {
      throw new Error(`No bot with id ${id}.`)
    }
    const name = patch.name === undefined ? current.name : normalizeBotName(patch.name)
    if (!name) {
      throw new Error('A bot needs a name.')
    }
    const next: Bot = {
      ...current,
      name,
      role: patch.role === undefined ? current.role : normalizeBotRole(patch.role),
      avatar: patch.avatar === undefined ? current.avatar : normalizeBotAvatar(patch.avatar),
      agent: patch.agent === undefined ? current.agent : normalizeBotAgent(patch.agent),
      instructions:
        patch.instructions === undefined
          ? current.instructions
          : normalizeBotInstructions(patch.instructions),
      workspaceId:
        patch.workspaceId === undefined ? current.workspaceId : patch.workspaceId || null,
      tokenRipper: patch.tokenRipper === undefined ? current.tokenRipper : patch.tokenRipper,
      updatedAt: this.now()
    }
    await this.commit(this.bots.map((bot) => (bot.id === id ? next : bot)))
    return next
  }

  async remove(id: string): Promise<void> {
    if (!this.get(id)) {
      return
    }
    await this.commit(this.bots.filter((bot) => bot.id !== id))
  }

  /** Drops bots whose project no longer exists. */
  async pruneProjects(liveProjectIds: ReadonlySet<string>): Promise<void> {
    const kept = this.bots.filter((bot) => liveProjectIds.has(bot.projectId))
    if (kept.length !== this.bots.length) {
      await this.commit(kept)
    }
  }

  private async commit(next: Bot[]): Promise<void> {
    this.bots = next
    const payload: PersistedBots = { schemaVersion: SCHEMA_VERSION, bots: next }
    const text = `${JSON.stringify(payload, null, 2)}\n`
    // Writes are serialized so an older snapshot can never land after a newer one.
    const write = this.writeChain.then(() =>
      writeFileDurable(durableWriteTempPath(this.file), this.file, text)
    )
    this.writeChain = write.catch(() => {})
    await write
    for (const listener of this.listeners) {
      listener(this.list())
    }
  }
}
