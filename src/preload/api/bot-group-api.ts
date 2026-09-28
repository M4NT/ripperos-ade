import type {
  BotGroup,
  BotGroupActivityPayload,
  BotGroupCreateInput,
  BotGroupMessage,
  BotGroupMessagesChangedPayload,
  BotGroupsChangedPayload,
  BotGroupUpdateInput
} from '../../shared/bot-group-types'

export type BotGroupsApi = {
  list: () => Promise<BotGroup[]>
  create: (input: BotGroupCreateInput) => Promise<BotGroup>
  update: (args: { id: string; patch: BotGroupUpdateInput }) => Promise<BotGroup>
  remove: (args: { id: string }) => Promise<void>
  messages: (args: { groupId: string }) => Promise<BotGroupMessage[]>
  send: (args: { groupId: string; text: string }) => Promise<void>
  onChanged: (callback: (payload: BotGroupsChangedPayload) => void) => () => void
  onMessages: (callback: (payload: BotGroupMessagesChangedPayload) => void) => () => void
  onActivity: (callback: (payload: BotGroupActivityPayload) => void) => () => void
}
