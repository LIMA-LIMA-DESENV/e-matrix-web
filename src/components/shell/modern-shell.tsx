'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { LanguageSwitcher } from '@/components/language-switcher'
import { LayoutSwitcher } from '@/components/layout-switcher'
import { AccountMenu } from '@/components/shell/account-menu'
import { adminItems, type NavItem } from '@/components/shell/nav-items'
import { useVisibleNavItems } from '@/components/shell/use-nav-items'
import { useAuth } from '@/contexts/AuthContext'

const linkClasses = {
  base: 'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium tracking-wide transition-all',
  active:
    'bg-primary-container text-white shadow-lg shadow-primary-container/20',
  idle: 'text-slate-300 hover:bg-white/10 hover:text-white',
  pending: 'cursor-not-allowed text-slate-500',
}

/** Classes of the `ShellContent` that goes with the modern shell. */
export const modernContentClassNames = {
  main: 'min-h-screen pt-20 lg:ml-64',
  inner: 'mx-auto max-w-7xl px-4 pb-12 lg:px-8',
}

/**
 * Modern shell: dark sidebar (a drawer below `lg`) and translucent header. It
 * draws only the frame; the page goes in the sibling `ShellContent`.
 */
export function ModernShell() {
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const navItems = useVisibleNavItems()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const visibleAdminItems = adminItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  function renderNavItem(item: NavItem) {
    const label = t(item.key)
    const icon = (filled: boolean) => (
      <span
        className="material-symbols-outlined"
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden
      >
        {item.icon}
      </span>
    )

    if (item.pending) {
      return (
        <span
          key={item.key}
          aria-disabled="true"
          title={t('comingSoon')}
          className={`${linkClasses.base} ${linkClasses.pending}`}
        >
          {icon(false)}
          <span className="flex-1">{label}</span>
          <span
            role="img"
            className="material-symbols-outlined text-base text-slate-500"
            aria-label={t('comingSoon')}
          >
            schedule
          </span>
        </span>
      )
    }

    const isActive = pathname.startsWith(item.href)

    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`${linkClasses.base} ${isActive ? linkClasses.active : linkClasses.idle}`}
      >
        {icon(isActive)}
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label={t('closeMenu')}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col gap-2 overflow-y-auto bg-ematrix-dark p-4 shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-3 px-2 py-6"
        >
          <Image
            src="/logo.png"
            alt={tc('logoAlt')}
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <span className="font-headline text-xl leading-none font-bold tracking-[0.2em] text-white">
            E-MATRIX
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(renderNavItem)}

          {visibleAdminItems.length > 0 && (
            <>
              <p className="mt-6 mb-1 px-4 text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                {t('administration')}
              </p>
              {visibleAdminItems.map(renderNavItem)}
            </>
          )}
        </nav>
      </aside>

      <header className="fixed top-0 right-0 left-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/40 bg-white/80 px-4 backdrop-blur-md lg:left-64 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label={t('openMenu')}
            className="cursor-pointer rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high lg:hidden"
          >
            <span className="material-symbols-outlined" aria-hidden>
              menu
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="text-on-surface-variant" />
          <LayoutSwitcher className="text-on-surface-variant" />

          <AccountMenu
            className="flex items-center gap-3 border-l border-outline-variant/60 pl-4"
            classNames={{
              trigger:
                'flex items-center gap-1 rounded-lg px-2 py-1 text-right transition-colors hover:bg-surface-container-high',
              name: 'hidden text-sm font-semibold text-ematrix-dark sm:block',
              chevron:
                'material-symbols-outlined text-base text-on-surface-variant',
              initials:
                'flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-container bg-primary-container text-sm font-bold text-white',
              signOut:
                'cursor-pointer rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error',
            }}
          />
        </div>
      </header>
    </>
  )
}
