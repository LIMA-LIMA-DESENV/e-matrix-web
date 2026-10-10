'use client'

import Cookies from 'js-cookie'

import type { AuthenticatedUser } from '@/http/api'
import { getJwtExpiryDate } from '@/lib/jwt'

export const COOKIE_TOKEN = 'ematrix_token'
export const COOKIE_REFRESH_TOKEN = 'ematrix_refresh_token'
export const STORAGE_USER = 'ematrix_user'
export const STORAGE_SESSION_EXPIRES_AT = 'ematrix_session_expires_at'
export const SESSION_EXPIRY_CHANGED_EVENT = 'ematrix:session-expiry-changed'

export interface SessionExpiryChangedDetail {
  sessionExpiresAt: string
}

export interface StoredSession {
  user?: AuthenticatedUser
  token?: string
  refresh_token?: string
  session_expires_at?: string
}

function setCookieIfPresent(name: string, token?: string) {
  if (!token) {
    return
  }

  const expiry = getJwtExpiryDate(token)

  if (expiry) {
    Cookies.set(name, token, { expires: expiry })
    return
  }

  Cookies.set(name, token)
}

export function persistStoredSession(session: StoredSession) {
  setCookieIfPresent(COOKIE_TOKEN, session.token)
  setCookieIfPresent(COOKIE_REFRESH_TOKEN, session.refresh_token)

  if (session.user) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(session.user))
  }

  if (session.session_expires_at) {
    localStorage.setItem(STORAGE_SESSION_EXPIRES_AT, session.session_expires_at)
    window.dispatchEvent(
      new CustomEvent<SessionExpiryChangedDetail>(
        SESSION_EXPIRY_CHANGED_EVENT,
        { detail: { sessionExpiresAt: session.session_expires_at } }
      )
    )
  }
}

export function clearStoredSession() {
  Cookies.remove(COOKIE_TOKEN)
  Cookies.remove(COOKIE_REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_USER)
  localStorage.removeItem(STORAGE_SESSION_EXPIRES_AT)
}

export function readStoredUser(): AuthenticatedUser | null {
  const rawUser = localStorage.getItem(STORAGE_USER)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as AuthenticatedUser
  } catch {
    return null
  }
}

export function readStoredSessionExpiry(): Date | null {
  const rawExpiry = localStorage.getItem(STORAGE_SESSION_EXPIRES_AT)

  if (!rawExpiry) {
    return null
  }

  const parsedDate = new Date(rawExpiry)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}
