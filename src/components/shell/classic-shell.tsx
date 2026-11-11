'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { LanguageSwitcher } from '@/components/language-switcher'
import { LayoutSwitcher } from '@/components/layout-switcher'
import { AccountMenu } from '@/components/shell/account-menu'
import { adminItems, type NavItem } from '@/components/shell/nav-items'
import { useVisibleNavItems } from '@/components/shell/use-nav-items'
import { HelpButton } from '@/components/tour/help-button'
import { useTour } from '@/components/tour/tour-context'
import { useIsWideScreen } from '@/components/tour/wide-screen'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useLayoutPreference } from '@/contexts/LayoutPreferenceContext'
import { cn } from '@/lib/utils'

/*
 * Legacy header (`_header.sass`): vertical gradient of the primary color with
 * light text. The legacy #00a79f → #008e87 with #eee gives 2.6:1, so both
 * stops are darker shades of the same color: #eee reaches 4.9:1 on #00736d
 * and 6.6:1 on #005e59 (NFR-005). Change only these values to retune it.
 */
const headerClasses =
  'bg-linear-to-b from-[#00736d] to-[#005e59] text-[#eeeeee]'

/** Header controls: light text, translucent hover and a white focus ring. */
const headerControl =
  'rounded hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

const sidebarItem = {
  base: 'flex items-center gap-3 border-r-2 px-5 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
  active: 'border-primary font-medium text-primary',
  idle: 'border-transparent text-on-surface-variant hover:bg-surface-container-high',
  pending: 'cursor-not-allowed border-transparent text-outline',
}

/**
 * Classes of the `ShellContent` that goes with the classic shell. The sidebar
 * width also goes to `--shell-sidebar-width`, which the fixed form footers of
 * the pages read (16rem, the modern sidebar, when it is unset). Below such a
 * fixed footer (`fixed bottom-0`), the extra bottom padding keeps the legacy
 * copyright clear of it.
 */
export function classicContentClassNames(isSidebarCollapsed: boolean) {
  return {
    main: cn(
      'flex min-h-screen flex-col px-4 pt-20 pb-4 transition-[margin] duration-200 motion-reduce:transition-none has-[.fixed.bottom-0]:pb-44 sm:has-[.fixed.bottom-0]:pb-32',
      isSidebarCollapsed
        ? 'lg:ml-[60px] [--shell-sidebar-width:60px]'
        : 'lg:ml-[265px] [--shell-sidebar-width:265px]'
    ),
    // The legacy white panel the content sits on.
    inner: 'rounded bg-surface-container-lowest p-4 shadow-sm lg:p-6',
  }
}

/** Legacy footer (`footer.html.twig`), below the content panel. */
export function ClassicFooter() {
  const tc = useTranslations('common')

  // The light legacy text sits on a translucent dark band, so it keeps 4.5:1
  // over any part of the background image (NFR-005).
  return (
    <footer className="mt-auto pt-4 text-center text-xs">
      <p className="inline-block rounded bg-black/60 px-3 py-1 text-[#eeeeee] [text-shadow:1px_1px_5px_black]">
        {tc('classicCopyright')}
        <br />
        {tc('allRightsReserved')}
      </p>
    </footer>
  )
}

interface ClassicShellProps {
  /**
   * The collapsed state on the screen, which `(app)/layout.tsx` also gives to
   * `classicContentClassNames`: the stored preference, except during the
   * guided tour, which shows the sidebar expanded.
   */
  isSidebarCollapsed: boolean
}

/**
 * Classic shell: the legacy gradient header (with the Administração menu),
 * the white sidebar that collapses to icons on wide screens (a drawer below
 * `lg`) and the background image. It draws only the frame; the page goes in
 * the sibling `ShellContent`.
 */
