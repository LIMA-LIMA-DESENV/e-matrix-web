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
import type { Activity } from '@/http/api'

import { ActivityRow } from './ActivityRow'
import type { ActivitySortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useActivityTableColumns() {
  const t = useTranslations('activities.columns')
  const tc = useTranslations('common')

  return [
    t('code'),
    t('name'),
    t('fabric'),
    t('line'),
    t('area'),
    t('function'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

/** The six sortable columns, in the order the legacy table showed them. */
const sortableColumns = [
  'code',
  'name',
  'fabric',
  'line',
  'area',
  'function',
] as const satisfies readonly ActivitySortKey[]

interface ActivitiesTableProps {
  activities: Activity[]
  search: string
  sort: ListSort<ActivitySortKey>
  onSort: (key: ActivitySortKey) => void
  onEdit: (activity: Activity) => void
  getRowActions: (activity: Activity) => RowActionsMenuProps
  footer?: ReactNode
}

export function ActivitiesTable({
  activities,
  search,
  sort,
  onSort,
  onEdit,
  getRowActions,
  footer,
}: ActivitiesTableProps) {
  const t = useTranslations('activities.columns')
  const tc = useTranslations('common')

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            {sortableColumns.map((column) => (
              <SortableHeaderCell
                key={column}
                sortKey={column}
                sort={sort}
                onSort={onSort}
              >
                {t(column)}
              </SortableHeaderCell>
            ))}
            <TableHeaderCell className={`${headerCellClasses} text-right`}>
              {tc('actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              search={search}
              actions={getRowActions(activity)}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
