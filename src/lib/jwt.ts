function decodeBase64Url(base64Url: string): string | null {
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    )

    if (typeof atob === 'function') {
      return atob(normalized)
    }

    return Buffer.from(normalized, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

export function getJwtExpiryDate(token?: string): Date | null {
  if (!token) {
    return null
  }

  const parts = token.split('.')

  if (parts.length < 2) {
    return null
  }

  const payloadRaw = decodeBase64Url(parts[1])

  if (!payloadRaw) {
    return null
  }

  try {
    const payload = JSON.parse(payloadRaw) as { exp?: unknown }
    if (typeof payload.exp !== 'number') {
      return null
    }

    return new Date(payload.exp * 1000)
  } catch {
    return null
  }
}

export function isJwtExpired(token?: string, skewSeconds = 0): boolean {
  const expiry = getJwtExpiryDate(token)

  if (!expiry) {
    return true
  }

  const now = Date.now() + skewSeconds * 1000
  return expiry.getTime() <= now
}
