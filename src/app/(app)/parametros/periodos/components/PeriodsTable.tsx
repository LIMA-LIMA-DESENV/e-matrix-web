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
import type { Period } from '@/http/api'

import { PeriodRow } from './PeriodRow'
import type { PeriodSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function usePeriodTableColumns() {
  const t = useTranslations('periods.columns')
  const tc = useTranslations('common')

  return [
    t('description'),
    t('startDate'),
    t('endDate'),
    t('createdAt'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

interface PeriodsTableProps {
  periods: Period[]
  search: string
  sort: ListSort<PeriodSortKey>
  onSort: (key: PeriodSortKey) => void
  onEdit: (period: Period) => void
  getRowActions: (period: Period) => RowActionsMenuProps
  footer?: ReactNode
}

export function PeriodsTable({
  periods,
  search,
  sort,
  onSort,
  onEdit,
  getRowActions,
  footer,
}: PeriodsTableProps) {
  const t = useTranslations('periods.columns')
  const tc = useTranslations('common')

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            <SortableHeaderCell
              sortKey="description"
              sort={sort}
              onSort={onSort}
            >
              {t('description')}
            </SortableHeaderCell>
            <SortableHeaderCell
              sortKey="start_date"
              sort={sort}
              onSort={onSort}
            >
              {t('startDate')}
            </SortableHeaderCell>
            <SortableHeaderCell sortKey="end_date" sort={sort} onSort={onSort}>
              {t('endDate')}
            </SortableHeaderCell>
            <SortableHeaderCell
              sortKey="created_at"
              sort={sort}
              onSort={onSort}
            >
              {t('createdAt')}
            </SortableHeaderCell>
            <TableHeaderCell className={`${headerCellClasses} text-right`}>
              {tc('actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {periods.map((period) => (
            <PeriodRow
              key={period.id}
              period={period}
              search={search}
              actions={getRowActions(period)}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
