import { useFormatter, useTranslations } from 'next-intl'

import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { TableCell, TableRow } from '@/components/ui'
import type { Period } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

interface PeriodRowProps {
  period: Period
  search: string
  actions: RowActionsMenuProps
  onEdit: (period: Period) => void
}

export function PeriodRow({ period, search, actions, onEdit }: PeriodRowProps) {
  const tc = useTranslations('common')
  const format = useFormatter()
  const formatDateOnly = useFormatDateOnly()

  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onEdit(period)}
    >
      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={period.description} search={search} />
        </span>
      </TableCell>

      <TableCell className="px-6 py-5 text-sm font-medium text-on-surface-variant">
        {formatDateOnly(period.start_date) ?? tc('emptyValue')}
      </TableCell>

      <TableCell className="px-6 py-5 text-sm font-medium text-on-surface-variant">
        {formatDateOnly(period.end_date) ?? tc('emptyValue')}
      </TableCell>

      <TableCell className="px-6 py-5 text-sm font-medium text-on-surface-variant">
        {period.created_at
          ? format.dateTime(new Date(period.created_at), {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            })
          : tc('emptyValue')}
      </TableCell>

      <TableCell className="px-6 py-5">
        <RowActionsMenu {...actions} />
      </TableCell>
    </TableRow>
  )
}
