export const LIST_PAGE_SIZE = 20

export type SortDirection = 'asc' | 'desc'

export interface ListSort<K extends string = string> {
  key: K
  dir: SortDirection
}

type SortableValue = string | number | null | undefined

const DIACRITICS = /[\u0300-\u036f]/g

/**
 * Lowercases and strips diacritics, without trimming. `HighlightText` folds
 * char by char with it to map matches back to the original text.
 */
export function foldText(value: string) {
  return value.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
}

/**
 * Lowercases, trims and strips diacritics so searches ignore case and accents.
 */
export function normalizeText(value?: string | number | null) {
  return foldText(String(value ?? '').trim())
}

/**
 * True when the normalized term is contained in any of the given values.
 * An empty term matches everything.
 */
export function matchesSearch(term: string, values: SortableValue[]) {
  const normalizedTerm = normalizeText(term)

  if (!normalizedTerm) return true

  return values.some((value) => normalizeText(value).includes(normalizedTerm))
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * `status` columns must return the label shown in the badge, so they sort the
 * same way users read them.
 */
export type SortValueType = 'text' | 'number' | 'date' | 'status'

export interface SortColumn<T> {
  type: SortValueType
  getValue: (item: T) => SortableValue
}

export type SortColumns<T, K extends string> = Record<K, SortColumn<T>>

const textCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

function toComparable(type: SortValueType, value: SortableValue) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && !value.trim()) return null

  if (type === 'number') {
    const number = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? number : null
  }

  if (type === 'date') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }

  const text = String(value).trim()
  return text ? text : null
}

/**
 * Compares two items by one column. Empty values always go last, regardless
 * of the direction.
 */
function compareByColumn<T>(
  column: SortColumn<T>,
  dir: SortDirection,
  a: T,
  b: T
) {
  const aValue = toComparable(column.type, column.getValue(a))
  const bValue = toComparable(column.type, column.getValue(b))

  if (aValue === null && bValue === null) return 0
  if (aValue === null) return 1
  if (bValue === null) return -1

  const result =
    typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : textCollator.compare(String(aValue), String(bValue))

  return dir === 'asc' ? result : -result
}

/**
 * Returns a sorted copy. Ties are broken by the screen's default sort, and
 * then by the original order (Array#sort is stable).
 */
export function sortItems<T, K extends string>(
  items: T[],
  columns: SortColumns<T, K>,
  sort: ListSort<K>,
  defaultSort: ListSort<K>
) {
  const column = columns[sort.key] ?? columns[defaultSort.key]
  const defaultColumn = columns[defaultSort.key]

  return [...items].sort(
    (a, b) =>
      compareByColumn(column, sort.dir, a, b) ||
      compareByColumn(defaultColumn, defaultSort.dir, a, b)
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedList<T> {
  items: T[]
  /** Current page, clamped to `1..pageCount`. */
  page: number
  pageCount: number
  /** Total after search and filters. */
  total: number
  /** 1-based index of the first visible item (0 when empty). */
  start: number
  /** 1-based index of the last visible item (0 when empty). */
  end: number
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = LIST_PAGE_SIZE
): PaginatedList<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const requested = Number.isInteger(page) ? page : 1
  const currentPage = Math.min(Math.max(requested, 1), pageCount)
  const offset = (currentPage - 1) * pageSize

  return {
    items: items.slice(offset, offset + pageSize),
    page: currentPage,
    pageCount,
    total,
    start: total === 0 ? 0 : offset + 1,
    end: Math.min(offset + pageSize, total),
  }
}

// ---------------------------------------------------------------------------
// Period filter
// ---------------------------------------------------------------------------

/**
 * Period filter shared by list screens: `30d`, `month` or `quarter`.
 * Without a period, or without a valid date, the item is kept.
 */
export function isWithinPeriod(date?: string | null, period?: string | null) {
  if (!period || !date) return true

  const dateValue = new Date(date)
  if (Number.isNaN(dateValue.getTime())) return true

  const now = new Date()

  if (period === '30d') {
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    return dateValue >= thirtyDaysAgo
  }

  if (period === 'month') {
    return (
      dateValue.getMonth() === now.getMonth() &&
      dateValue.getFullYear() === now.getFullYear()
    )
  }

  if (period === 'quarter') {
    return (
      Math.floor(dateValue.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
      dateValue.getFullYear() === now.getFullYear()
    )
  }

  return true
}
