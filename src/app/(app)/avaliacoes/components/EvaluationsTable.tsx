import { useFormatter, useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import {
  HighlightText,
  type ListSort,
  RowActionsMenu,
  type RowActionsMenuProps,
  SortableHeaderCell,
} from '@/components/list'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'

import { formatEvaluationActivity } from './listing'
import type { EvaluationRow, EvaluationSortKey } from './types'

/** The columns of R-7, all sortable, then the row actions when given. */
const columns = [
  { key: 'code', label: 'code' },
  { key: 'type', label: 'type' },
  { key: 'name', label: 'name' },
  { key: 'activity', label: 'activity' },
  { key: 'createdAt', label: 'createdAt' },
  { key: 'updatedAt', label: 'updatedAt' },
] as const satisfies readonly { key: EvaluationSortKey; label: string }[]

/** Translated column headers, also used by the loading skeleton. */
export function useEvaluationTableColumns() {
  const t = useTranslations('evaluations.columns')

  return columns.map((column) => t(column.label))
}

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'
const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

interface EvaluationsTableProps {
  rows: EvaluationRow[]
  /** The translated type, the same on every row of a tab. */
  typeLabel: string
  search: string
  sort: ListSort<EvaluationSortKey>
  onSort: (key: EvaluationSortKey) => void
  /** The ⋮ menu of each row (the PDF, R-11); without it, no actions column. */
  getRowActions?: (row: EvaluationRow) => RowActionsMenuProps
  footer?: ReactNode
}

/** The table of one evaluation type (FR-012), read only for every role. */
export function EvaluationsTable({
  rows,
  typeLabel,
  search,
  sort,
  onSort,
  getRowActions,
  footer,
}: EvaluationsTableProps) {
  const t = useTranslations('evaluations.columns')
  const tc = useTranslations('common')
  const format = useFormatter()

  // Date and time, like the legacy `d/m/Y às H:i`, in the user's language.
  function formatInstant(value: string) {
    const date = new Date(value)

    return value && !Number.isNaN(date.getTime())
      ? format.dateTime(date, { dateStyle: 'short', timeStyle: 'short' })
      : tc('emptyValue')
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            {columns.map((column) => (
              <SortableHeaderCell
                key={column.key}
                sortKey={column.key}
                sort={sort}
                onSort={onSort}
              >
                {t(column.label)}
              </SortableHeaderCell>
            ))}
            {getRowActions && (
              <TableHeaderCell className={`${headerCellClasses} text-right`}>
                {tc('actions')}
              </TableHeaderCell>
            )}
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="group border-none transition-colors hover:bg-surface-container-low"
            >
              <TableCell className="px-6 py-5">
                {/* Neutral, so the search highlight stays legible on it. */}
                <Badge
                  color="neutral"
                  className="whitespace-nowrap font-bold text-ematrix-dark"
                >
                  <span>
                    <HighlightText text={row.code} search={search} />
                  </span>
                </Badge>
              </TableCell>

              <TableCell className={`${cellClasses} whitespace-nowrap`}>
                <HighlightText text={typeLabel} search={search} />
              </TableCell>

              <TableCell className={`${cellClasses} max-w-sm break-words`}>
                <HighlightText text={row.name} search={search} />
              </TableCell>

              <TableCell className={cellClasses}>
                <span className="font-bold text-ematrix-dark">
                  <HighlightText
                    text={formatEvaluationActivity(row.activity)}
                    search={search}
                  />
                </span>
              </TableCell>

              <TableCell className={`${cellClasses} whitespace-nowrap`}>
                {formatInstant(row.created_at)}
              </TableCell>

              <TableCell className={`${cellClasses} whitespace-nowrap`}>
                {formatInstant(row.updated_at)}
              </TableCell>

              {getRowActions && (
                <TableCell className="px-6 py-5">
                  <RowActionsMenu {...getRowActions(row)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
