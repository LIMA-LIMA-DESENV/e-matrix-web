import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import {
  type ListSort,
  type RowActionsMenuProps,
  SortableHeaderCell,
} from '@/components/list'
import {
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { RuntimeUser, UserSortKey } from './types'
import { UserRow } from './UserRow'

/** Translated column headers, also used by the loading skeleton. */
export function useUserTableColumns() {
  const t = useTranslations('users.columns')
  const tc = useTranslations('common')

  return [
    t('user'),
    t('email'),
    t('role'),
    t('createdAt'),
    t('status'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

interface UsersTableProps {
  users: RuntimeUser[]
  search: string
  sort: ListSort<UserSortKey>
  onSort: (key: UserSortKey) => void
  onEdit: (user: RuntimeUser) => void
  getRowActions: (user: RuntimeUser) => RowActionsMenuProps
  footer?: ReactNode
}

export function UsersTable({
  users,
  search,
  sort,
  onSort,
  onEdit,
  getRowActions,
  footer,
}: UsersTableProps) {
  const t = useTranslations('users.columns')
  const tc = useTranslations('common')

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            <SortableHeaderCell sortKey="name" sort={sort} onSort={onSort}>
              {t('user')}
            </SortableHeaderCell>
            <SortableHeaderCell sortKey="email" sort={sort} onSort={onSort}>
              {t('email')}
            </SortableHeaderCell>
            <SortableHeaderCell sortKey="role" sort={sort} onSort={onSort}>
              {t('role')}
            </SortableHeaderCell>
            <SortableHeaderCell
              sortKey="created_at"
              sort={sort}
              onSort={onSort}
            >
              {t('createdAt')}
            </SortableHeaderCell>
            <SortableHeaderCell sortKey="status" sort={sort} onSort={onSort}>
              {t('status')}
            </SortableHeaderCell>
            <TableHeaderCell className={`${headerCellClasses} text-right`}>
              {tc('actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {users.map((user, index) => (
            <UserRow
              key={user.id}
              user={user}
              index={index}
              search={search}
              actions={getRowActions(user)}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
