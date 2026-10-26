import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import {
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui'

import type {
  MatrixChartCount,
  MatrixChartGroup,
  MatrixChartGroupColumn,
  MatrixChartSliceGroup,
} from './charts'
import { MatrixPieChart } from './MatrixPieChart'

/** The groups of one column of a map, as `groupMatrixChart` gives them. */
export interface MatrixChartColumnGroups {
  column: MatrixChartGroupColumn
  groups: MatrixChartGroup[]
}

interface MatrixChartMapViewProps {
  title: string
  /** The count of the map over the whole Matrix. */
  count: MatrixChartCount
  /** The three columns of the groups view, or `null` on the whole Matrix. */
  columns: MatrixChartColumnGroups[] | null
  /** The translated label of a slice value. */
  labelOf: (value: string) => string
  /**
   * Opens the Resultados of a slice: of the whole Matrix, or of the group of
   * a group pie (FR-015).
   */
  onSliceActivate: (value: string, group?: MatrixChartSliceGroup) => void
}

/**
 * One map of the Charts tab. On the whole Matrix it is its pie (R-10); on the
 * groups view it is the general pie and, below, the Fábricas, Áreas and
 * Funções columns, side by side on wide screens and stacked on narrow ones
 * (FR-011, NFR-004), each with a pie per group that has a value and a filter
 * to show and hide them (FR-013, FR-014).
 */
export function MatrixChartMapView({
  title,
  count,
  columns,
  labelOf,
  onSliceActivate,
}: MatrixChartMapViewProps) {
  const t = useTranslations('matrix.charts')
  const titleId = useId()

  // The general pie leads to the whole Matrix, without a group.
  const onGeneralSliceActivate = (value: string) => onSliceActivate(value)

  if (!columns) {
    return (
      <MatrixPieChart
        title={title}
        count={count}
        labelOf={labelOf}
        onSliceActivate={onGeneralSliceActivate}
      />
    )
  }

  return (
    <section aria-labelledby={titleId} className="space-y-6">
      <h2
        id={titleId}
        className="font-headline text-xl font-bold text-on-surface"
      >
        {title}
      </h2>

      <div className="lg:w-1/3 lg:pr-4">
        <MatrixPieChart
          title={t('views.all')}
          heading="h3"
          count={count}
          labelOf={labelOf}
          onSliceActivate={onGeneralSliceActivate}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map(({ column, groups }) => (
          <MatrixChartGroups
            key={column}
            column={column}
            groups={groups}
            labelOf={labelOf}
            onSliceActivate={onSliceActivate}
          />
        ))}
      </div>
    </section>
  )
}

interface MatrixChartGroupsProps {
  column: MatrixChartGroupColumn
  groups: MatrixChartGroup[]
  labelOf: (value: string) => string
  onSliceActivate: (value: string, group: MatrixChartSliceGroup) => void
}

/**
 * A column of group pies. A group with no activity with a value in the field
 * has no pie and no item in the filter (FR-013). The filter only shows and
 * hides pies, so no count changes, and it lives in this component: it is not
 * kept anywhere and starts with every group shown (H-3).
 */
function MatrixChartGroups({
  column,
  groups,
  labelOf,
  onSliceActivate,
}: MatrixChartGroupsProps) {
  const t = useTranslations('matrix.charts')
  const titleId = useId()
  // The hidden ones, so every group starts shown.
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  const charted = groups.filter((group) => group.count.withValue > 0)
  const shown = charted.filter((group) => !hiddenKeys.has(group.key))
  const columnLabel = t(`groups.${column}`)
  const filterLabel = t('groups.filter', { column: columnLabel })
  const allShown = shown.length === charted.length

  function toggle(key: string) {
    setHiddenKeys((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  function toggleAll() {
    setHiddenKeys(
      allShown ? new Set(charted.map((group) => group.key)) : new Set()
    )
  }

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3
          id={titleId}
          className="font-headline text-lg font-bold text-on-surface"
        >
          {columnLabel}
        </h3>

        {charted.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={filterLabel}
              className={buttonVariants({
                variant: 'outline',
                color: 'primary',
                size: 'sm',
                className: 'shrink-0',
              })}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                filter_list
              </span>
              {t('groups.shown', {
                shown: shown.length,
                total: charted.length,
              })}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              role="group"
              aria-label={filterLabel}
              className="max-h-[60vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto"
            >
              <label className="flex cursor-pointer items-center gap-3 border-b border-outline-variant/30 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
                <input
                  type="checkbox"
                  checked={allShown}
                  onChange={toggleAll}
                  className="size-4 cursor-pointer accent-primary"
                />
                {t('groups.all')}
              </label>

              <ul className="py-1">
                {charted.map((group) => (
                  <li key={group.key}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-1.5 text-sm text-on-surface hover:bg-surface-container-low">
                      <input
                        type="checkbox"
                        checked={!hiddenKeys.has(group.key)}
                        onChange={() => toggle(group.key)}
                        className="size-4 shrink-0 cursor-pointer accent-primary"
                      />
                      <span className="min-w-0 break-words">{group.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
          {t('groups.empty')}
        </p>
      ) : (
        shown.map((group) => (
          <MatrixPieChart
            key={group.key}
            title={group.label}
            heading="h4"
            count={group.count}
            labelOf={labelOf}
            onSliceActivate={(value) =>
              onSliceActivate(value, { column, label: group.label })
            }
          />
        ))
      )}
    </section>
  )
}
