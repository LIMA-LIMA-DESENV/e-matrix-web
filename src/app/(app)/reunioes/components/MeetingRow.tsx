import { useTranslations } from 'next-intl'
import type { MouseEvent } from 'react'

import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { TableCell, TableRow } from '@/components/ui'
import type { Meeting } from '@/http/api'
import {
  MEETING_ATTACHMENT_FIELDS,
  type MeetingAttachmentKey,
} from '@/lib/download-file'
import { useFormatDateOnly } from '@/lib/format-date'

import { MEETING_ATTACHMENTS } from './listing'
import { MeetingTypeBadge } from './MeetingTypeBadge'

interface MeetingRowProps {
  record: Meeting
  search: string
  /** Attachment of this meeting being downloaded, if any. */
  downloadingAttachment: MeetingAttachmentKey | null
  /** Only the actions the role and the record allow. */
  actions: RowActionsMenuProps
  onOpenDetails: (record: Meeting) => void
  onDownloadFile: (record: Meeting, attachment: MeetingAttachmentKey) => void
}

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

export function MeetingRow({
  record,
  search,
  downloadingAttachment,
  actions,
  onOpenDetails,
  onDownloadFile,
}: MeetingRowProps) {
  const t = useTranslations('meetings')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()

  function handleDownload(event: MouseEvent, attachment: MeetingAttachmentKey) {
    // Never let the download open the details modal as well.
    event.stopPropagation()
    onDownloadFile(record, attachment)
  }

  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onOpenDetails(record)}
    >
      <TableCell className="px-6 py-5">
        <MeetingTypeBadge type={record.type} />
      </TableCell>

      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={record.name} search={search} />
        </span>

        {/* One download per attachment present, each under its original
            name and labelled with which attachment it is, so the attendance
            list and the minutes are told apart (R-13, R-15). */}
        {MEETING_ATTACHMENTS.map(({ key, label }) => {
          const file = record[MEETING_ATTACHMENT_FIELDS[key]]
          if (!file) return null

          const name = t('downloadFileNamed', {
            attachment: t(label),
            name: file.name,
          })

          return (
            <button
              key={key}
              type="button"
              onClick={(event) => handleDownload(event, key)}
              disabled={downloadingAttachment !== null}
              title={name}
              aria-label={name}
              className="mt-1 flex max-w-xs cursor-pointer items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <span
                className="material-symbols-outlined shrink-0 text-base"
                aria-hidden
              >
                {downloadingAttachment === key ? 'hourglass_top' : 'download'}
              </span>
              <span className="shrink-0 font-semibold">{t(label)}:</span>
              <span className="truncate">{file.name}</span>
            </button>
          )
        })}
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={record.responsible} search={search} />
      </TableCell>

      <TableCell className={cellClasses}>
        {formatDateOnly(record.date) ?? tc('emptyValue')}
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={record.status} search={search} />
      </TableCell>

      <TableCell className="px-6 py-5">
        <RowActionsMenu {...actions} />
      </TableCell>
    </TableRow>
  )
}
