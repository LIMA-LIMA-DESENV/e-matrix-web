'use client'

import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { type AuthenticatedUser, UserRole } from '@/http/api'
import { refreshWithLock } from '@/http/fetch-client'
import {
  COOKIE_REFRESH_TOKEN,
  clearStoredSession,
  persistStoredSession,
  readStoredSessionExpiry,
  readStoredUser,
  SESSION_EXPIRY_CHANGED_EVENT,
  type SessionExpiryChangedDetail,
  STORAGE_SESSION_EXPIRES_AT,
  STORAGE_USER,
  type StoredSession,
} from '@/lib/auth-storage'
import { isJwtExpired } from '@/lib/jwt'

interface AuthContextData {
  user: AuthenticatedUser | null
  sessionExpiresAt: Date | null
  isAuthenticated: boolean
  /** admin: users and parameters. */
  isAdmin: boolean
  /** admin or user: may create and edit records (viewers only read). */
  canEdit: boolean
  signIn: (session: StoredSession) => void
  updateUser: (user: AuthenticatedUser) => void
  signOut: (reason?: 'session-expired' | 'password-changed') => void
  renewSession: () => Promise<void>
  isRenewingSession: boolean
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [isRenewingSession, setIsRenewingSession] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const clearSessionState = useCallback(() => {
    clearStoredSession()
    setUser(null)
    setSessionExpiresAt(null)
  }, [])

  const loadStoredSession = useCallback(() => {
    const refreshToken = Cookies.get(COOKIE_REFRESH_TOKEN)
    const storedUser = readStoredUser()
    const storedSessionExpiry = readStoredSessionExpiry()

    if (
      !refreshToken ||
      isJwtExpired(refreshToken) ||
      !storedUser ||
      !storedSessionExpiry ||
      storedSessionExpiry.getTime() <= Date.now()
    ) {
      clearSessionState()
      return
    }

    setUser(storedUser)
    setSessionExpiresAt(storedSessionExpiry)
  }, [clearSessionState])

  useEffect(() => {
    loadStoredSession()
    setLoaded(true)
  }, [loadStoredSession])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== STORAGE_USER &&
        event.key !== STORAGE_SESSION_EXPIRES_AT
      ) {
        return
      }

      loadStoredSession()
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [loadStoredSession, loaded])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const handleSessionExpiryChanged = (
      event: CustomEvent<SessionExpiryChangedDetail>
    ) => {
      const parsedDate = new Date(event.detail.sessionExpiresAt)

      if (Number.isNaN(parsedDate.getTime())) {
        return
      }

      setSessionExpiresAt(parsedDate)
    }

    window.addEventListener(
      SESSION_EXPIRY_CHANGED_EVENT,
      handleSessionExpiryChanged as EventListener
    )

    return () => {
      window.removeEventListener(
        SESSION_EXPIRY_CHANGED_EVENT,
        handleSessionExpiryChanged as EventListener
      )
    }
  }, [loaded])

  function signIn(session: StoredSession) {
    persistStoredSession(session)
    setUser(session.user ?? null)
    setSessionExpiresAt(readStoredSessionExpiry())
  }

  function updateUser(nextUser: AuthenticatedUser) {
    persistStoredSession({ user: nextUser })
    setUser(nextUser)
  }

  async function renewSession() {
    setIsRenewingSession(true)

    try {
      const refreshedSession = await refreshWithLock()
      if (refreshedSession.session_expires_at) {
        setSessionExpiresAt(new Date(refreshedSession.session_expires_at))
      } else {
        setSessionExpiresAt(readStoredSessionExpiry())
      }
    } finally {
      setIsRenewingSession(false)
    }
  }

  function signOut(reason?: 'session-expired' | 'password-changed') {
    clearSessionState()
    router.push(
      reason === 'session-expired'
        ? '/login?reason=session-expired'
        : reason === 'password-changed'
          ? '/login?reason=password-changed'
          : '/login'
    )
  }

  const refreshToken = Cookies.get(COOKIE_REFRESH_TOKEN)
  const isAuthenticated =
    !!user &&
    !!refreshToken &&
    !isJwtExpired(refreshToken) &&
    !!sessionExpiresAt &&
    sessionExpiresAt.getTime() > Date.now()
  const isAdmin = user?.role === UserRole.admin
  const canEdit = isAdmin || user?.role === UserRole.user

  if (!loaded) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionExpiresAt,
        isAuthenticated,
        isAdmin,
        canEdit,
        signIn,
        updateUser,
        signOut,
        renewSession,
        isRenewingSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context || Object.keys(context).length === 0) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
