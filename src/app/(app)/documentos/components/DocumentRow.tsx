import { useFormatter, useTranslations } from 'next-intl'
import type { MouseEvent } from 'react'

import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { TableCell, TableRow } from '@/components/ui'
import type { Document } from '@/http/api'
import { useFormatDateOnly } from '@/lib/format-date'

import { DocumentMaterialBadge } from './DocumentMaterialBadge'

interface DocumentRowProps {
  record: Document
  search: string
  isDownloading: boolean
  /** Only the actions the role and the record allow (FR-024). */
  actions: RowActionsMenuProps
  onOpenDetails: (record: Document) => void
  onDownloadFile: (record: Document) => void
}

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

export function DocumentRow({
  record,
  search,
  isDownloading,
  actions,
  onOpenDetails,
  onDownloadFile,
}: DocumentRowProps) {
  const t = useTranslations('documents')
  const tc = useTranslations('common')
  const format = useFormatter()
  const formatDateOnly = useFormatDateOnly()

  function handleDownload(event: MouseEvent) {
    // Never let the download open the details modal as well.
    event.stopPropagation()
    onDownloadFile(record)
  }

  function formatInstant(value: string) {
    return value
      ? format.dateTime(new Date(value), {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        })
      : tc('emptyValue')
  }

  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onOpenDetails(record)}
    >
      <TableCell className="px-6 py-5">
        <DocumentMaterialBadge material={record.material} />
      </TableCell>

      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={record.name} search={search} />
        </span>

        {/* The original file name, with the only action of a reading row. A
            document without a file shows neither (R-10, AC-020). */}
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
        {formatInstant(record.created_at)}
      </TableCell>

      <TableCell className={cellClasses}>
        {formatInstant(record.updated_at)}
      </TableCell>

      <TableCell className="px-6 py-5">
        <RowActionsMenu {...actions} />
      </TableCell>
    </TableRow>
  )
}
