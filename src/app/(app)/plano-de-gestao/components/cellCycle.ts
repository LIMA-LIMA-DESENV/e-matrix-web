import type {
  ManagementPlanCellState,
  ManagementPlanEvaluatedRow,
  ManagementPlanRows,
} from '@/http/api'

/**
 * State a click moves an evaluated cell to (FR-006), from the plan as saved.
 * The API only checks the green rule (FR-007); the cycle lives here.
 *
 * - Every cell on the left green (or level 1):
 *   not_evaluated → green → yellow → red → not_evaluated.
 * - Some cell on the left not green: green is skipped,
 *   not_evaluated → yellow → red → not_evaluated.
 * - The cell is green but a cell on its left was demoted afterwards (demoting
 *   keeps the greens on the right, R-6): the next state is yellow, as from
 *   any green.
 *
 * `levelIndex` is the position in the row, 0 to 3 (level 1 to 4).
 */
export function nextCellState(
  row: ManagementPlanEvaluatedRow,
  levelIndex: number,
  rows: ManagementPlanRows
): ManagementPlanCellState {
  const cells = rows[row]

  switch (cells[levelIndex]) {
    case 'not_evaluated': {
      const previousGreen = cells
        .slice(0, levelIndex)
        .every((state) => state === 'green')
      return previousGreen ? 'green' : 'yellow'
    }
    case 'green':
      return 'yellow'
    case 'yellow':
      return 'red'
    default:
      return 'not_evaluated'
  }
}
