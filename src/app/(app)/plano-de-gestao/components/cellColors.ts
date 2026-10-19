import type { ManagementPlanCellState } from '@/http/api'

/**
 * Classes of each cell state: `cell` for the full grid, where the fixed text
 * sits on the state color, and `square` for the mini-grid. The legacy used
 * Bootstrap's default/success/warning/danger; the greens and ambers are the
 * same ones `Badge` uses for success and warning.
 */
export const CELL_STATE_CLASSES: Record<
  ManagementPlanCellState,
  { cell: string; square: string }
> = {
  not_evaluated: {
    cell: 'bg-surface-container-high text-on-surface-variant',
    square: 'bg-outline-variant',
  },
  green: {
    cell: 'bg-emerald-200 text-emerald-950',
    square: 'bg-emerald-500',
  },
  yellow: {
    cell: 'bg-amber-200 text-amber-950',
    square: 'bg-amber-400',
  },
  red: {
    cell: 'bg-error-container text-on-error-container',
    square: 'bg-error',
  },
}
