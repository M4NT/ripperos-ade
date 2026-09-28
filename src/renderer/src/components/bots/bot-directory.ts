import { useSyncExternalStore } from 'react'
import type { Bot } from '../../../../shared/bot-types'
import type { BotsApi } from '../../../../preload/api/bot-api'

// One app-wide subscription: the sidebar renders a bot per card, so per-component listeners would multiply.
let snapshot: Bot[] | null = null
let started = false
const listeners = new Set<() => void>()

function publish(next: Bot[]): void {
  snapshot = next
  for (const listener of listeners) {
    listener()
  }
}

function start(): void {
  if (started) {
    return
  }
  started = true
  // Why: the web client's preload has no bots bridge yet; an empty list beats a crashed page.
  const api: BotsApi | undefined = window.api?.bots
  if (!api) {
    publish([])
    return
  }
  api.onChanged((payload) => publish(payload.bots))
  void api.list().then(publish, (error: unknown) => {
    console.error('[bots] list failed', error)
    publish([])
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  start()
  return () => listeners.delete(listener)
}

/** Live list of bots; `null` until the first load settles. */
export function useBots(): Bot[] | null {
  const read = (): Bot[] | null => snapshot
  return useSyncExternalStore(subscribe, read, read)
}
