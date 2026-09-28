import {
  BOT_GROUP_MAX_HOPS,
  isPassReply,
  routeBotReply,
  routeUserMessage,
  type BotGroup,
  type BotGroupMessage
} from '../../shared/bot-group-types'
import { buildBotSystemPromptAppend, type Bot } from '../../shared/bot-types'
import type { BotGroupStore } from './bot-group-store'

export type BotGroupTurnInput = {
  bot: Bot
  /** Persona plus the group protocol, appended to Claude Code's preset system prompt. */
  systemPromptAppend: string
  prompt: string
  resumeProviderSessionId: string | null
}

export type BotGroupTurnResult = { text: string; providerSessionId: string | null }

/** Runs one reply turn for a bot; the engine owns routing, history and handoffs. */
export type BotGroupTurnRunner = (input: BotGroupTurnInput) => Promise<BotGroupTurnResult>

type Member = { id: string; name: string; role: string }

export function buildGroupProtocol(
  group: BotGroup,
  self: Bot,
  members: readonly Member[],
  mayPass: boolean
): string {
  const roster = members
    .map(
      (member) =>
        `- @${member.name}${member.role ? ` (${member.role})` : ''}${member.id === self.id ? ' — you' : ''}`
    )
    .join('\n')
  return [
    `You are in the group chat "${group.name}" with the user and these bots:`,
    roster,
    'Reply in the language the user writes in. Keep replies short, like chat messages.',
    'To hand work to another bot, mention it with @Name; it will read your message and answer.',
    'Mention a bot only when you need it to act. Do not mention yourself.',
    'In this group you can read and search files but not edit them or run commands; do that work in your own chat.',
    mayPass
      ? 'Nobody was mentioned: answer only if the latest messages concern your role. Otherwise reply exactly [pass].'
      : 'You were asked directly: answer.'
  ].join('\n')
}

export function formatUnseenMessages(
  messages: readonly BotGroupMessage[],
  nameOf: (botId: string) => string
): string {
  const lines = messages.map((message) =>
    message.author.kind === 'user'
      ? `[User]: ${message.text}`
      : `[@${nameOf(message.author.botId)}]: ${message.text}`
  )
  return ['New messages in the group:', ...lines, '', 'Write your reply to the group.'].join('\n')
}

export class BotGroupEngine {
  // One turn at a time per bot per group, so replies and session resumes never interleave.
  private readonly memberLocks = new Map<string, Promise<unknown>>()
  private readonly thinking = new Map<string, Set<string>>()

  constructor(
    private readonly store: BotGroupStore,
    private readonly listBots: () => Bot[],
    private readonly runTurn: BotGroupTurnRunner,
    private readonly onActivity: (groupId: string, thinkingBotIds: string[]) => void = () => {}
  ) {}

  /** Posts the user's message and resolves once every triggered reply and handoff has settled. */
  async sendUserMessage(groupId: string, text: string): Promise<void> {
    const group = this.store.getGroup(groupId)
    if (!group) {
      throw new Error(`No group with id ${groupId}.`)
    }
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    await this.store.appendMessage(groupId, { kind: 'user' }, trimmed)
    const members = this.members(group)
    const { recipients, mayPass } = routeUserMessage(trimmed, members)
    await this.runWaves(group, recipients, mayPass)
  }

  private members(group: BotGroup): Member[] {
    const bots = new Map(this.listBots().map((bot) => [bot.id, bot]))
    return group.botIds.flatMap((id) => {
      const bot = bots.get(id)
      return bot ? [{ id: bot.id, name: bot.name, role: bot.role }] : []
    })
  }

  private async runWaves(group: BotGroup, firstWave: string[], mayPass: boolean): Promise<void> {
    let wave = firstWave
    let passAllowed = mayPass
    let handoffs = 0
    while (wave.length > 0) {
      const replies = await Promise.all(
        wave.map((botId) => this.runMemberTurn(group, botId, passAllowed))
      )
      const next = [...new Set(replies.flat())]
      const budget = BOT_GROUP_MAX_HOPS - handoffs
      wave = next.slice(0, Math.max(0, budget))
      handoffs += wave.length
      // Why: a handoff names its recipient, so the recipient must answer.
      passAllowed = false
    }
  }

  /** Runs one reply; returns the bot ids the reply hands off to. */
  private runMemberTurn(group: BotGroup, botId: string, mayPass: boolean): Promise<string[]> {
    const key = `${group.id}:${botId}`
    const previous = this.memberLocks.get(key) ?? Promise.resolve()
    const turn = previous.catch(() => {}).then(() => this.executeTurn(group, botId, mayPass))
    this.memberLocks.set(key, turn)
    return turn
  }

  private async executeTurn(group: BotGroup, botId: string, mayPass: boolean): Promise<string[]> {
    const bot = this.listBots().find((candidate) => candidate.id === botId)
    const current = this.store.getGroup(group.id)
    if (!bot || !current) {
      return []
    }
    const unseen = this.store.unseenMessages(group.id, botId)
    const lastSeen = unseen.at(-1)
    // Why: a bot's own replies are never news to it, even when they sit after its read marker.
    const incoming = unseen.filter(
      (message) => message.author.kind !== 'bot' || message.author.botId !== botId
    )
    if (!lastSeen || incoming.length === 0) {
      return []
    }
    const members = this.members(current)
    const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'bot'
    const session = this.store.getMemberSession(group.id, botId)
    this.setThinking(group.id, botId, true)
    let result: BotGroupTurnResult
    try {
      result = await this.runTurn({
        bot,
        systemPromptAppend: [
          buildBotSystemPromptAppend(bot),
          buildGroupProtocol(current, bot, members, mayPass)
        ].join('\n\n'),
        prompt: formatUnseenMessages(incoming, nameOf),
        resumeProviderSessionId: session.providerSessionId
      })
    } catch (error) {
      console.error('[bot-groups] turn failed', { groupId: group.id, botId, error })
      await this.store.appendMessage(
        group.id,
        { kind: 'bot', botId },
        `⚠️ ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    } finally {
      this.setThinking(group.id, botId, false)
    }
    await this.store.setMemberSession(group.id, botId, {
      providerSessionId: result.providerSessionId ?? session.providerSessionId,
      lastSeenMessageId: lastSeen.id
    })
    const reply = result.text.trim()
    if (!reply || (mayPass && isPassReply(reply))) {
      return []
    }
    await this.store.appendMessage(group.id, { kind: 'bot', botId }, reply)
    return routeBotReply(reply, botId, members)
  }

  private setThinking(groupId: string, botId: string, on: boolean): void {
    const set = this.thinking.get(groupId) ?? new Set<string>()
    if (on) {
      set.add(botId)
    } else {
      set.delete(botId)
    }
    this.thinking.set(groupId, set)
    this.onActivity(groupId, [...set])
  }
}
