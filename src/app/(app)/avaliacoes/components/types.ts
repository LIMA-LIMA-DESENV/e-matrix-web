import type { ImprovementProjectActivity } from '@/http/api'
import type { EvaluationType } from '@/lib/evaluation-types'

export type EvaluationSortKey =
  | 'code'
  | 'type'
  | 'name'
  | 'activity'
  | 'createdAt'
  | 'updatedAt'

/**
 * One row of the listing of a type (R-7), whatever the type: the Hit List
 * has no name of its own, so the screen gives it the translated "Hit List";
 * the Coleta de Dados In Loco has the `name` of the record.
 */
export interface EvaluationRow {
  id: string
  number: number
  /** `HL-<n>` or `CDIA-<n>`, as the API derives it. */
  code: string
  type: EvaluationType
  name: string
  activity: ImprovementProjectActivity
  created_at: string
  updated_at: string
}
