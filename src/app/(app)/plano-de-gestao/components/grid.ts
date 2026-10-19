import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import {
  type ManagementPlan,
  type ManagementPlanCellState,
  ManagementPlanEvaluatedRow,
} from '@/http/api'

export type ManagementPlanRow = keyof ManagementPlan['rows']

/**
 * Whether the row is evaluated cell by cell; inputs and outputs are derived
 * by the API and never clicked (FR-004).
 */
export function isEvaluatedRow(
  row: ManagementPlanRow
): row is ManagementPlanEvaluatedRow {
  return row in ManagementPlanEvaluatedRow
}

/** Highest goal, the same as the highest score (FR-010). */
export const MAX_MANAGEMENT_PLAN_GOAL = 16

/**
 * The six rows of the grid, in the legacy order (FR-002): the two derived
 * ones first, then the four evaluated ones. The API sends their states and
 * the score already computed; nothing is recalculated here (NFR-005).
 */
export const MANAGEMENT_PLAN_ROWS = [
  'inputs',
  'outputs',
  'educational',
  'clinical',
  'projects',
  'management',
] as const satisfies readonly ManagementPlanRow[]

/** Levels 1 to 4; position `i` of each row is level `i + 1`. */
export const MANAGEMENT_PLAN_LEVELS = ['1', '2', '3', '4'] as const

/**
 * `aria-label` of a cell or mini-grid square: row, level and state, so the
 * state is never told by the color alone (NFR-009).
 */
export function useCellLabel() {
  const t = useTranslations('managementPlan')

  return useCallback(
    (
      row: ManagementPlanRow,
      levelIndex: number,
      state: ManagementPlanCellState
    ) =>
      t('cellLabel', {
        row: t(`rows.${row}`),
        level: t('level', { level: levelIndex + 1 }),
        state: t(`states.${state}`),
      }),
    [t]
  )
}
