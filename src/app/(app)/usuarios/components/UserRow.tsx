import { useFormatter, useTranslations } from 'next-intl'

import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { Badge, TableCell, TableRow } from '@/components/ui'
import { UserListItemStatus } from '@/http/api'

import { getUserInitials } from './formatters'
import type { RuntimeUser } from './types'
import { UserRoleBadge } from './UserRoleBadge'

const avatarColors = [
  'bg-primary/10 text-primary',
  'bg-secondary/10 text-secondary',
  'bg-tertiary/10 text-tertiary',
  'bg-primary-container/20 text-primary-container',
]

interface UserRowProps {
  user: RuntimeUser
  index: number
  search: string
  actions: RowActionsMenuProps
  onEdit: (user: RuntimeUser) => void
}

export function UserRow({
  user,
  index,
  search,
  actions,
  onEdit,
}: UserRowProps) {
  const t = useTranslations('userStatus')
  const format = useFormatter()
  const avatarColor = avatarColors[index % avatarColors.length]
  const isActive = user.status === UserListItemStatus.active

  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onEdit(user)}
    >
      <TableCell className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${avatarColor}`}
          >
            {getUserInitials(user.name)}
          </div>
          <span className="text-sm font-bold text-ematrix-dark">
            <HighlightText text={user.name} search={search} />
          </span>
        </div>
      </TableCell>

      <TableCell className="px-6 py-5">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-outline">
            mail
          </span>
          <span>
            <HighlightText text={user.email} search={search} />
          </span>
        </div>
      </TableCell>

      <TableCell className="px-6 py-5">
        <UserRoleBadge role={user.role} />
      </TableCell>

      <TableCell className="px-6 py-5 text-sm font-medium text-on-surface-variant">
        {user.created_at
          ? format.dateTime(new Date(user.created_at), { dateStyle: 'short' })
          : '—'}
      </TableCell>

      <TableCell className="px-6 py-5">
        <Badge color={isActive ? 'success' : 'neutral'}>{t(user.status)}</Badge>
      </TableCell>

      <TableCell className="px-6 py-5">
        <RowActionsMenu {...actions} />
      </TableCell>
    </TableRow>
  )
}
