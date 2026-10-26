import {
  isPeriodIdValue,
  type ListStateConfig,
  matchesSearch,
  normalizeText,
  type SortColumns,
} from '@/components/list'
import {
  MatrixProjectStatus,
  MatrixRiskLevel,
  type MatrixRow,
} from '@/http/api'

import {
  getMatrixDisplayValue,
  getMatrixRawValue,
  MATRIX_COLUMN_KEYS,
  MATRIX_COLUMNS,
  type MatrixColumn,
  type MatrixColumnKey,
  type MatrixValueLabels,
} from './columns'

/** The URL param of the filter of a column (H-7): `f.<key>`. */
export type MatrixFilterKey = `f.${MatrixColumnKey}`

export function matrixFilterKey(key: MatrixColumnKey): MatrixFilterKey {
  return `f.${key}`
}

/** The filter value of a list column that keeps only the empty cells. */
export const MATRIX_EMPTY_FILTER = 'empty'

/** The values offered by the filter of each list column, in this order. */
export const MATRIX_LIST_VALUES = {
  risk_level: Object.values(MatrixRiskLevel),
  project_status: Object.values(MatrixProjectStatus),
} as const

type MatrixFilterValidator = readonly string[] | ((value: string) => boolean)

/**
 * A list column accepts its values and "empty"; a text column accepts any
 * text ("contains", or "equals" between double quotes).
 */
function getFilterValidator(column: MatrixColumn): MatrixFilterValidator {
  if (column.type === 'text') return () => true

  return [...MATRIX_LIST_VALUES[column.type], MATRIX_EMPTY_FILTER]
}

const COLUMN_FILTERS = Object.fromEntries(
  MATRIX_COLUMNS.map((column) => [
    matrixFilterKey(column.key),
    getFilterValidator(column),
  ])
) as Record<MatrixFilterKey, MatrixFilterValidator>

/**
 * `?period=` takes only a period id: the Matrix has no "all periods" (R-2),
 * so `?period=all` falls back to the default. Every column sorts (R-9), and
 * the initial order is the activity code, as the API sends it. Each column
 * has its filter as `f.<key>` (FR-023); changing one goes back to page 1.
 */
export const MATRIX_LIST_CONFIG: ListStateConfig<
  MatrixColumnKey,
  'period' | MatrixFilterKey
> = {
  sortKeys: MATRIX_COLUMN_KEYS,
  defaultSort: { key: 'code', dir: 'asc' },
  filters: { period: isPeriodIdValue, ...COLUMN_FILTERS },
}

/**
 * Every column filter empty, keeping the period: "limpar" removes the
 * filters, never the slice (R-10).
 */
export function clearedMatrixFilters(period: string) {
  const filters = { period } as Record<'period' | MatrixFilterKey, string>
  for (const column of MATRIX_COLUMNS) {
    filters[matrixFilterKey(column.key)] = ''
  }
  return filters
}

/** A blank text filter filters nothing, like a blank search. */
export function isMatrixFilterActive(value: string) {
  return normalizeText(value) !== ''
}

/** The columns with an active filter, hidden ones included. */
export function getFilteredMatrixColumns(
  filters: Record<MatrixFilterKey, string>
): ReadonlySet<MatrixColumnKey> {
  return new Set(
    MATRIX_COLUMN_KEYS.filter((key) =>
      isMatrixFilterActive(filters[matrixFilterKey(key)])
    )
  )
}

/**
 * The normalized term of an exact text filter: a value between double quotes
 * (FR-016). Empty quotes, a lone quote or no quotes are not exact and stay
 * "contains"; quotes inside the value are part of the term.
 */
function getExactTerm(filter: string) {
  const trimmed = filter.trim()
  if (trimmed.length < 2 || !trimmed.startsWith('"') || !trimmed.endsWith('"'))
    return null

  const term = normalizeText(trimmed.slice(1, -1))
  return term === '' ? null : term
}

/** The text filter that keeps only the cells equal to `value` (FR-016). */
export function exactMatrixTextFilter(value: string) {
  return `"${value}"`
}

/**
 * Every active column filter must match, visible or hidden. A list filter
 * compares the stored value ("empty" keeps the empty cells); a text filter
 * looks for the term in the cell, ignoring case and accents, as the search,
 * or, between double quotes, compares the whole cell the same way.
 */
export function matchesMatrixColumnFilters(
  row: MatrixRow,
  filters: Record<MatrixFilterKey, string>
) {
  return MATRIX_COLUMNS.every((column) => {
    const filter = filters[matrixFilterKey(column.key)]
    if (!isMatrixFilterActive(filter)) return true

    const raw = getMatrixRawValue(row, column)
    if (column.type === 'text') {
      const exactTerm = getExactTerm(filter)
      return exactTerm === null
        ? matchesSearch(filter, [raw])
        : normalizeText(raw) === exactTerm
    }

    return filter === MATRIX_EMPTY_FILTER ? raw === null : raw === filter
  })
}

/**
 * List columns sort by their translated label, so they order the way the user
 * reads them; text columns sort by the text.
 */
export function getMatrixSortColumns(
  labels: MatrixValueLabels
): SortColumns<MatrixRow, MatrixColumnKey> {
  return Object.fromEntries(
    MATRIX_COLUMNS.map((column) => [
      column.key,
      {
        type: column.type === 'text' ? 'text' : 'status',
        getValue: (row: MatrixRow) =>
          getMatrixDisplayValue(row, column, labels),
      },
    ])
  ) as SortColumns<MatrixRow, MatrixColumnKey>
}

/**
 * The search looks at all 27 columns, the hidden ones included (FR-021), and
 * at the list values as they are shown, ignoring case and accents.
 */
export function matchesMatrixSearch(
  row: MatrixRow,
  search: string,
  labels: MatrixValueLabels
) {
  return matchesSearch(
    search,
    MATRIX_COLUMNS.map((column) => getMatrixDisplayValue(row, column, labels))
  )
}
