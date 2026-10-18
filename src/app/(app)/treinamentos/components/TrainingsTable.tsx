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
import type { Training } from '@/http/api'

import { TrainingRow } from './TrainingRow'
import type { TrainingSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useTrainingTableColumns() {
  const t = useTranslations('trainings.columns')
  const tc = useTranslations('common')

  return [
    t('content'),
    t('name'),
    t('responsible'),
    t('date'),
    t('status'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

/** The legacy columns (R-9), all sortable, followed by the actions column. */
const sortableColumns = [
  { key: 'content', label: 'content' },
  { key: 'name', label: 'name' },
  { key: 'responsible', label: 'responsible' },
  { key: 'date', label: 'date' },
  { key: 'status', label: 'status' },
] as const satisfies readonly { key: TrainingSortKey; label: string }[]

interface TrainingsTableProps {
  trainings: Training[]
  search: string
  sort: ListSort<TrainingSortKey>
  downloadingId: string | null
  onSort: (key: TrainingSortKey) => void
  getRowActions: (record: Training) => RowActionsMenuProps
  onOpenDetails: (record: Training) => void
  onDownloadFile: (record: Training) => void
  footer?: ReactNode
}

export function TrainingsTable({
  trainings,
  search,
  sort,
  downloadingId,
  onSort,
  getRowActions,
  onOpenDetails,
  onDownloadFile,
  footer,
}: TrainingsTableProps) {
  const t = useTranslations('trainings.columns')
  const tc = useTranslations('common')

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
          {trainings.map((record) => (
            <TrainingRow
              key={record.id}
              record={record}
              search={search}
              isDownloading={downloadingId === record.id}
              actions={getRowActions(record)}
              onOpenDetails={onOpenDetails}
              onDownloadFile={onDownloadFile}
            />
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
