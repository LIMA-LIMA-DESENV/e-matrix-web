import { useTranslations } from 'next-intl'

import type { ManagementPlan } from '@/http/api'
import { cn } from '@/lib/utils'

import { CELL_STATE_CLASSES } from './cellColors'
import { MANAGEMENT_PLAN_ROWS, useCellLabel } from './grid'

interface ManagementPlanMiniGridProps {
  plan: ManagementPlan
  isSelected: boolean
  onSelect: (periodId: string) => void
}

/**
 * The period's description over its 6×4 colored squares, derived rows
 * included (FR-020). The whole mini-grid is the button that selects the
 * period.
 */
export function ManagementPlanMiniGrid({
  plan,
  isSelected,
  onSelect,
}: ManagementPlanMiniGridProps) {
  const t = useTranslations('managementPlan')
  const cellLabel = useCellLabel()

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      title={t('selectPeriod', { period: plan.period.description })}
      onClick={() => onSelect(plan.period.id)}
      className={cn(
        'flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-xl border bg-surface-container-lowest p-3 text-left shadow-sm transition-all hover:border-primary/60',
        isSelected
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-outline-variant/40'
      )}
    >
      <span className="truncate text-center text-xs font-bold text-on-surface">
        {plan.period.description}
      </span>
      <span className="grid grid-cols-4 gap-0.5">
        {MANAGEMENT_PLAN_ROWS.map((row) =>
          plan.rows[row].map((state, levelIndex) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the level is the position
              key={`${row}-${levelIndex}`}
              role="img"
              aria-label={cellLabel(row, levelIndex, state)}
              className={cn('h-3 rounded-sm', CELL_STATE_CLASSES[state].square)}
            />
          ))
        )}
      </span>
    </button>
  )
}
