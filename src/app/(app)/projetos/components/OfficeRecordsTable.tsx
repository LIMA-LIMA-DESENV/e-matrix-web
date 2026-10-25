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
import { useFormatDateOnly } from '@/lib/format-date'

import { formatProjectActivity } from './listing'
import { ProjectCodeBadge } from './ProjectCodeBadge'
import type { OfficeRow, OfficeSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useOfficeRecordsTableColumns() {
  const t = useTranslations('projects.columns')
  const tc = useTranslations('common')

  return [
    t('code'),
    t('type'),
    t('date'),
    t('activity'),
    t('concern'),
    t('priority'),
    t('employee'),
    t('employeeRegistry'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

/** The columns of J3, all sortable, followed by the actions column. */
const sortableColumns = [
  { key: 'code', label: 'code' },
  { key: 'type', label: 'type' },
  { key: 'date', label: 'date' },
  { key: 'activity', label: 'activity' },
  { key: 'concern', label: 'concern' },
  { key: 'priority', label: 'priority' },
  { key: 'employee', label: 'employee' },
  { key: 'employeeRegistry', label: 'employeeRegistry' },
] as const satisfies readonly { key: OfficeSortKey; label: string }[]

interface OfficeRecordsTableProps {
  rows: OfficeRow[]
  search: string
  sort: ListSort<OfficeSortKey>
  onSort: (key: OfficeSortKey) => void
  getRowActions: (row: OfficeRow) => RowActionsMenuProps
  onOpenDetails: (row: OfficeRow) => void
  footer?: ReactNode
}

/**
 * RGA and RA table of the Escritório tab (FR-033, R-23): code, type and date
 * for every row, then the columns of its type; the others stay empty.
 */
export function OfficeRecordsTable({
  rows,
  search,
  sort,
  onSort,
  getRowActions,
  onOpenDetails,
  footer,
}: OfficeRecordsTableProps) {
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()

  function renderText(value: string | undefined) {
    return value === undefined ? null : (
      <HighlightText text={value} search={search} />
    )
  }

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
                {t(`columns.${column.label}`)}
              </SortableHeaderCell>
            ))}
            <TableHeaderCell className={`${headerCellClasses} text-right`}>
              {tc('actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {rows.map((row) => {
            const project = row.type === 'rga' ? row.record : null
            const receipt = row.type === 'ra' ? row.record : null

            return (
              <TableRow
                key={row.key}
                className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
                onClick={() => onOpenDetails(row)}
              >
                <TableCell className="px-6 py-5">
                  <ProjectCodeBadge code={row.record.code} search={search} />
                </TableCell>

                <TableCell className={`${cellClasses} whitespace-nowrap`}>
                  <span title={t(`types.${row.type}`)}>
                    <HighlightText
                      text={t(`shortTypes.${row.type}`)}
                      search={search}
                    />
                  </span>
                </TableCell>

                <TableCell className={`${cellClasses} whitespace-nowrap`}>
                  {formatDateOnly(row.record.date) ?? tc('emptyValue')}
                </TableCell>

                <TableCell className={cellClasses}>
                  {project && (
                    <span className="font-bold text-ematrix-dark">
                      {renderText(formatProjectActivity(project.activity))}
                    </span>
                  )}
                </TableCell>

                <TableCell className={`${cellClasses} max-w-sm break-words`}>
                  {renderText(project?.concern)}
                </TableCell>

                <TableCell className={`${cellClasses} break-words`}>
                  {renderText(project?.priority)}
                </TableCell>

                <TableCell className={`${cellClasses} break-words`}>
                  {renderText(receipt?.employee)}
                </TableCell>

                <TableCell className={`${cellClasses} break-words`}>
                  {renderText(receipt?.employee_registry)}
                </TableCell>

                <TableCell className="px-6 py-5">
                  <RowActionsMenu {...getRowActions(row)} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
