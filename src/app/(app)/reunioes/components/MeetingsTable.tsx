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
import type { Meeting } from '@/http/api'
import type { MeetingAttachmentKey } from '@/lib/download-file'

import { MeetingRow } from './MeetingRow'
import type { MeetingSortKey } from './types'

/** Translated column headers, also used by the loading skeleton. */
export function useMeetingTableColumns() {
  const t = useTranslations('meetings.columns')
  const tc = useTranslations('common')

  return [
    t('type'),
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
  { key: 'type', label: 'type' },
  { key: 'name', label: 'name' },
  { key: 'responsible', label: 'responsible' },
  { key: 'date', label: 'date' },
  { key: 'status', label: 'status' },
] as const satisfies readonly { key: MeetingSortKey; label: string }[]

interface MeetingsTableProps {
  meetings: Meeting[]
  search: string
  sort: ListSort<MeetingSortKey>
  /** Attachment being downloaded, if any: one download at a time. */
  downloading: { id: string; attachment: MeetingAttachmentKey } | null
  onSort: (key: MeetingSortKey) => void
  getRowActions: (record: Meeting) => RowActionsMenuProps
  onOpenDetails: (record: Meeting) => void
  onDownloadFile: (record: Meeting, attachment: MeetingAttachmentKey) => void
  footer?: ReactNode
}

export function MeetingsTable({
  meetings,
  search,
  sort,
  downloading,
  onSort,
  getRowActions,
  onOpenDetails,
  onDownloadFile,
  footer,
}: MeetingsTableProps) {
  const t = useTranslations('meetings.columns')
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
          {meetings.map((record) => (
            <MeetingRow
              key={record.id}
              record={record}
              search={search}
              downloadingAttachment={
                downloading?.id === record.id ? downloading.attachment : null
              }
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
