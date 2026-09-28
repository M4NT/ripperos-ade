import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'
import type { BotsChangedPayload } from '../../shared/bot-types'

export const botsApi = {
  list: () => ipcRenderer.invoke('bots:list'),
  create: (input) => ipcRenderer.invoke('bots:create', input),
  update: (args) => ipcRenderer.invoke('bots:update', args),
  remove: (args) => ipcRenderer.invoke('bots:remove', args),
  onChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: BotsChangedPayload) =>
      callback(payload)
    ipcRenderer.on('bots:changed', listener)
    return () => ipcRenderer.removeListener('bots:changed', listener)
  }
} satisfies PreloadApi['bots']
