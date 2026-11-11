'use client'

import { useSyncExternalStore } from 'react'

/** From `lg` on the sidebar is fixed on the screen; below it, a drawer. */
export const WIDE_SCREEN_QUERY = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const wideScreen = window.matchMedia(WIDE_SCREEN_QUERY)

  wideScreen.addEventListener('change', onChange)

  return () => {
    wideScreen.removeEventListener('change', onChange)
  }
}

/**
 * Whether the tour highlights its targets: the screen is wide enough for the
 * fixed sidebar. Below it every step is a centered card.
 */
export function useIsWideScreen() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_SCREEN_QUERY).matches,
    () => false
  )
}
