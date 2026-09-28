import { isTuiAgent } from './tui-agent-config'
import type { TuiAgent } from './tui-agent'

// A Bot is a user-defined persona that owns one workspace; its instructions ride on every
// Claude session opened there.

export const BOT_NAME_MAX_LENGTH = 40
export const BOT_ROLE_MAX_LENGTH = 60
export const BOT_INSTRUCTIONS_MAX_LENGTH = 20_000

export const BOT_AVATAR_PRESETS = ['orange', 'blue', 'green', 'violet', 'rose', 'slate'] as const
export type BotAvatarPreset = (typeof BOT_AVATAR_PRESETS)[number]

export type BotAgent = TuiAgent

export function normalizeBotAgent(value: unknown): BotAgent {
  return isTuiAgent(value) ? value : 'claude'
}

export type Bot = {
  id: string
  projectId: string
  name: string
  role: string
  avatar: BotAvatarPreset
  instructions: string
  agent: BotAgent
  /** Workspace (worktree or folder workspace id) the bot works in; null until one is assigned. */
  workspaceId: string | null
  /** Default-on terse-output mode (token-the-ripper). */
  tokenRipper: boolean
  createdAt: number
  updatedAt: number
}

export type BotCreateInput = {
  projectId: string
  name: string
  role: string
  avatar?: BotAvatarPreset
  agent?: BotAgent
  instructions?: string
  workspaceId?: string | null
  tokenRipper?: boolean
}

export type BotUpdateInput = Partial<
  Pick<Bot, 'name' | 'role' | 'avatar' | 'agent' | 'instructions' | 'workspaceId' | 'tokenRipper'>
>

export type BotsChangedPayload = { bots: Bot[] }

function isAvatarPreset(value: unknown): value is BotAvatarPreset {
  return BOT_AVATAR_PRESETS.some((preset) => preset === value)
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.replaceAll('\u0000', '').trim().slice(0, maxLength) : ''
}

export function normalizeBotName(value: unknown): string {
  return cleanText(value, BOT_NAME_MAX_LENGTH)
}

export function normalizeBotRole(value: unknown): string {
  return cleanText(value, BOT_ROLE_MAX_LENGTH)
}

export function normalizeBotInstructions(value: unknown): string {
  return cleanText(value, BOT_INSTRUCTIONS_MAX_LENGTH)
}

export function normalizeBotAvatar(value: unknown): BotAvatarPreset {
  return isAvatarPreset(value) ? value : 'orange'
}

/** Parses one persisted record; returns null for anything that cannot be a Bot. */
export function parseStoredBot(value: unknown): Bot | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const field = (key: string): unknown => Reflect.get(value, key)
  const id = field('id')
  const projectId = field('projectId')
  const workspaceId = field('workspaceId')
  const createdAt = field('createdAt')
  const updatedAt = field('updatedAt')
  const name = normalizeBotName(field('name'))
  if (typeof id !== 'string' || !id || typeof projectId !== 'string' || !projectId || !name) {
    return null
  }
  return {
    id,
    projectId,
    name,
    role: normalizeBotRole(field('role')),
    avatar: normalizeBotAvatar(field('avatar')),
    instructions: normalizeBotInstructions(field('instructions')),
    agent: normalizeBotAgent(field('agent')),
    workspaceId: typeof workspaceId === 'string' && workspaceId ? workspaceId : null,
    tokenRipper: field('tokenRipper') !== false,
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
    updatedAt: typeof updatedAt === 'number' ? updatedAt : 0
  }
}

function bareWorkspaceId(value: string): string {
  return value.replace(/^(worktree|folder):/, '')
}

// Why: the renderer stores sidebar keys (`folder:<id>`) while session records carry bare ids.
export function botOwnsWorkspace(bot: Pick<Bot, 'workspaceId'>, workspaceId: string): boolean {
  return (
    bot.workspaceId !== null && bareWorkspaceId(bot.workspaceId) === bareWorkspaceId(workspaceId)
  )
}

const TOKEN_RIPPER_DIRECTIVE = [
  'Response style: lead with the action or answer; no preamble, filler or closing offers.',
  'Keep reasoning and planning intact; cut only padding. Say plainly when you are unsure.'
].join(' ')

/** Text appended to Claude Code's system prompt for sessions in a bot's workspace. */
export function buildBotSystemPromptAppend(bot: Bot): string {
  const identity = bot.role ? `You are ${bot.name}, acting as ${bot.role}.` : `You are ${bot.name}.`
  return [identity, bot.instructions, bot.tokenRipper ? TOKEN_RIPPER_DIRECTIVE : '']
    .filter(Boolean)
    .join('\n\n')
}
