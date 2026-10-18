import {
  isPeriodFilterValue,
  type ListStateConfig,
  matchesSearch,
  type SortColumns,
} from '@/components/list'
import { type Meeting, MeetingType } from '@/http/api'
import type { MeetingAttachmentKey } from '@/lib/download-file'

import type { MeetingFilterKey, MeetingSortKey } from './types'

/** The three fixed types, in the order of the legacy cards (R-2). */
export const MEETING_TYPES = [
  MeetingType['comite-ergonomia'],
  MeetingType.projetos,
  MeetingType['diversas-areas'],
] as const

/**
 * The two attachments in display order, each with its label key in the
 * `meetings` namespace. The row and the detail list them the same way.
 */
export const MEETING_ATTACHMENTS = [
  { key: 'presence-list', label: 'attachments.presence-list' },
  { key: 'minutes', label: 'attachments.minutes' },
] as const satisfies readonly { key: MeetingAttachmentKey; label: string }[]

// Opens sorted by date, newest first, like `GET /meetings` (R-9, D-7). The
// period filter has no fixed values, so it takes a validator; whether the id
// still exists is checked by `usePeriodSlice` against the loaded periods.
export const MEETING_LIST_CONFIG: ListStateConfig<
  MeetingSortKey,
  MeetingFilterKey
> = {
  sortKeys: ['type', 'name', 'responsible', 'date', 'status'],
  defaultSort: { key: 'date', dir: 'desc' },
  filters: { type: MEETING_TYPES, period: isPeriodFilterValue },
}

/** Translates a type into the label shown in the interface. */
export type MeetingTypeLabel = (type: MeetingType) => string

/**
 * Type sorts by its translated label, so the column orders the way the user
 * reads it — and therefore changes with the language, on purpose.
 *
 * `date` is `YYYY-MM-DD`, which sorts as text in calendar order with no time
 * zone involved.
 */
export function getMeetingSortColumns(
  typeLabel: MeetingTypeLabel
): SortColumns<Meeting, MeetingSortKey> {
  return {
    type: { type: 'text', getValue: (record) => typeLabel(record.type) },
    name: { type: 'text', getValue: (record) => record.name },
    responsible: { type: 'text', getValue: (record) => record.responsible },
    date: { type: 'text', getValue: (record) => record.date },
    status: { type: 'text', getValue: (record) => record.status },
  }
}

/**
 * Single search over the type label, the name, the responsible and the status
 * (FR-023), using the same label the type column sorts by.
 */
export function matchesMeetingSearch(
  record: Meeting,
  search: string,
  typeLabel: MeetingTypeLabel
) {
  return matchesSearch(search, [
    typeLabel(record.type),
    record.name,
    record.responsible,
    record.status,
  ])
}
