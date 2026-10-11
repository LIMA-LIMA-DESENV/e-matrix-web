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
import type { Document } from '@/http/api'

import { DocumentRow } from './DocumentRow'
import type { DocumentSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useDocumentTableColumns() {
  const t = useTranslations('documents.columns')
  const tc = useTranslations('common')

  return [
    t('material'),
    t('name'),
    t('responsible'),
    t('date'),
    t('createdAt'),
    t('updatedAt'),
    tc('actions'),
  ]
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

/**
 * The six sortable columns, followed by the actions column. The menu itself
 * decides what to show: "Visualizar" for every role, editing and deleting only
 * for who may edit (FR-024).
 */
const sortableColumns = [
  { key: 'material', label: 'material' },
  { key: 'name', label: 'name' },
  { key: 'responsible', label: 'responsible' },
  { key: 'date', label: 'date' },
  { key: 'created_at', label: 'createdAt' },
  { key: 'updated_at', label: 'updatedAt' },
] as const satisfies readonly { key: DocumentSortKey; label: string }[]

interface DocumentsTableProps {
  documents: Document[]
  search: string
  sort: ListSort<DocumentSortKey>
  downloadingId: string | null
  onSort: (key: DocumentSortKey) => void
  getRowActions: (record: Document) => RowActionsMenuProps
  onOpenDetails: (record: Document) => void
  onDownloadFile: (record: Document) => void
  footer?: ReactNode
}

export function DocumentsTable({
  documents,
  search,
  sort,
  downloadingId,
  onSort,
  getRowActions,
  onOpenDetails,
  onDownloadFile,
  footer,
}: DocumentsTableProps) {
  const t = useTranslations('documents.columns')
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
          {documents.map((record) => (
            <DocumentRow
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
