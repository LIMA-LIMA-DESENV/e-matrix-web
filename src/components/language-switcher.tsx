'use client'

import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import {
  LOCALE_COOKIE,
  type Locale,
  localeLabels,
  locales,
} from '@/i18n/config'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
}

/**
 * Stores the chosen language in the cookie read by `i18n/request.ts` and
 * re-renders the current page in it.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeLocale(next: Locale) {
    Cookies.set(LOCALE_COOKIE, next, { expires: 365, sameSite: 'lax' })
    startTransition(() => router.refresh())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('label')}
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-surface-container-high',
          isPending && 'opacity-60',
          className
        )}
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          translate
        </span>
        <span className="hidden sm:inline">{localeLabels[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px]">
        {locales.map((option) => (
          <DropdownMenuItem
            key={option}
            lang={option}
            onSelect={() => changeLocale(option)}
            className={option === locale ? 'font-bold text-primary' : ''}
          >
            {localeLabels[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
