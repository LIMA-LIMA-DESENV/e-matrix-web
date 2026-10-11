export type DocumentSortKey =
  | 'material'
  | 'name'
  | 'responsible'
  | 'date'
  | 'created_at'
  | 'updated_at'

/** The only list filter: `?material=e-social|docs` (D-17). */
export type DocumentFilterKey = 'material'
