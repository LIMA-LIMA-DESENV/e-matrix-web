import {
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import type { Period } from '@/http/api'

import type { PeriodSortKey } from './types'

export const PERIOD_LIST_CONFIG: ListStateConfig<PeriodSortKey> = {
  sortKeys: ['description', 'start_date', 'end_date', 'created_at'],
  defaultSort: { key: 'start_date', dir: 'asc' },
}

// `YYYY-MM-DD` sorts as text in calendar order, with no time zone involved.
export const periodSortColumns: SortColumns<Period, PeriodSortKey> = {
  description: { type: 'text', getValue: (period) => period.description },
  start_date: { type: 'text', getValue: (period) => period.start_date },
  end_date: { type: 'text', getValue: (period) => period.end_date },
  created_at: { type: 'date', getValue: (period) => period.created_at },
}

/** Search by description. */
export function matchesPeriodSearch(period: Period, search: string) {
  return matchesSearch(search, [period.description])
}
