import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

export const botGroupsApi = {
  list: () => ipcRenderer.invoke('botGroups:list'),
  create: (input) => ipcRenderer.invoke('botGroups:create', input),
  update: (args) => ipcRenderer.invoke('botGroups:update', args),
  remove: (args) => ipcRenderer.invoke('botGroups:remove', args),
  messages: (args) => ipcRenderer.invoke('botGroups:messages', args),
  send: (args) => ipcRenderer.invoke('botGroups:send', args),
  onChanged: (callback) => subscribe('botGroups:changed', callback),
  onMessages: (callback) => subscribe('botGroups:messages', callback),
  onActivity: (callback) => subscribe('botGroups:activity', callback)
} satisfies PreloadApi['botGroups']
