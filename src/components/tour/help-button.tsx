'use client'

import { useTranslations } from 'next-intl'

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

import { useTour } from './tour-context'

interface HelpButtonProps {
  className?: string
}

/**
 * The Ajuda button of both headers: the only way to start the guided tour.
 * Hidden while the password must be changed, when every route of the tour
 * would be sent back to that screen.
 */
export function HelpButton({ className }: HelpButtonProps) {
  const t = useTranslations('tour')
  const { user } = useAuth()
  const { start, helpButtonRef } = useTour()

  if (user?.mustChangePassword) {
    return null
  }

  return (
    <button
      ref={helpButtonRef}
      type="button"
      onClick={start}
      aria-label={t('help')}
      title={t('help')}
      className={cn(
        'flex cursor-pointer items-center rounded-lg p-2 transition-colors hover:bg-surface-container-high motion-reduce:transition-none',
        className
      )}
    >
      <span className="material-symbols-outlined" aria-hidden>
        help
      </span>
    </button>
  )
}
