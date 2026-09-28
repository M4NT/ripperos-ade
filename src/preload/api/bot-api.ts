import type {
  Bot,
  BotCreateInput,
  BotsChangedPayload,
  BotUpdateInput
} from '../../shared/bot-types'

export type BotsApi = {
  list: () => Promise<Bot[]>
  create: (input: BotCreateInput) => Promise<Bot>
  update: (args: { id: string; patch: BotUpdateInput }) => Promise<Bot>
  remove: (args: { id: string }) => Promise<void>
  onChanged: (callback: (payload: BotsChangedPayload) => void) => () => void
}
