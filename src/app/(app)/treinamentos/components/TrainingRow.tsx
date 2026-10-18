import { useTranslations } from 'next-intl'
import type { MouseEvent } from 'react'

import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { TableCell, TableRow } from '@/components/ui'
import type { Training } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { TrainingContentBadge } from './TrainingContentBadge'

interface TrainingRowProps {
  record: Training
  search: string
  isDownloading: boolean
  /** Only the actions the role and the record allow. */
  actions: RowActionsMenuProps
  onOpenDetails: (record: Training) => void
  onDownloadFile: (record: Training) => void
}

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

export function TrainingRow({
  record,
  search,
  isDownloading,
  actions,
  onOpenDetails,
  onDownloadFile,
}: TrainingRowProps) {
  const t = useTranslations('trainings')
  const tc = useTranslations('common')
  const formatDateOnly = useFormatDateOnly()

  function handleDownload(event: MouseEvent) {
    // Never let the download open the details modal as well.
    event.stopPropagation()
    onDownloadFile(record)
  }

  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onOpenDetails(record)}
    >
      <TableCell className="px-6 py-5">
        <TrainingContentBadge content={record.content} />
      </TableCell>

      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={record.name} search={search} />
        </span>

        {/* The attendance list under its original name. A training without
            one shows no download (R-15, R-17). */}
        {record.file && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            title={record.file.name}
            aria-label={t('downloadFileNamed', { name: record.file.name })}
            className="mt-1 flex max-w-xs cursor-pointer items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <span
              className="material-symbols-outlined shrink-0 text-base"
              aria-hidden
            >
              download
            </span>
            <span className="truncate">{record.file.name}</span>
          </button>
        )}
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
