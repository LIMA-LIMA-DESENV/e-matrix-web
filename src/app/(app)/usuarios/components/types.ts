import type { UserListItem } from '@/http/api'

export type RuntimeUser = UserListItem

export type UserLifecycleAction = 'inactivate' | 'reactivate'

export type UserSortKey = 'name' | 'email' | 'role' | 'created_at' | 'status'
