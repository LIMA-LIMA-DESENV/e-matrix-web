'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { AuthProvider } from '@/contexts/AuthContext'
import { LayoutPreferenceProvider } from '@/contexts/LayoutPreferenceContext'
import type { Layout } from '@/lib/layout-preference'
import { makeQueryClient } from '@/lib/query-client'

interface ProvidersProps {
  initialLayout: Layout
  initialSidebarCollapsed: boolean
  children: React.ReactNode
}

export function Providers({
  initialLayout,
  initialSidebarCollapsed,
  children,
}: ProvidersProps) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <LayoutPreferenceProvider
        initialLayout={initialLayout}
        initialSidebarCollapsed={initialSidebarCollapsed}
      >
        <AuthProvider>{children}</AuthProvider>
      </LayoutPreferenceProvider>
    </QueryClientProvider>
  )
}
