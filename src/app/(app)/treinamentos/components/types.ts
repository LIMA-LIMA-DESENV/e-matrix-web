export type TrainingSortKey =
  | 'content'
  | 'name'
  | 'responsible'
  | 'date'
  | 'status'

/**
 * `?content=<slug>` and `?period=<id>|all` (D-17). A missing `period` means
 * "not chosen yet", which makes the screen apply its default.
 */
export type TrainingFilterKey = 'content' | 'period'
