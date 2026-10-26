import type { ExportTable } from './table'

/** The legacy separator, which Excel in pt-BR splits on (R-18). */
const SEPARATOR = ';'

// Lets Excel read the file as UTF-8, so the accents survive.
const BOM = '﻿'

// A cell starting with one of these is read as a formula by spreadsheets.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

const NEEDS_QUOTES = /[";\r\n]/

/**
 * One CSV field: a `'` in front of what a spreadsheet would run as a formula
 * (H-6), then quoted as RFC 4180 asks when it holds a quote, the separator or
 * a line break, with the quotes doubled.
 */
function toCsvField(value: string | null) {
  if (value === null) return ''

  const text = FORMULA_PREFIX.test(value) ? `'${value}` : value

  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * The table as a CSV file: `;` as the separator, UTF-8 with a BOM, CRLF
 * between records and the header first (FR-025). Without rows, the file has
 * only the header.
 */
export function buildCsv({ header, rows }: ExportTable): Blob {
  const lines = [header, ...rows].map((cells) =>
    cells.map(toCsvField).join(SEPARATOR)
  )

  return new Blob([BOM, lines.join('\r\n'), '\r\n'], {
    type: 'text/csv;charset=utf-8',
  })
}
