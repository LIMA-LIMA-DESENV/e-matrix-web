import type {
  ImprovementProject,
  ImprovementProjectScope,
  MaterialReceipt,
} from '@/http/api'

export type ProductionSortKey =
  | 'code'
  | 'date'
  | 'activity'
  | 'concern'
  | 'priority'

/**
 * `?period=<id>|all` (FR-034). A missing `period` means "not chosen yet",
 * which makes the screen apply its default.
 */
export type ProductionFilterKey = 'period'

/** The three record types, by the prefix of their code (H-2). */
export type ProjectType = 'rgp' | 'rga' | 'ra'

/** The two record types of the Escritório tab. */
export type OfficeType = Extract<ProjectType, 'rga' | 'ra'>

export type OfficeSortKey =
  | 'code'
  | 'type'
  | 'date'
  | 'activity'
  | 'concern'
  | 'priority'
  | 'employee'
  | 'employeeRegistry'

/**
 * `?period=<id>|all` as in Produção, plus `?type=all|rga|ra` (FR-033); a
 * missing `type` lists both.
 */
export type OfficeFilterKey = 'period' | 'type'

/**
 * One row of the Escritório table: an RGA or an RA, told apart by `type`
 * (D-14). `key` includes the type, so ids of the two tables never collide.
 */
export type OfficeRow =
  | { type: 'rga'; key: string; record: ImprovementProject }
  | { type: 'ra'; key: string; record: MaterialReceipt }

/** The project register type of each scope. */
export const SCOPE_TYPES = {
  production: 'rgp',
  office: 'rga',
} as const satisfies Record<ImprovementProjectScope, ProjectType>
