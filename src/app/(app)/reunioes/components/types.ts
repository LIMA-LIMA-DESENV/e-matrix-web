export type MeetingSortKey = 'type' | 'name' | 'responsible' | 'date' | 'status'

/**
 * `?type=<slug>` and `?period=<id>|all` (D-14, D-12). A missing `period`
 * means "not chosen yet", which makes the screen apply its default.
 */
export type MeetingFilterKey = 'type' | 'period'
