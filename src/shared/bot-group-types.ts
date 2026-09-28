// A group chat of bots: the user's messages fan out by the Grok rules, and bots hand off by @mention.

export const BOT_GROUP_NAME_MAX_LENGTH = 60
export const BOT_GROUP_MESSAGE_MAX_LENGTH = 20_000
/** Bot-to-bot handoffs allowed per user message, so two bots cannot loop forever. */
export const BOT_GROUP_MAX_HOPS = 6
/** A bot answering with exactly this token stays silent. */
export const BOT_GROUP_PASS_TOKEN = '[pass]'

export type BotGroup = {
  id: string
  name: string
  projectId: string
  botIds: string[]
  createdAt: number
  updatedAt: number
}

export type BotGroupMessageAuthor = { kind: 'user' } | { kind: 'bot'; botId: string }

export type BotGroupMessage = {
  id: string
  groupId: string
  author: BotGroupMessageAuthor
  text: string
  createdAt: number
}

export type BotGroupCreateInput = { name: string; projectId: string; botIds: string[] }
export type BotGroupUpdateInput = Partial<Pick<BotGroup, 'name' | 'botIds'>>

export type BotGroupsChangedPayload = { groups: BotGroup[] }
export type BotGroupMessagesChangedPayload = { groupId: string; messages: BotGroupMessage[] }
/** Bots currently composing a reply, per group. */
export type BotGroupActivityPayload = { groupId: string; thinkingBotIds: string[] }

type MentionTarget = { id: string; name: string }

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Bot ids @mentioned in `text`, in first-mention order. Longer names win so "@Sr. Barriga"
 * is not read as a bot called "Sr"; names match case-insensitively up to a word boundary.
 */
export function parseBotMentions(text: string, bots: readonly MentionTarget[]): string[] {
  const hits: { id: string; index: number }[] = []
  const claimed: [number, number][] = []
  const byLength = [...bots].sort((left, right) => right.name.length - left.name.length)
  for (const bot of byLength) {
    if (!bot.name.trim()) {
      continue
    }
    const pattern = new RegExp(`@${escapeForRegExp(bot.name)}(?![\\p{L}\\p{N}_])`, 'giu')
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (claimed.some(([from, to]) => start < to && end > from)) {
        continue
      }
      claimed.push([start, end])
      if (!hits.some((hit) => hit.id === bot.id)) {
        hits.push({ id: bot.id, index: start })
      }
    }
  }
  return hits.sort((left, right) => left.index - right.index).map((hit) => hit.id)
}

/** Who answers a user message: the mentioned members, or every member when nobody is named. */
export function routeUserMessage(
  text: string,
  members: readonly MentionTarget[]
): { recipients: string[]; mayPass: boolean } {
  const mentioned = parseBotMentions(text, members)
  return mentioned.length > 0
    ? { recipients: mentioned, mayPass: false }
    : { recipients: members.map((member) => member.id), mayPass: true }
}

/** Who a bot's reply hands off to: mentioned members other than the author. */
export function routeBotReply(
  text: string,
  authorBotId: string,
  members: readonly MentionTarget[]
): string[] {
  return parseBotMentions(text, members).filter((id) => id !== authorBotId)
}

export function isPassReply(text: string): boolean {
  return text.trim().toLowerCase() === BOT_GROUP_PASS_TOKEN
}

export function normalizeBotGroupName(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, BOT_GROUP_NAME_MAX_LENGTH) : ''
}

export function parseStoredBotGroup(value: unknown): BotGroup | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const field = (key: string): unknown => Reflect.get(value, key)
  const id = field('id')
  const projectId = field('projectId')
  const botIds = field('botIds')
  const createdAt = field('createdAt')
  const updatedAt = field('updatedAt')
  const name = normalizeBotGroupName(field('name'))
  if (typeof id !== 'string' || !id || typeof projectId !== 'string' || !name) {
    return null
  }
  return {
    id,
    name,
    projectId,
    botIds: Array.isArray(botIds) ? botIds.filter((b): b is string => typeof b === 'string') : [],
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
    updatedAt: typeof updatedAt === 'number' ? updatedAt : 0
  }
}

export function parseStoredBotGroupMessage(value: unknown): BotGroupMessage | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const field = (key: string): unknown => Reflect.get(value, key)
  const id = field('id')
  const groupId = field('groupId')
  const text = field('text')
  const createdAt = field('createdAt')
  const author = field('author')
  if (typeof id !== 'string' || typeof groupId !== 'string' || typeof text !== 'string') {
    return null
  }
  const authorKind = author && typeof author === 'object' ? Reflect.get(author, 'kind') : null
  const authorBotId = author && typeof author === 'object' ? Reflect.get(author, 'botId') : null
  const parsedAuthor: BotGroupMessageAuthor | null =
    authorKind === 'user'
      ? { kind: 'user' }
      : authorKind === 'bot' && typeof authorBotId === 'string'
        ? { kind: 'bot', botId: authorBotId }
        : null
  if (!parsedAuthor) {
    return null
  }
  return {
    id,
    groupId,
    author: parsedAuthor,
    text: text.slice(0, BOT_GROUP_MESSAGE_MAX_LENGTH),
    createdAt: typeof createdAt === 'number' ? createdAt : 0
  }
}
