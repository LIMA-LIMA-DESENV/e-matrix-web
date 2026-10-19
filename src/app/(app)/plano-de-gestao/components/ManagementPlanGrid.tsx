import { useTranslations } from 'next-intl'

import type { ManagementPlan, ManagementPlanEvaluatedRow } from '@/http/api'
import { cn } from '@/lib/utils'

import { CELL_STATE_CLASSES } from './cellColors'
import {
  isEvaluatedRow,
  MANAGEMENT_PLAN_LEVELS,
  MANAGEMENT_PLAN_ROWS,
  useCellLabel,
} from './grid'
import { ManagementPlanGoal } from './ManagementPlanGoal'

interface ManagementPlanGridProps {
  plan: ManagementPlan
  canEdit: boolean
  isSaving: boolean
  onCellClick: (row: ManagementPlanEvaluatedRow, levelIndex: number) => void
  onGoalChange: (goal: number) => void
}

/**
 * The full grid of the selected period (FR-021): the level header, the row
 * labels, the 24 fixed texts on the color of their state and, below, the
 * score and the goal. For `canEdit` the cells of the four evaluated rows are
 * buttons and the goal is a field (J3, J4); inputs and outputs stay static.
 * While a change of this period is saving, nothing accepts input (D-8). For
 * everyone else every cell is static and the goal is text (J6).
 */
export function ManagementPlanGrid({
  plan,
  canEdit,
  isSaving,
  onCellClick,
  onGoalChange,
}: ManagementPlanGridProps) {
  const t = useTranslations('managementPlan')
  const cellLabel = useCellLabel()

  return (
    <section
      aria-labelledby="management-plan-grid-title"
      aria-busy={isSaving}
      className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="management-plan-grid-title"
          className="font-headline text-lg font-bold text-on-surface"
        >
          {plan.period.description}
        </h2>
        {isSaving && (
          <span
            role="status"
            className="flex items-center gap-1 text-xs font-medium text-on-surface-variant"
          >
            <span
              className="material-symbols-outlined animate-spin text-base"
              aria-hidden
            >
              progress_activity
            </span>
            {t('saving')}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1 text-xs leading-snug">
          <thead>
            <tr>
              <td className="w-28" />
              {MANAGEMENT_PLAN_LEVELS.map((level) => (
                <th
                  key={level}
                  scope="col"
                  className="px-2 py-2 text-center font-bold text-on-surface"
                >
                  {t('level', { level })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MANAGEMENT_PLAN_ROWS.map((row) => (
              <tr key={row}>
                <th
                  scope="row"
                  className="px-2 text-center text-xs font-bold text-on-surface"
                >
                  {t(`rows.${row}`)}
                </th>
                {MANAGEMENT_PLAN_LEVELS.map((level, levelIndex) => {
                  const state = plan.rows[row][levelIndex]
                  const text = t(`cells.${row}.${level}`)
                  const label = t('cellWithText', {
                    label: cellLabel(row, levelIndex, state),
                    text,
                  })
                  const colors = CELL_STATE_CLASSES[state].cell

                  if (canEdit && isEvaluatedRow(row)) {
                    return (
                      <td key={level} className="h-px p-0 align-top">
                        <button
                          type="button"
                          aria-label={label}
                          disabled={isSaving}
                          onClick={() => onCellClick(row, levelIndex)}
                          className={cn(
                            'h-full w-full cursor-pointer rounded-md p-3 text-left align-top break-words transition-[filter,opacity] outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60 disabled:hover:brightness-100',
                            colors
                          )}
                        >
                          {text}
                        </button>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={level}
                      aria-label={label}
                      className={cn(
                        'rounded-md p-3 align-top break-words',
                        colors
                      )}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ManagementPlanGoal
        score={plan.score}
        goal={plan.goal}
        canEdit={canEdit}
        disabled={isSaving}
        onChange={onGoalChange}
      />
    </section>
  )
}
