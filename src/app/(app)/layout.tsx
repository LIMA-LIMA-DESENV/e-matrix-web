'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { LanguageSwitcher } from '@/components/language-switcher'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

type NavKey =
  | 'dashboard'
  | 'managementPlan'
  | 'programs'
  | 'documents'
  | 'projects'
  | 'trainings'
  | 'meetings'
  | 'matrix'
  | 'users'
  | 'parameters'

interface NavItem {
  key: NavKey
  href: string
  icon: string
  adminOnly?: boolean
  /** Legacy module not migrated yet: shown, but not navigable. */
  pending?: boolean
}

// Same order as the legacy sidebar; administration items come from the legacy
// header "Administração" menu.
const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'dashboard' },
  {
    key: 'managementPlan',
    href: '/plano-de-gestao',
    icon: 'monitoring',
    pending: true,
  },
  { key: 'programs', href: '/programa', icon: 'diamond', pending: true },
  {
    key: 'documents',
    href: '/documentos',
    icon: 'description',
    pending: true,
  },
  { key: 'projects', href: '/projetos', icon: 'list_alt', pending: true },
  {
    key: 'trainings',
    href: '/treinamentos',
    icon: 'directions_bike',
    pending: true,
  },
  {
    key: 'meetings',
    href: '/reunioes',
    icon: 'calendar_month',
    pending: true,
  },
  { key: 'matrix', href: '/matriz', icon: 'grid_on', pending: true },
]

const adminItems: NavItem[] = [
  {
    key: 'users',
    href: '/usuarios',
    icon: 'manage_accounts',
    adminOnly: true,
  },
  {
    key: 'parameters',
    href: '/parametros',
    icon: 'tune',
    adminOnly: true,
  },
]

const linkClasses = {
  base: 'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium tracking-wide transition-all',
  active:
    'bg-primary-container text-white shadow-lg shadow-primary-container/20',
  idle: 'text-slate-300 hover:bg-white/10 hover:text-white',
  pending: 'cursor-not-allowed text-slate-500',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav')
  const ts = useTranslations('session')
  const tc = useTranslations('common')
  const pathname = usePathname()
  const router = useRouter()
  const {
    user,
    sessionExpiresAt,
    isAuthenticated,
    isAdmin,
    signOut,
    renewSession,
    isRenewingSession,
  } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [remainingSessionMs, setRemainingSessionMs] = useState<number | null>(
    null
  )
  const lastChanceAttemptedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (user?.mustChangePassword && pathname !== '/alterar-senha') {
      router.replace('/alterar-senha')
    }
  }, [isAuthenticated, pathname, router, user?.mustChangePassword])

  useEffect(() => {
    if (!sessionExpiresAt) {
      setRemainingSessionMs(null)
      return
    }

    const updateRemainingTime = () => {
      setRemainingSessionMs(sessionExpiresAt.getTime() - Date.now())
    }

    updateRemainingTime()
    const intervalId = window.setInterval(updateRemainingTime, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [sessionExpiresAt])

  useEffect(() => {
    if (sessionExpiresAt && sessionExpiresAt.getTime() > Date.now()) {
      lastChanceAttemptedRef.current = false
    }
  }, [sessionExpiresAt])

  useEffect(() => {
    if (remainingSessionMs === null || remainingSessionMs > 0) {
      return
    }

    if (lastChanceAttemptedRef.current) {
      return
    }
    lastChanceAttemptedRef.current = true

    renewSession().catch(() => {
      signOut('session-expired')
    })
  }, [remainingSessionMs, renewSession, signOut])

  if (!isAuthenticated) {
    return null
  }

  if (user?.mustChangePassword && pathname !== '/alterar-senha') {
    return null
  }

  const showSessionWarning =
    remainingSessionMs !== null &&
    remainingSessionMs > 0 &&
    remainingSessionMs <= 60_000
  const remainingSessionSeconds = remainingSessionMs
    ? Math.max(0, Math.ceil(remainingSessionMs / 1000))
    : 0

  const visibleAdminItems = adminItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  function getUserInitials() {
    if (!user?.name) return '?'
    return user.name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

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
    <div className="bg-surface font-body text-on-surface">
      {showSessionWarning && (
        <>
          <ModalOverlay />
          <ModalContent className="max-w-md">
            <ModalTitle>{ts('expiringTitle')}</ModalTitle>
            <ModalBody className="space-y-3">
              <p className="text-sm text-on-surface-variant">
                {ts('expiringDescription', {
                  seconds: remainingSessionSeconds,
                })}
              </p>
              <p className="text-sm text-on-surface-variant">
                {ts('expiringHint')}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                color="primary"
                onClick={() => signOut()}
              >
                {ts('signOutNow')}
              </Button>
              <Button
                type="button"
                onClick={() => void renewSession()}
                disabled={isRenewingSession}
              >
                {isRenewingSession ? ts('renewing') : ts('renew')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </>
      )}

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

          <div className="flex items-center gap-3 border-l border-outline-variant/60 pl-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('accountMenu')}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-right transition-colors hover:bg-surface-container-high"
              >
                <p className="hidden text-sm font-semibold text-ematrix-dark sm:block">
                  {user?.name}
                </p>
                <span
                  className="material-symbols-outlined text-base text-on-surface-variant"
                  aria-hidden
                >
                  keyboard_arrow_down
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[200px]">
                <DropdownMenuItem
                  onSelect={() => router.push('/alterar-senha')}
                >
                  <span
                    className="material-symbols-outlined mr-2 text-base"
                    aria-hidden
                  >
                    lock
                  </span>
                  {t('changePassword')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-container bg-primary-container text-sm font-bold text-white">
              {getUserInitials()}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="cursor-pointer rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
              title={t('signOut')}
              aria-label={t('signOut')}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                logout
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-20 lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
