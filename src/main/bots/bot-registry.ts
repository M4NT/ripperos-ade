import { buildBotSystemPromptAppend } from '../../shared/bot-types'
import { BotGroupEngine } from './bot-group-engine'
import { runClaudeGroupTurn } from './bot-group-claude-runner'
import { BotGroupStore } from './bot-group-store'
import { BotStore } from './bot-store'

let botStore: BotStore | null = null
let groups: { store: BotGroupStore; engine: BotGroupEngine } | null = null

/** Called once from startup, after the userData path is captured. */
export function initBotStore(): BotStore {
  botStore ??= new BotStore()
  return botStore
}

export function initBotGroups(onActivity: (groupId: string, thinkingBotIds: string[]) => void): {
  store: BotGroupStore
  engine: BotGroupEngine
} {
  const bots = initBotStore()
  if (!groups) {
    const store = new BotGroupStore()
    groups = {
      store,
      engine: new BotGroupEngine(store, () => bots.list(), runClaudeGroupTurn, onActivity)
    }
  }
  return groups
}

// Why null before init: tests and headless paths construct Claude adapters without bots.
export function resolveBotSystemPromptAppend(workspaceId: string): string | null {
  const bot = botStore?.findByWorkspace(workspaceId)
  return bot ? buildBotSystemPromptAppend(bot) : null
}
