import { createContext, useContext } from 'react'

/** `bubbles` is RipperOS's messenger layout; `document` is upstream Orca's prose layout. */
export type NativeChatPresentation = 'bubbles' | 'document'

export const NativeChatPresentationContext = createContext<NativeChatPresentation>('bubbles')

export function useNativeChatPresentation(): NativeChatPresentation {
  return useContext(NativeChatPresentationContext)
}
