'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import type { MatrixRow } from '@/http/api'
import { saveBlobAsFile } from '@/lib/download-file'
import { buildCsv } from '@/lib/export/csv'
import { type ExportTable, toExportFileName } from '@/lib/export/table'

import { getMatrixDisplayValue, type MatrixColumn } from './columns'
import { useMatrixValueLabels } from './use-matrix-labels'

export type MatrixExportFormat = 'csv' | 'xlsx'

/** The legacy file name, in every language (R-18). */
const FILE_NAME = 'matriz'

interface MatrixExportSource {
  /** The visible columns, in the order of the screen. */
  columns: readonly MatrixColumn[]
  /** Every row that passes the search and the filters, of every page. */
  rows: readonly MatrixRow[]
  /** The description of the period, for the file name. */
  periodDescription: string
}

/**
 * Exports the Matrix as the user sees it (J6, FR-025): the visible columns
 * with their translated labels and the filtered rows, sorted, of every page,
 * with the list values translated and empty values as empty cells. The file
 * is `matriz-<period>.csv|.xlsx`. The `.xlsx` module, and the library it
 * loads, are fetched with `import()` only on the first Excel export
 * (NFR-007). One file is generated at a time; a failure is logged without
 * the data and reported through `onError`, translated.
 */
export function useMatrixExport(onError: (message: string) => void) {
  const t = useTranslations('matrix')
  const labels = useMatrixValueLabels()
  const [generating, setGenerating] = useState<MatrixExportFormat | null>(null)
  // A second click while the menu reopens is dropped here.
  const isBusy = useRef(false)

  async function exportMatrix(
    format: MatrixExportFormat,
    { columns, rows, periodDescription }: MatrixExportSource
  ) {
    if (isBusy.current) return

    isBusy.current = true
    setGenerating(format)

    try {
      const table: ExportTable = {
        header: columns.map((column) => t(`columns.${column.key}`)),
        rows: rows.map((row) =>
          columns.map((column) => getMatrixDisplayValue(row, column, labels))
        ),
      }

      const blob =
        format === 'csv'
          ? buildCsv(table)
          : await import('@/lib/export/xlsx').then(({ buildXlsx }) =>
              buildXlsx(table, t('title'))
            )

      saveBlobAsFile(
        blob,
        toExportFileName(FILE_NAME, periodDescription, format)
      )
    } catch (error) {
      console.error('Matrix export failed.', error)
      onError(t('export.error'))
    } finally {
      isBusy.current = false
      setGenerating(null)
    }
  }

  return {
    generating,
    isGenerating: generating !== null,
    exportMatrix,
  }
}
