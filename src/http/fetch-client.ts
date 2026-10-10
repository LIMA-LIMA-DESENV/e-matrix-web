import Cookies from 'js-cookie'

import type { PostRefreshToken200 } from '@/http/api'
import {
  COOKIE_REFRESH_TOKEN,
  COOKIE_TOKEN,
  clearStoredSession,
  persistStoredSession,
} from '@/lib/auth-storage'
import { isJwtExpired } from '@/lib/jwt'

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

if (!API_BASE) {
  throw new Error('Missing NEXT_PUBLIC_API_URL environment variable')
}

function getApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

export class FetchError extends Error {
  status: number
  response: { data: unknown }

  constructor(status: number, data: unknown, message?: string) {
    super(message ?? `HTTP error ${status}`)
    this.name = 'FetchError'
    this.status = status
    this.response = { data }
  }
}

// ---------------------------------------------------------------------------
// Silent refresh helpers
// ---------------------------------------------------------------------------

/** Module-level lock — prevents concurrent refresh attempts. */
let refreshPromise: ReturnType<typeof refreshSession> | null = null

function getLoginRedirectUrl(reason?: 'session-expired') {
  if (reason === 'session-expired') {
    return '/login?reason=session-expired'
  }

  return '/login'
}

/** Hard sign-out: clears storage and forces a full navigation to /login. */
function forceSignOut(reason?: 'session-expired') {
  clearStoredSession()
  window.location.href = getLoginRedirectUrl(reason)
}

function syncSessionExpiry(headers: Headers) {
  const sessionExpiresAt = headers.get('x-session-expires-at')

  if (!sessionExpiresAt) {
    return
  }

  persistStoredSession({
    session_expires_at: sessionExpiresAt,
  })
}

/**
 * Calls POST /refresh-token with the current refresh token.
 * On success, updates both cookies. On failure, signs out.
 */
export async function refreshSession(): Promise<{
  token?: string
  refresh_token?: string
  session_expires_at?: string
}> {
  const currentRefreshToken = Cookies.get(COOKIE_REFRESH_TOKEN)

  if (!currentRefreshToken || isJwtExpired(currentRefreshToken)) {
    forceSignOut()
    throw new FetchError(401, null, 'No refresh token available')
  }

  const response = await fetch(getApiUrl('/refresh-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: currentRefreshToken }),
  })

  if (!response.ok) {
    let data: unknown

    try {
      data = await response.json()
    } catch {
      data = await response.text().catch(() => null)
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : undefined

    forceSignOut(
      message === 'Session expired due to inactivity'
        ? 'session-expired'
        : undefined
    )
    throw new FetchError(response.status, data, message)
  }

  const data = (await response.json()) as PostRefreshToken200
  persistStoredSession(data)
  syncSessionExpiry(response.headers)

  return data
}

/**
 * Wraps silentRefresh with a lock so concurrent refresh triggers (proactive
 * refresh, 401 retry, manual "renew session", idle-timeout last chance) share
 * a single in-flight refresh attempt instead of racing each other.
 */
export async function refreshWithLock(): Promise<
  Awaited<ReturnType<typeof refreshSession>>
> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/** Auth-related endpoints that must NOT trigger the refresh-and-retry flow. */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/sessions') || url.includes('/refresh-token')
}

// ---------------------------------------------------------------------------
// Orval custom fetch mutator
// ---------------------------------------------------------------------------

/**
 * Reads a successful response body: binary content (any declared non-JSON
 * Content-Type, e.g. attachment downloads) as a Blob; JSON or bodies without a
 * Content-Type keep being parsed as JSON.
 */
async function readSuccessBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')

  if (contentType && !/[/+]json\b/i.test(contentType)) {
    return response.blob()
  }

  const body = await response.text()
  return body ? JSON.parse(body) : undefined
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const requestUrl = getApiUrl(url)

  // Inject Authorization header
  const token = Cookies.get(COOKIE_TOKEN)
  const refreshToken = Cookies.get(COOKIE_REFRESH_TOKEN)
  const headers = new Headers(options.headers)

  if (token && !isJwtExpired(token, 5)) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (
    refreshToken &&
    !isJwtExpired(refreshToken, 5) &&
    !isAuthEndpoint(url)
  ) {
    await refreshWithLock()

    const refreshedToken = Cookies.get(COOKIE_TOKEN)
    if (refreshedToken && !isJwtExpired(refreshedToken, 5)) {
      headers.set('Authorization', `Bearer ${refreshedToken}`)
    }
  }

  const response = await fetch(requestUrl, { ...options, headers })
  syncSessionExpiry(response.headers)

  // 401 on a non-auth endpoint → attempt silent refresh, then retry once
  if (response.status === 401 && !isAuthEndpoint(url)) {
    await refreshWithLock()

    const newToken = Cookies.get(COOKIE_TOKEN)
    const retryHeaders = new Headers(options.headers)

    if (newToken) {
      retryHeaders.set('Authorization', `Bearer ${newToken}`)
    }

    const retryResponse = await fetch(requestUrl, {
      ...options,
      headers: retryHeaders,
    })
    syncSessionExpiry(retryResponse.headers)

    if (!retryResponse.ok) {
      let data: unknown
      try {
        data = await retryResponse.json()
      } catch {
        data = await retryResponse.text().catch(() => null)
      }

      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as Record<string, unknown>).message)
          : undefined

      throw new FetchError(retryResponse.status, data, message)
    }

    if ([204, 205, 304].includes(retryResponse.status)) {
      return {
        data: undefined,
        status: retryResponse.status,
        headers: retryResponse.headers,
      } as T
    }

    return {
      data: await readSuccessBody(retryResponse),
      status: retryResponse.status,
      headers: retryResponse.headers,
    } as T
  }

  // Standard error handling for non-401 or auth endpoints
  if (!response.ok) {
    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = await response.text().catch(() => null)
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : undefined

    throw new FetchError(response.status, data, message)
  }

  if ([204, 205, 304].includes(response.status)) {
    return {
      data: undefined,
      status: response.status,
      headers: response.headers,
    } as T
  }

  return {
    data: await readSuccessBody(response),
    status: response.status,
    headers: response.headers,
  } as T
}
