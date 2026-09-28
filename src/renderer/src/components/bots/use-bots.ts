import { useEffect, useState } from 'react'
import type { Bot } from '../../../../shared/bot-types'
import type { BotsApi } from '../../../../preload/api/bot-api'

/** Live list of bots; `null` until the first load settles. */
export function useBots(): Bot[] | null {
  const [bots, setBots] = useState<Bot[] | null>(null)
  useEffect(() => {
    // Why: the web client's preload has no bots bridge yet; an empty list beats a crashed page.
    const api: BotsApi | undefined = window.api.bots
    if (!api) {
      setBots([])
      return
    }
    let cancelled = false
    const unsubscribe = api.onChanged((payload) => {
      if (!cancelled) {
        setBots(payload.bots)
      }
    })
    void api.list().then(
      (list) => {
        if (!cancelled) {
          setBots(list)
        }
      },
      (error: unknown) => {
        console.error('[bots] list failed', error)
        if (!cancelled) {
          setBots([])
        }
      }
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  return bots
}
