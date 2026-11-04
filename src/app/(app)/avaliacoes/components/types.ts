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
 * and the Avaliação de Mudanças / Projetos have no name of their own, so the
 * screen gives them the translated type; the Coleta de Dados In Loco has the
 * `name` of the record.
 */
export interface EvaluationRow {
  id: string
  number: number
  /** `HL-<n>`, `CDIA-<n>` or `AMP-<n>`, as the API derives it. */
  code: string
  type: EvaluationType
  name: string
  activity: ImprovementProjectActivity
  created_at: string
  updated_at: string
}
