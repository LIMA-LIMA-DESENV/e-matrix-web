import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import {
  HighlightText,
  type ListSort,
  RowActionsMenu,
  type RowActionsMenuProps,
  SortableHeaderCell,
} from '@/components/list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { ImprovementProject } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { formatProjectActivity } from './listing'
import { ProjectCodeBadge } from './ProjectCodeBadge'
import type { ProductionSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useImprovementProjectTableColumns() {
  const t = useTranslations('projects.columns')
  const tc = useTranslations('common')

  return [
    t('code'),
    t('date'),
    t('activity'),
    t('concern'),
    t('priority'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

/** The columns of J2, all sortable, followed by the actions column. */
const sortableColumns = [
  { key: 'code', label: 'code' },
  { key: 'date', label: 'date' },
  { key: 'activity', label: 'activity' },
  { key: 'concern', label: 'concern' },
  { key: 'priority', label: 'priority' },
] as const satisfies readonly { key: ProductionSortKey; label: string }[]

interface ImprovementProjectsTableProps {
  records: ImprovementProject[]
  search: string
  sort: ListSort<ProductionSortKey>
  onSort: (key: ProductionSortKey) => void
  getRowActions: (record: ImprovementProject) => RowActionsMenuProps
  onOpenDetails: (record: ImprovementProject) => void
  footer?: ReactNode
}

/** RGP table of the Produção tab (FR-032). */
export function ImprovementProjectsTable({
  records,
  search,
  sort,
  onSort,
  getRowActions,
  onOpenDetails,
  footer,
}: ImprovementProjectsTableProps) {
  const t = useTranslations('projects.columns')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            {sortableColumns.map((column) => (
              <SortableHeaderCell
                key={column.key}
                sortKey={column.key}
                sort={sort}
                onSort={onSort}
              >
                {t(column.label)}
              </SortableHeaderCell>
            ))}
            <TableHeaderCell className={`${headerCellClasses} text-right`}>
              {tc('actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {records.map((record) => (
            <TableRow
              key={record.id}
              className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
              onClick={() => onOpenDetails(record)}
            >
              <TableCell className="px-6 py-5">
                <ProjectCodeBadge code={record.code} search={search} />
              </TableCell>

              <TableCell className={`${cellClasses} whitespace-nowrap`}>
                {formatDateOnly(record.date) ?? tc('emptyValue')}
              </TableCell>

              <TableCell className={cellClasses}>
                <span className="font-bold text-ematrix-dark">
                  <HighlightText
                    text={formatProjectActivity(record.activity)}
                    search={search}
                  />
                </span>
              </TableCell>

              <TableCell className={`${cellClasses} max-w-sm break-words`}>
                <HighlightText text={record.concern} search={search} />
              </TableCell>

              <TableCell className={`${cellClasses} break-words`}>
                <HighlightText text={record.priority} search={search} />
              </TableCell>

              <TableCell className="px-6 py-5">
                <RowActionsMenu {...getRowActions(record)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
