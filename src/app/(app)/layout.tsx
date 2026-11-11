'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import {
  ClassicFooter,
  ClassicShell,
  classicContentClassNames,
} from '@/components/shell/classic-shell'
import {
  ModernShell,
  modernContentClassNames,
} from '@/components/shell/modern-shell'
import { ShellContent } from '@/components/shell/shell-content'
import { TourProvider, useTour } from '@/components/tour/tour-context'
import { TourOverlay } from '@/components/tour/tour-overlay'
import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useLayoutPreference } from '@/contexts/LayoutPreferenceContext'

/**
 * The shell and the page, inside the `TourProvider`. The classic sidebar is
 * collapsed on the screen only with the preference collapsed and the tour
 * inactive: the tour shows it expanded and never touches the preference nor
 * its cookie.
 */
function Shell({
  isClassic,
  children,
}: {
  isClassic: boolean
  children: React.ReactNode
}) {
  const { isSidebarCollapsed: prefersSidebarCollapsed } = useLayoutPreference()
  const { step } = useTour()
  const isSidebarCollapsed = prefersSidebarCollapsed && step === null

  return (
    <>
      {/* The shell is a sibling of the content, so swapping it keeps the page
          mounted (NFR-002): only the classes and the footer change. */}
      {isClassic ? (
        <ClassicShell isSidebarCollapsed={isSidebarCollapsed} />
      ) : (
        <ModernShell />
      )}
      <ShellContent
        key="content"
        classNames={
          isClassic
            ? classicContentClassNames(isSidebarCollapsed)
            : modernContentClassNames
        }
        footer={isClassic ? <ClassicFooter /> : null}
      >
        {children}
      </ShellContent>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const ts = useTranslations('session')
  const pathname = usePathname()
  const router = useRouter()
  const {
    user,
    sessionExpiresAt,
    isAuthenticated,
    signOut,
    renewSession,
    isRenewingSession,
  } = useAuth()
  const { layout } = useLayoutPreference()
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
  const isClassic = layout === 'classic'
  const remainingSessionSeconds = remainingSessionMs
    ? Math.max(0, Math.ceil(remainingSessionMs / 1000))
    : 0

  return (
    <TourProvider>
      {/* The classic shell draws its background image behind this wrapper. */}
      <div
        className={
          isClassic
            ? 'font-body text-on-surface'
            : 'bg-surface font-body text-on-surface'
        }
      >
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

        <Shell isClassic={isClassic}>{children}</Shell>
      </div>
      {/* The session warning takes the place of the tour (FR-024). */}
      <TourOverlay isClassic={isClassic} isSuspended={showSessionWarning} />
    </TourProvider>
  )
}
