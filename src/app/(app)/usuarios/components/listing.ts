import {
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import { UserListItemStatus } from '@/http/api'

import { ROLE_RANK } from './formatters'
import type { RuntimeUser, UserLifecycleAction, UserSortKey } from './types'

export const USER_LIST_CONFIG: ListStateConfig<UserSortKey> = {
  sortKeys: ['name', 'email', 'role', 'created_at', 'status'],
  defaultSort: { key: 'name', dir: 'asc' },
}

export const userSortColumns: SortColumns<RuntimeUser, UserSortKey> = {
  name: { type: 'text', getValue: (user) => user.name },
  email: { type: 'text', getValue: (user) => user.email },
  role: { type: 'number', getValue: (user) => ROLE_RANK[user.role] ?? 0 },
  created_at: { type: 'date', getValue: (user) => user.created_at },
  status: { type: 'status', getValue: (user) => user.status },
}

/** Search by name or e-mail. */
export function matchesUserSearch(user: RuntimeUser, search: string) {
  return matchesSearch(search, [user.name, user.email])
}

/**
 * Exit action of the row: inactive users can be reactivated; active users can
 * be inactivated, except the logged user.
 */
export function getUserExitAction(
  user: RuntimeUser,
  isCurrentUser: boolean
): UserLifecycleAction | null {
  if (user.status !== UserListItemStatus.active) return 'reactivate'

  return isCurrentUser ? null : 'inactivate'
}
