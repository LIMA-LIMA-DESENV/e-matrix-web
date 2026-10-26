'use client'

import { createContext, useCallback, useContext, useState } from 'react'

import {
  type Layout,
  storeLayout,
  storeSidebarCollapsed,
} from '@/lib/layout-preference'

interface LayoutPreferenceContextData {
  layout: Layout
  /** Switches the layout in place, without a refresh or a navigation. */
  setLayout: (next: Layout) => void
  /** Collapsed state of the classic sidebar on wide screens. */
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (next: boolean) => void
}

const LayoutPreferenceContext =
  createContext<LayoutPreferenceContextData | null>(null)

interface LayoutPreferenceProviderProps {
  /** Values the root layout read from the cookies, so hydration matches. */
  initialLayout: Layout
  initialSidebarCollapsed: boolean
  children: React.ReactNode
}

export function LayoutPreferenceProvider({
  initialLayout,
  initialSidebarCollapsed,
  children,
}: LayoutPreferenceProviderProps) {
  const [layout, setLayoutState] = useState(initialLayout)
  const [isSidebarCollapsed, setSidebarCollapsedState] = useState(
    initialSidebarCollapsed
  )

  const setLayout = useCallback((next: Layout) => {
    storeLayout(next)
    setLayoutState(next)
  }, [])

  const setSidebarCollapsed = useCallback((next: boolean) => {
    storeSidebarCollapsed(next)
    setSidebarCollapsedState(next)
  }, [])

  return (
    <LayoutPreferenceContext.Provider
      value={{ layout, setLayout, isSidebarCollapsed, setSidebarCollapsed }}
    >
      {children}
    </LayoutPreferenceContext.Provider>
  )
}

export function useLayoutPreference() {
  const context = useContext(LayoutPreferenceContext)

  if (!context) {
    throw new Error(
      'useLayoutPreference must be used within a LayoutPreferenceProvider'
    )
  }

  return context
}
