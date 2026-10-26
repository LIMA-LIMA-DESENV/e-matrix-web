import { useCallback, useMemo, useSyncExternalStore } from 'react'

import {
  DEFAULT_MATRIX_COLUMNS,
  MATRIX_COLUMN_KEYS,
  MATRIX_COLUMNS,
  type MatrixColumnKey,
} from './columns'

/** The visible columns, as a JSON list of keys (FR-022). */
const STORAGE_KEY = 'ematrix.matrix.columns'

// Reading or writing the storage may throw (private windows, blocked site
// data, quota). From then on the choice lives only in memory, for this page,
// and the screen keeps working with the default columns as its start.
let isStorageUnavailable = false
let memoryValue: string | null = null
const listeners = new Set<() => void>()

function readStoredValue(): string | null {
  if (isStorageUnavailable) return memoryValue

  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    isStorageUnavailable = true
    return memoryValue
  }
}

function writeStoredValue(value: string | null) {
  memoryValue = value

  if (!isStorageUnavailable) {
    try {
      if (value === null) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      isStorageUnavailable = true
    }
  }

  for (const listener of listeners) listener()
}

/** Changes made here and in the other tabs of the same browser. */
function subscribe(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) onChange()
  }

  listeners.add(onChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', handleStorage)
  }
}

// The server has no storage: it renders the default columns.
function getServerSnapshot() {
  return null
}

/**
 * The stored keys, unknown ones dropped. Anything else invalid, or no key
 * left, means the default columns.
 */
function parseStoredKeys(raw: string | null): ReadonlySet<string> | null {
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null

  const known: readonly string[] = MATRIX_COLUMN_KEYS
  const keys = parsed.filter(
    (key): key is string => typeof key === 'string' && known.includes(key)
  )

  return keys.length > 0 ? new Set(keys) : null
}

function storeKeys(keys: ReadonlySet<string>) {
  writeStoredValue(
    JSON.stringify(MATRIX_COLUMN_KEYS.filter((key) => keys.has(key)))
  )
}

/**
 * Adds columns to the visible ones, hiding none (FR-017): the default ones
 * plus `keys` when the choice is the default. Outside React, so it can run
 * right before a navigation; with no storage, the choice stays in memory.
 */
export function revealMatrixColumns(keys: readonly MatrixColumnKey[]) {
  const visible = new Set(
    parseStoredKeys(readStoredValue()) ??
      DEFAULT_MATRIX_COLUMNS.map(({ key }) => key)
  )
  if (keys.every((key) => visible.has(key))) return

  for (const key of keys) visible.add(key)
  storeKeys(visible)
}

/**
 * The columns the user chose to see, remembered in this browser (R-10). The
 * visible columns always follow the order of `columns.ts`, which is also the
 * order of the export.
 */
export function useMatrixColumns() {
  const raw = useSyncExternalStore(
    subscribe,
    readStoredValue,
    getServerSnapshot
  )

  const visibleColumns = useMemo(() => {
    const stored = parseStoredKeys(raw)

    return stored
      ? MATRIX_COLUMNS.filter(({ key }) => stored.has(key))
      : DEFAULT_MATRIX_COLUMNS
  }, [raw])

  const visibleKeys = useMemo(
    () => new Set(visibleColumns.map(({ key }) => key)),
    [visibleColumns]
  )

  const isDefaultSelection =
    visibleColumns.length === DEFAULT_MATRIX_COLUMNS.length &&
    visibleColumns.every(({ isDefault }) => isDefault)

  /** The last visible column cannot be hidden: the table needs one. */
  const toggleColumn = useCallback(
    (key: MatrixColumnKey) => {
      const next = new Set(visibleKeys)

      if (next.has(key)) {
        if (next.size === 1) return
        next.delete(key)
      } else {
        next.add(key)
      }

      storeKeys(next)
    },
    [visibleKeys]
  )

  const showAllColumns = useCallback(() => {
    storeKeys(new Set(MATRIX_COLUMN_KEYS))
  }, [])

  /** Back to the default columns ("limpar"). */
  const resetColumns = useCallback(() => {
    writeStoredValue(null)
  }, [])

  return {
    visibleColumns,
    visibleKeys,
    isDefaultSelection,
    toggleColumn,
    showAllColumns,
    resetColumns,
  }
}
