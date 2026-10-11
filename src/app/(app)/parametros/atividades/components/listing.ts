import {
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import type { Activity } from '@/http/api'

import type { ActivitySortKey } from './types'

// Opens sorted by name, A→Z, like the legacy listing and `GET /activities`.
export const ACTIVITY_LIST_CONFIG: ListStateConfig<ActivitySortKey> = {
  sortKeys: ['code', 'name', 'fabric', 'line', 'area', 'function'],
  defaultSort: { key: 'name', dir: 'asc' },
}

export const activitySortColumns: SortColumns<Activity, ActivitySortKey> = {
  code: { type: 'text', getValue: (activity) => activity.code },
  name: { type: 'text', getValue: (activity) => activity.name },
  fabric: { type: 'text', getValue: (activity) => activity.fabric },
  line: { type: 'text', getValue: (activity) => activity.line },
  area: { type: 'text', getValue: (activity) => activity.area },
  // `function` is fine as a property; it may not be a variable name.
  function: { type: 'text', getValue: (activity) => activity.function },
}

/** Single search over the six columns, as the legacy table did. */
export function matchesActivitySearch(activity: Activity, search: string) {
  return matchesSearch(search, [
    activity.code,
    activity.name,
    activity.fabric,
    activity.line,
    activity.area,
    activity.function,
  ])
}
