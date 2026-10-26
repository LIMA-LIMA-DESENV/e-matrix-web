'use client'

import { useTranslations } from 'next-intl'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useLayoutPreference } from '@/contexts/LayoutPreferenceContext'
import { layouts } from '@/lib/layout-preference'
import { cn } from '@/lib/utils'

interface LayoutSwitcherProps {
  className?: string
}

/**
 * Switches between the modern and the classic layout in place: unlike the
 * language, no refresh, so the open screen keeps its state.
 */
export function LayoutSwitcher({ className }: LayoutSwitcherProps) {
  const t = useTranslations('layout')
  const { layout, setLayout } = useLayoutPreference()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('label')}
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-surface-container-high',
          className
        )}
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          palette
        </span>
        <span className="hidden sm:inline">{t(layout)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px]">
        {layouts.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => setLayout(option)}
            className={option === layout ? 'font-bold text-primary' : ''}
          >
            {t(option)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
