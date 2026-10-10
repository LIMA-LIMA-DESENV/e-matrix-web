import { UserRole } from '@/http/api'

export function getUserInitials(name?: string | null) {
  const words = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '—'

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

/** Higher rank = more access; used to sort by role. */
export const ROLE_RANK: Record<string, number> = {
  [UserRole.admin]: 3,
  [UserRole.user]: 2,
  [UserRole.viewer]: 1,
}
