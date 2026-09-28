import { useEffect, useState, useSyncExternalStore } from 'react'
import type { BotGroup, BotGroupMessage } from '../../../../shared/bot-group-types'
import type { BotGroupsApi } from '../../../../preload/api/bot-group-api'

function groupsApi(): BotGroupsApi | undefined {
  // Why optional: the web client's preload has no bot bridges yet.
  return window.api?.botGroups
}

let snapshot: BotGroup[] | null = null
let started = false
const listeners = new Set<() => void>()

function publish(next: BotGroup[]): void {
  snapshot = next
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!started) {
    started = true
    const api = groupsApi()
    if (api) {
      api.onChanged((payload) => publish(payload.groups))
      void api.list().then(publish, (error: unknown) => {
        console.error('[bot-groups] list failed', error)
        publish([])
      })
    } else {
      publish([])
    }
  }
  return () => listeners.delete(listener)
}

/** Live list of groups; `null` until the first load settles. */
export function useBotGroups(): BotGroup[] | null {
  const read = (): BotGroup[] | null => snapshot
  return useSyncExternalStore(subscribe, read, read)
}

/** Live transcript of one group. */
export function useBotGroupMessages(groupId: string): BotGroupMessage[] | null {
  const [messages, setMessages] = useState<BotGroupMessage[] | null>(null)
  useEffect(() => {
    const api = groupsApi()
    if (!api) {
      setMessages([])
      return
    }
    let cancelled = false
    const unsubscribe = api.onMessages((payload) => {
      if (!cancelled && payload.groupId === groupId) {
        setMessages(payload.messages)
      }
    })
    void api.messages({ groupId }).then(
      (list) => {
        if (!cancelled) {
          setMessages(list)
        }
      },
      () => {
        if (!cancelled) {
          setMessages([])
        }
      }
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [groupId])
  return messages
}

/** Bots of a group currently composing a reply. */
export function useBotGroupThinking(groupId: string): string[] {
  const [thinking, setThinking] = useState<string[]>([])
  useEffect(() => {
    const api = groupsApi()
    if (!api) {
      return
    }
    return api.onActivity((payload) => {
      if (payload.groupId === groupId) {
        setThinking(payload.thinkingBotIds)
      }
    })
  }, [groupId])
  return thinking
}
