import { normalizeText } from '@/components/list/list-utils'
import type {
  MatrixProjectStatus,
  MatrixRiskLevel,
  MatrixRow,
  MatrixValues,
} from '@/http/api'

import type { MatrixColumnKey, MatrixValueLabels } from './columns'
import { exactMatrixTextFilter, matrixFilterKey } from './listing'

/** The token of a slice color (`--color-chart-<color>`, D-6). */
export type MatrixChartColor = 'high' | 'medium' | 'low'

interface MatrixChartSlice<TValue extends string> {
  value: TValue
  color: MatrixChartColor
}

const RISK_SLICES: readonly MatrixChartSlice<MatrixRiskLevel>[] = [
  { value: 'high', color: 'high' },
  { value: 'medium', color: 'medium' },
  { value: 'low', color: 'low' },
]

const PROJECT_SLICES: readonly MatrixChartSlice<MatrixProjectStatus>[] = [
  { value: 'open', color: 'high' },
  { value: 'closed', color: 'low' },
]

/**
 * A map of the Charts tab: the Matrix field it counts, which list of
 * `matrix.values.*` labels its slices, and its slices, in the legacy order
 * and colors.
 */
export type MatrixChartMap =
  | {
      key: 'risks' | 'postProjectRisks'
      field: 'risk_score' | 'post_project_risk'
      labels: 'riskLevel'
      slices: readonly MatrixChartSlice<MatrixRiskLevel>[]
    }
  | {
      key: 'projects'
      field: 'project_status'
      labels: 'projectStatus'
      slices: readonly MatrixChartSlice<MatrixProjectStatus>[]
    }

/**
 * The three maps, the only source of field, slices, order and colors
 * (FR-005): "Aberto" takes the high color and "Fechado" the low one.
 */
export const MATRIX_CHART_MAPS: readonly MatrixChartMap[] = [
  {
    key: 'risks',
    field: 'risk_score',
    labels: 'riskLevel',
    slices: RISK_SLICES,
  },
  {
    key: 'projects',
    field: 'project_status',
    labels: 'projectStatus',
    slices: PROJECT_SLICES,
  },
  {
    key: 'postProjectRisks',
    field: 'post_project_risk',
    labels: 'riskLevel',
    slices: RISK_SLICES,
  },
]

export interface MatrixChartSliceCount {
  value: string
  color: MatrixChartColor
  count: number
  /** Over the activities with a value, rounded as in the legacy (FR-008). */
  percent: number
}

/** The count of one map over a set of rows (FR-006). */
export interface MatrixChartCount {
  /** Every slice of the map, in its order, including the ones with 0. */
  slices: MatrixChartSliceCount[]
  /** Σ of the slices: the activities with a value in the field. */
  withValue: number
  /** The activities with the field empty, out of every slice (R-7). */
  withoutValue: number
  /** `M`: every row of the set, so `withValue + withoutValue = total`. */
  total: number
}

/** The translated label of a slice of a map (`matrix.values.*`, FR-009). */
export function getMatrixChartSliceLabel(
  map: MatrixChartMap,
  value: string,
  labels: MatrixValueLabels
) {
  return map.labels === 'riskLevel'
    ? labels.riskLevel(value as MatrixRiskLevel)
    : labels.projectStatus(value as MatrixProjectStatus)
}

/** `Math.floor(count / sum × 100 + 0.5)`, as the legacy; 0 with no value. */
export function chartPercent(count: number, sum: number) {
  return sum === 0 ? 0 : Math.floor((count / sum) * 100 + 0.5)
}

/**
 * Counts a map over a set of rows (the whole Matrix or a group). A
 * row enters a slice when `values[field]` is the slice value and "without
 * value" when it is `null`; an activity with no item of the period already
 * comes with `null` (R-6).
 */
export function countMatrixChart(
  rows: readonly MatrixRow[],
  map: MatrixChartMap
): MatrixChartCount {
  const counts = new Map<string, number>()
  let withoutValue = 0

  for (const row of rows) {
    const value: MatrixValues[typeof map.field] = row.values[map.field]
    if (value === null) {
      withoutValue += 1
      continue
    }
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const sliceCounts = map.slices.map(({ value, color }) => ({
    value,
    color,
    count: counts.get(value) ?? 0,
  }))
  const withValue = sliceCounts.reduce((sum, { count }) => sum + count, 0)

  return {
    slices: sliceCounts.map((slice) => ({
      ...slice,
      percent: chartPercent(slice.count, withValue),
    })),
    withValue,
    withoutValue,
    total: rows.length,
  }
}

/** The activity columns the groups view breaks each map by, in its order. */
export const MATRIX_CHART_GROUP_COLUMNS = [
  'fabric',
  'area',
  'function',
] as const

export type MatrixChartGroupColumn = (typeof MATRIX_CHART_GROUP_COLUMNS)[number]

/** One group of a column: the activities sharing a fabric, area or function. */
export interface MatrixChartGroup {
  /** `normalizeText` of the value, the same comparison as the filters (D-5). */
  key: string
  /** The first spelling of the group in the order of `rows`. */
  label: string
  count: MatrixChartCount
}

/**
 * Breaks a map by one activity column (FR-012): the rows are grouped by
 * `normalizeText`, so "Solda" and "solda " are one group, labeled with the
 * first spelling in the order of `rows` (by code), and sorted by the label
 * without case. Every group comes, also the ones with no value in the field,
 * so the `total` of the groups adds up to the whole Matrix (§9); the screen
 * hides the ones with nothing to chart (FR-013).
 */
export function groupMatrixChart(
  rows: readonly MatrixRow[],
  map: MatrixChartMap,
  column: MatrixChartGroupColumn
): MatrixChartGroup[] {
  const groups = new Map<string, { label: string; rows: MatrixRow[] }>()

  for (const row of rows) {
    const value = row.activity[column]
    const key = normalizeText(value)
    const group = groups.get(key)
    if (group) {
      group.rows.push(row)
    } else {
      groups.set(key, { label: value.trim(), rows: [row] })
    }
  }

  return [...groups]
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: countMatrixChart(group.rows, map),
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    )
}

/** The group of a group pie, for the target of its slices. */
export interface MatrixChartSliceGroup {
  column: MatrixChartGroupColumn
  label: string
}

/** Where a slice leads: the Resultados URL and the columns it must show. */
export interface MatrixChartSliceTarget {
  href: string
  columns: MatrixColumnKey[]
}

/**
 * The Resultados of the same period filtered to exactly the activities of a
 * slice (FR-015, FR-018): the existing list filter `f.<field>=<value>` and,
 * on a group pie, the group column as an exact text filter between quotes,
 * which compares with `normalizeText` as the groups do (FR-016, H-1). No
 * search, sort or page, so the table opens on page 1. The columns are the
 * field and the group one, to reveal before navigating (FR-017).
 */
export function getMatrixChartSliceTarget(
  periodId: string,
  map: MatrixChartMap,
  value: string,
  group?: MatrixChartSliceGroup
): MatrixChartSliceTarget {
  const params = new URLSearchParams({ period: periodId })
  params.set(matrixFilterKey(map.field), value)
  const columns: MatrixColumnKey[] = [map.field]

  if (group) {
    params.set(
      matrixFilterKey(group.column),
      exactMatrixTextFilter(group.label)
    )
    columns.push(group.column)
  }

  return { href: `/matriz?${params}`, columns }
}
