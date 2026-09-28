import { BrowserWindow, ipcMain } from 'electron'
import type {
  Bot,
  BotCreateInput,
  BotsChangedPayload,
  BotUpdateInput
} from '../../shared/bot-types'
import type { BotStore } from '../bots/bot-store'

export const BOTS_CHANGED_CHANNEL = 'bots:changed'

function broadcastBotsChanged(bots: Bot[]): void {
  const payload: BotsChangedPayload = { bots }
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue
    }
    try {
      window.webContents.send(BOTS_CHANGED_CHANNEL, payload)
    } catch {
      // A renderer can disappear between isDestroyed() and send().
    }
  }
}

export function registerBotHandlers(store: BotStore): void {
  store.onChange(broadcastBotsChanged)
  ipcMain.handle('bots:list', (): Bot[] => store.list())
  ipcMain.handle('bots:create', (_event, input: BotCreateInput): Promise<Bot> =>
    store.create(input)
  )
  ipcMain.handle(
    'bots:update',
    (_event, args: { id: string; patch: BotUpdateInput }): Promise<Bot> =>
      store.update(args.id, args.patch)
  )
  ipcMain.handle('bots:remove', (_event, args: { id: string }): Promise<void> =>
    store.remove(args.id)
  )
}
