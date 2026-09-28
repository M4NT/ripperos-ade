import { BrowserWindow, ipcMain } from 'electron'
import type {
  BotGroup,
  BotGroupActivityPayload,
  BotGroupCreateInput,
  BotGroupMessage,
  BotGroupMessagesChangedPayload,
  BotGroupsChangedPayload,
  BotGroupUpdateInput
} from '../../shared/bot-group-types'
import type { BotGroupEngine } from '../bots/bot-group-engine'
import type { BotGroupStore } from '../bots/bot-group-store'

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue
    }
    try {
      window.webContents.send(channel, payload)
    } catch {
      // A renderer can disappear between isDestroyed() and send().
    }
  }
}

export function broadcastBotGroupActivity(groupId: string, thinkingBotIds: string[]): void {
  const payload: BotGroupActivityPayload = { groupId, thinkingBotIds }
  broadcast('botGroups:activity', payload)
}

export function registerBotGroupHandlers(store: BotGroupStore, engine: BotGroupEngine): void {
  store.onGroupsChange((groups) => {
    const payload: BotGroupsChangedPayload = { groups }
    broadcast('botGroups:changed', payload)
  })
  store.onMessagesChange((groupId, messages) => {
    const payload: BotGroupMessagesChangedPayload = { groupId, messages }
    broadcast('botGroups:messages', payload)
  })
  ipcMain.handle('botGroups:list', (): BotGroup[] => store.listGroups())
  ipcMain.handle('botGroups:create', (_event, input: BotGroupCreateInput) =>
    store.createGroup(input)
  )
  ipcMain.handle('botGroups:update', (_event, args: { id: string; patch: BotGroupUpdateInput }) =>
    store.updateGroup(args.id, args.patch)
  )
  ipcMain.handle('botGroups:remove', (_event, args: { id: string }) => store.removeGroup(args.id))
  ipcMain.handle('botGroups:messages', (_event, args: { groupId: string }): BotGroupMessage[] =>
    store.listMessages(args.groupId)
  )
  ipcMain.handle('botGroups:send', (_event, args: { groupId: string; text: string }): void => {
    // Why not awaited: replies and handoffs can take minutes; they stream back as broadcasts.
    void engine.sendUserMessage(args.groupId, args.text).catch((error: unknown) => {
      console.error('[bot-groups] send failed', error)
    })
  })
}
