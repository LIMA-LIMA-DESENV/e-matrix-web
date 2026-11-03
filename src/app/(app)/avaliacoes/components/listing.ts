import {
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import type { ImprovementProjectActivity } from '@/http/api'

import type { EvaluationRow, EvaluationSortKey } from './types'

// Opens sorted by "registrada em", newest first, like `GET /evaluations/...`
// (FR-012, R-9); a tie keeps the API order, the largest number first. There is
// no period filter: the listing is global (R-6).
export const EVALUATION_LIST_CONFIG: ListStateConfig<EvaluationSortKey> = {
  sortKeys: ['code', 'type', 'name', 'activity', 'createdAt', 'updatedAt'],
  defaultSort: { key: 'createdAt', dir: 'desc' },
}

/** The activity as the listing shows it: `código — nome`. */
export function formatEvaluationActivity(activity: ImprovementProjectActivity) {
  return `${activity.code} — ${activity.name}`
}

/**
 * `typeLabel` is the translated type, the text of the "Tipo" column. Code
 * sorts by its number, so `HL-10` comes after `HL-9`.
 */
export function evaluationSortColumns(
  typeLabel: string
): SortColumns<EvaluationRow, EvaluationSortKey> {
  return {
    code: { type: 'number', getValue: (row) => row.number },
    type: { type: 'text', getValue: () => typeLabel },
    name: { type: 'text', getValue: (row) => row.name },
    activity: {
      type: 'text',
      getValue: (row) => formatEvaluationActivity(row.activity),
    },
    createdAt: { type: 'date', getValue: (row) => row.created_at },
    updatedAt: { type: 'date', getValue: (row) => row.updated_at },
  }
}

/**
 * Single search over the code, the type, the name and the activity (code and
 * name), ignoring case and accents like the other listings: `hl-3` finds
 * `HL-3`.
 */
export function matchesEvaluationSearch(
  row: EvaluationRow,
  search: string,
  typeLabel: string
) {
  return matchesSearch(search, [
    row.code,
    typeLabel,
    row.name,
    formatEvaluationActivity(row.activity),
  ])
}
