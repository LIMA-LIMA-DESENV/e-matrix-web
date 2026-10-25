import {
  isPeriodFilterValue,
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import type {
  ImprovementProject,
  ImprovementProjectActivity,
  MaterialReceipt,
} from '@/http/api'
import type { ImprovementProjectPhotoKey } from '@/lib/download-file'

import type {
  OfficeFilterKey,
  OfficeRow,
  OfficeSortKey,
  OfficeType,
  ProductionFilterKey,
  ProductionSortKey,
} from './types'

/**
 * The two photos in display order, each with its label key in the `projects`
 * namespace.
 */
export const IMPROVEMENT_PROJECT_PHOTOS = [
  { key: 'before-photo', label: 'photos.before-photo' },
  { key: 'after-photo', label: 'photos.after-photo' },
] as const satisfies readonly {
  key: ImprovementProjectPhotoKey
  label: string
}[]

// Opens sorted by date, newest first, like `GET /improvement-projects`
// (FR-032). A tie keeps the API order, which is the largest number first. The
// period filter has no fixed values, so it takes a validator; whether the id
// still exists is checked by `usePeriodSlice` against the loaded periods.
export const PRODUCTION_LIST_CONFIG: ListStateConfig<
  ProductionSortKey,
  ProductionFilterKey
> = {
  sortKeys: ['code', 'date', 'activity', 'concern', 'priority'],
  defaultSort: { key: 'date', dir: 'desc' },
  filters: { period: isPeriodFilterValue },
}

/** The activity as the listing and the detail show it: `código — nome`. */
export function formatProjectActivity(activity: ImprovementProjectActivity) {
  return `${activity.code} — ${activity.name}`
}

/**
 * Code sorts by its number, so `RGP-10` comes after `RGP-9`. `date` is
 * `YYYY-MM-DD`, which sorts as text in calendar order with no time zone
 * involved.
 */
export const PRODUCTION_SORT_COLUMNS: SortColumns<
  ImprovementProject,
  ProductionSortKey
> = {
  code: { type: 'number', getValue: (record) => record.number },
  date: { type: 'text', getValue: (record) => record.date },
  activity: {
    type: 'text',
    getValue: (record) => formatProjectActivity(record.activity),
  },
  concern: { type: 'text', getValue: (record) => record.concern },
  priority: { type: 'text', getValue: (record) => record.priority },
}

/**
 * Single search over the code, the activity (code and name), the concern and
 * the priority, ignoring case and accents like the other listings (FR-032):
 * `rgp-12` finds `RGP-12`.
 */
export function matchesImprovementProjectSearch(
  record: ImprovementProject,
  search: string
) {
  return matchesSearch(search, [
    record.code,
    formatProjectActivity(record.activity),
    record.concern,
    record.priority,
  ])
}

/** The types of the Escritório tab, in the order of the legacy cards. */
export const OFFICE_TYPES = [
  'rga',
  'ra',
] as const satisfies readonly OfficeType[]

/** `?type=` value that lists both types, like a missing `type`. */
export const ALL_OFFICE_TYPES = 'all'

// Opens sorted by date, newest first, like Produção. The rows of the two
// queries are merged by `toOfficeRows`, whose order breaks the ties.
export const OFFICE_LIST_CONFIG: ListStateConfig<
  OfficeSortKey,
  OfficeFilterKey
> = {
  sortKeys: [
    'code',
    'type',
    'date',
    'activity',
    'concern',
    'priority',
    'employee',
    'employeeRegistry',
  ],
  defaultSort: { key: 'date', dir: 'desc' },
  filters: {
    period: isPeriodFilterValue,
    type: [ALL_OFFICE_TYPES, ...OFFICE_TYPES],
  },
}

/**
 * The RGA and the RA of the slice as one list (D-14), newest date first and
 * then the largest number, the order each API already uses on its own.
 */
export function toOfficeRows(
  projects: ImprovementProject[],
  receipts: MaterialReceipt[]
): OfficeRow[] {
  const rows: OfficeRow[] = [
    ...projects.map(
      (record): OfficeRow => ({ type: 'rga', key: `rga:${record.id}`, record })
    ),
    ...receipts.map(
      (record): OfficeRow => ({ type: 'ra', key: `ra:${record.id}`, record })
    ),
  ]

  return rows.sort(
    (a, b) =>
      b.record.date.localeCompare(a.record.date) ||
      b.record.number - a.record.number
  )
}

/**
 * The columns that do not apply to a type are empty, and an empty value
 * always sorts last. Code sorts by type and then by its number, so `RA-10`
 * comes after `RA-9`.
 */
export const OFFICE_SORT_COLUMNS: SortColumns<OfficeRow, OfficeSortKey> = {
  code: {
    type: 'text',
    getValue: (row) =>
      `${row.type}-${String(row.record.number).padStart(10, '0')}`,
  },
  type: { type: 'text', getValue: (row) => row.type },
  date: { type: 'text', getValue: (row) => row.record.date },
  activity: {
    type: 'text',
    getValue: (row) =>
      row.type === 'rga' ? formatProjectActivity(row.record.activity) : null,
  },
  concern: {
    type: 'text',
    getValue: (row) => (row.type === 'rga' ? row.record.concern : null),
  },
  priority: {
    type: 'text',
    getValue: (row) => (row.type === 'rga' ? row.record.priority : null),
  },
  employee: {
    type: 'text',
    getValue: (row) => (row.type === 'ra' ? row.record.employee : null),
  },
  employeeRegistry: {
    type: 'text',
    getValue: (row) =>
      row.type === 'ra' ? row.record.employee_registry : null,
  },
}

/** Whether a row is of the `?type=` chosen; empty or `all` keeps both. */
export function matchesOfficeType(row: OfficeRow, type: string) {
  return !type || type === ALL_OFFICE_TYPES || row.type === type
}

/**
 * Single search over the code, the type labels (`typeLabels`, translated by
 * the screen), the activity, the concern, the priority, the employee and the
 * employee registry, ignoring case and accents (FR-033): `ra-7` finds `RA-7`.
 */
export function matchesOfficeSearch(
  row: OfficeRow,
  search: string,
  typeLabels: Record<OfficeType, readonly string[]>
) {
  const fields =
    row.type === 'rga'
      ? [
          formatProjectActivity(row.record.activity),
          row.record.concern,
          row.record.priority,
        ]
      : [row.record.employee, row.record.employee_registry]

  return matchesSearch(search, [
    row.record.code,
    ...typeLabels[row.type],
    ...fields,
  ])
}
