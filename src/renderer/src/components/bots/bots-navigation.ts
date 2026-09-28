import { useSyncExternalStore } from 'react'

/** What the Bots page should show when it next renders; set from the sidebar. */
export type BotsNavigationRequest =
  | { kind: 'open-group'; groupId: string }
  | { kind: 'new-bot'; projectId: string }
  | { kind: 'new-group'; projectId: string }

let pending: BotsNavigationRequest | null = null
const listeners = new Set<() => void>()

export function requestBotsNavigation(request: BotsNavigationRequest): void {
  pending = request
  for (const listener of listeners) {
    listener()
  }
}

/** Hands the pending request to exactly one reader. */
export function consumeBotsNavigation(): BotsNavigationRequest | null {
  const request = pending
  pending = null
  return request
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePendingBotsNavigation(): BotsNavigationRequest | null {
  const read = (): BotsNavigationRequest | null => pending
  return useSyncExternalStore(subscribe, read, read)
}
