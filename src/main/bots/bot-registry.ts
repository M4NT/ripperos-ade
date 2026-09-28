import { buildBotSystemPromptAppend } from '../../shared/bot-types'
import { BotStore } from './bot-store'

let botStore: BotStore | null = null

/** Called once from startup, after the userData path is captured. */
export function initBotStore(): BotStore {
  botStore ??= new BotStore()
  return botStore
}

// Why null before init: tests and headless paths construct Claude adapters without bots.
export function resolveBotSystemPromptAppend(workspaceId: string): string | null {
  const bot = botStore?.findByWorkspace(workspaceId)
  return bot ? buildBotSystemPromptAppend(bot) : null
}