export function ClassicShell({ isSidebarCollapsed }: ClassicShellProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const navItems = useVisibleNavItems()
  const { setSidebarCollapsed } = useLayoutPreference()
  const { step } = useTour()
  const isWideScreen = useIsWideScreen()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

  // The Parâmetros step of the guided tour holds the Administração menu
  // open, to point at its item. Only on a wide screen: below it the step is
  // a centered card and the menu stays closed.
  const isTourOnParameters = step?.key === 'parameters' && isWideScreen

  // The menu leaves the step closed, even if it was open before the tour.
  if (isTourOnParameters && isAdminMenuOpen) {
    setIsAdminMenuOpen(false)
  }

  const visibleAdminItems = adminItems.filter(
    (item) => !item.adminOnly || isAdmin
  )
  // The collapsed state is for wide screens only; the drawer is always full.
  const collapsedOnly = (classes: string) => (isSidebarCollapsed ? classes : '')

  function renderNavItem(item: NavItem) {
    const label = t(item.key)
    const icon = (
      <span className="material-symbols-outlined" aria-hidden>
        {item.icon}
      </span>
    )
    // Collapsed, the caption stays for screen readers only.
    const caption = (
      <span className={cn('flex-1 truncate', collapsedOnly('lg:sr-only'))}>
        {label}
      </span>
    )

    if (item.pending) {
      return (
        <span
          key={item.key}
          data-tour-target={`nav:${item.key}`}
          aria-disabled="true"
          title={isSidebarCollapsed ? label : t('comingSoon')}
          className={cn(
            sidebarItem.base,
            sidebarItem.pending,
            collapsedOnly('lg:justify-center lg:px-0')
          )}
        >
          {icon}
          {caption}
          <span
            role="img"
            className={cn(
              'material-symbols-outlined text-base',
              collapsedOnly('lg:hidden')
            )}
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
        data-tour-target={`nav:${item.key}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-label={isSidebarCollapsed ? label : undefined}
        title={isSidebarCollapsed ? label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          sidebarItem.base,
          isActive ? sidebarItem.active : sidebarItem.idle,
          collapsedOnly('lg:justify-center lg:px-0')
        )}
      >
        {icon}
        {caption}
      </Link>
    )
  }

  const toggleLabel = isSidebarCollapsed ? t('expandMenu') : t('collapseMenu')

  return (
    <>
      <div
        className="classic-background fixed inset-0 -z-10"
        aria-hidden="true"
      />

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label={t('closeMenu')}
        />
      )}

      <aside
        data-tour-target="sidebar"
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-[265px] overflow-x-hidden overflow-y-auto bg-white shadow-sm transition-[width,translate] duration-200 motion-reduce:transition-none lg:top-16 lg:z-30 lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          collapsedOnly('lg:w-[60px]')
        )}
      >
        <nav className="flex flex-col py-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={toggleLabel}
            aria-expanded={!isSidebarCollapsed}
            title={toggleLabel}
            className={cn(
              sidebarItem.base,
              sidebarItem.idle,
              'hidden w-full cursor-pointer lg:flex',
              collapsedOnly('lg:justify-center lg:px-0')
            )}
          >
            <span className={cn('flex-1 text-left', collapsedOnly('hidden'))}>
              {t('menu')}
            </span>
            <span className="material-symbols-outlined" aria-hidden>
              {isSidebarCollapsed ? 'open_in_full' : 'close_fullscreen'}
            </span>
          </button>

          {navItems.map(renderNavItem)}
        </nav>
      </aside>

      <header
        className={cn(
          'fixed top-0 right-0 left-0 z-40 flex h-16 items-center justify-between gap-2 pr-2 shadow-md sm:pr-4',
          headerClasses
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: decorative legacy art, rendered only in the classic layout so the modern one never downloads it */}
        <img
          src="/classic/header.png"
          alt=""
          width={156}
          height={57}
          className="pointer-events-none absolute top-0 left-0"
        />
        <Link
          href="/dashboard"
          className={cn('relative ml-12 px-1 sm:ml-[72px]', headerControl)}
        >
          <span className="sr-only font-(family-name:--font-brand) text-[32px] leading-none sm:not-sr-only">
            E-MATRIX
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Below `sm` the controls get tighter, so the header still fits
              a 375px screen with the Ajuda button. */}
          <HelpButton
            className={cn('p-1 text-[#eeeeee] sm:p-2', headerControl)}
          />
          <LanguageSwitcher
            className={cn('px-1 text-[#eeeeee] sm:px-2', headerControl)}
          />
          <LayoutSwitcher
            className={cn('px-1 text-[#eeeeee] sm:px-2', headerControl)}
          />

          {visibleAdminItems.length > 0 && (
            <DropdownMenu
              open={isTourOnParameters || isAdminMenuOpen}
              onOpenChange={(open) => {
                // The buttons of the tour's card are outside the menu, so
                // every click on them asks it to close.
                if (!isTourOnParameters) setIsAdminMenuOpen(open)
              }}
            >
              <DropdownMenuTrigger
                aria-label={t('administration')}
                className={cn('flex items-center p-1 sm:p-2', headerControl)}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  settings
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[200px]">
                {visibleAdminItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    data-tour-target={`nav:${item.key}`}
                    onSelect={() => router.push(item.href)}
                  >
                    <span
                      className="material-symbols-outlined mr-2 text-base"
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                    {t(item.key)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <AccountMenu
            className="flex items-center gap-1 sm:gap-2"
            classNames={{
              trigger: cn(
                'flex items-center gap-1 px-1 py-1 text-right sm:px-2',
                headerControl
              ),
              name: 'hidden text-sm sm:block',
              chevron: 'material-symbols-outlined text-base',
              initials:
                'flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/60 bg-primary text-sm font-bold text-white',
              signOut: cn('cursor-pointer p-1 sm:p-2', headerControl),
            }}
          />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label={t('openMenu')}
            className={cn('cursor-pointer p-1 sm:p-2 lg:hidden', headerControl)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              menu
            </span>
          </button>
        </div>
      </header>
    </>
  )
}
