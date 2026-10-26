'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useMemo } from 'react'

import {
  isPeriodIdValue,
  ListEmptyState,
  ListErrorState,
  PeriodFilter,
  type PeriodSliceQueryOptions,
  usePeriodSlice,
} from '@/components/list'
import { useGetMatricesPeriodId } from '@/http/api'

import {
  countMatrixChart,
  getMatrixChartSliceLabel,
  getMatrixChartSliceTarget,
  groupMatrixChart,
  MATRIX_CHART_GROUP_COLUMNS,
  MATRIX_CHART_MAPS,
  type MatrixChartMap,
  MatrixChartMapView,
  type MatrixChartSliceGroup,
  MatrixEmptyState,
  MatrixTabs,
  revealMatrixColumns,
  useMatrixValueLabels,
} from '../components'

/** `?view=groups` is the groups view; anything else, the whole Matrix. */
type MatrixChartsView = 'all' | 'groups'

const MATRIX_CHARTS_VIEWS: readonly MatrixChartsView[] = ['all', 'groups']

/**
 * The Matrix of one period, with the same query as the Resultados tab, so
 * both tabs share its cache (FR-002, D-1).
 */
function useMatrixOfPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  return useGetMatricesPeriodId(periodId ?? '', {
    query: { ...query, enabled: query.enabled && !!periodId },
  })
}

export default function MatrizGraficosPage() {
  return (
    <Suspense fallback={<MatrixChartsSkeleton />}>
      <MatrixCharts />
    </Suspense>
  )
}

/** Three cards while the Matrix of the period loads (FR-003). */
function MatrixChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
      {MATRIX_CHART_MAPS.map((map) => (
        <div
          key={map.key}
          className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-6"
        >
          <div className="h-5 w-40 animate-pulse rounded-md bg-surface-container-high" />
          <div className="mx-auto aspect-square w-full max-w-56 animate-pulse rounded-full bg-surface-container-high" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-surface-container-high" />
            <div className="h-4 w-full animate-pulse rounded-md bg-surface-container-high" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface MatrixChartsViewToggleProps {
  value: MatrixChartsView
  onChange: (value: MatrixChartsView) => void
}

/** "Toda a matriz" or "Por fábrica, área e função" (FR-011). */
function MatrixChartsViewToggle({
  value,
  onChange,
}: MatrixChartsViewToggleProps) {
  const t = useTranslations('matrix.charts.views')

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{t('label')}</legend>
      {MATRIX_CHARTS_VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={value === view}
          onClick={() => onChange(view)}
          className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 font-label text-xs font-semibold transition-colors ${
            value === view
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {t(view)}
        </button>
      ))}
    </fieldset>
  )
}

/**
 * The Gráficos tab, for every role and read only (R-4): the three maps of the
 * whole Matrix of the period (R-10) or, with `?view=groups`, each map broken
 * by fabric, area and function (R-11), counted in the browser from the rows
 * of `GET /matrices/{period_id}`, the only request of the tab (FR-004). The
 * period and its default are the ones of the Resultados tab (FR-002).
 */
function MatrixCharts() {
  const t = useTranslations('matrix')
  const tCharts = useTranslations('matrix.charts')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const labels = useMatrixValueLabels()

  // No "all periods" (R-2): anything but a period id falls back to the
  // default.
  const periodParam = searchParams.get('period') ?? ''
  const period = isPeriodIdValue(periodParam) ? periodParam : ''
  const view: MatrixChartsView =
    searchParams.get('view') === 'groups' ? 'groups' : 'all'

  const onPeriodChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set('period', value)
      router.replace(`${pathname}?${params}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Replaces `?view`, keeping `?period=`; the whole Matrix drops it.
  function onViewChange(value: MatrixChartsView) {
    const params = new URLSearchParams(searchParams)
    if (value === 'groups') params.set('view', value)
    else params.delete('view')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const {
    periods,
    arePeriodsLoaded,
    hasPeriods,
    isPeriodsError,
    refetchPeriods,
    selectedPeriod,
    isPeriodChosen,
    isRecheckingPeriod,
    records: {
      data: matrixResponse,
      isLoading: isMatrixLoading,
      isError: isMatrixError,
      refetch: refetchMatrix,
    },
  } = usePeriodSlice({ period, onPeriodChange, useRecords: useMatrixOfPeriod })

  const matrix = matrixResponse?.status === 200 ? matrixResponse.data : null

  // Counted once per Matrix read and view; the cells saved on the Resultados
  // tab update the cached Matrix, so coming back shows the new count
  // (AC-007).
  const counts = useMemo(() => {
    const rows = matrix?.rows ?? []

    return MATRIX_CHART_MAPS.map((map) => ({
      map,
      count: countMatrixChart(rows, map),
      columns:
        view === 'groups'
          ? MATRIX_CHART_GROUP_COLUMNS.map((column) => ({
              column,
              groups: groupMatrixChart(rows, map, column),
            }))
          : null,
    }))
  }, [matrix, view])

  // The Resultados of the slice, in this period, with its columns shown
  // (FR-015, FR-017). A push, so going back returns to this tab and view.
  function openSlice(
    periodId: string,
    map: MatrixChartMap,
    value: string,
    group?: MatrixChartSliceGroup
  ) {
    const target = getMatrixChartSliceTarget(periodId, map, value, group)
    revealMatrixColumns(target.columns)
    router.push(target.href)
  }

  function handleRetry() {
    if (isPeriodsError || !arePeriodsLoaded) {
      void refetchPeriods()
      return
    }

    void refetchMatrix()
  }

  // The states of the tab, in the order of the spec (§9).
  function renderContent() {
    if (isPeriodsError || (isMatrixError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isMatrixLoading || isRecheckingPeriod || !matrix) {
      return <MatrixChartsSkeleton />
    }

    if (!matrix.initialized) {
      return (
        <MatrixEmptyState
          key={matrix.period.id}
          matrix={matrix}
          variant="charts"
        />
      )
    }

    if (matrix.rows.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="grid_on"
          title={t('noActivities.title')}
          description={t('noActivities.description')}
        />
      )
    }

    // The key starts the group filters over, all shown, on another period or
    // view (FR-014).
    return (
      <div
        key={`${matrix.period.id}:${view}`}
        className={
          view === 'groups' ? 'space-y-12' : 'grid gap-6 lg:grid-cols-3'
        }
      >
        {counts.map(({ map, count, columns }) => (
          <MatrixChartMapView
            key={map.key}
            title={tCharts(`maps.${map.key}`)}
            count={count}
            columns={columns}
            labelOf={(value) => getMatrixChartSliceLabel(map, value, labels)}
            onSliceActivate={(value, group) =>
              openSlice(matrix.period.id, map, value, group)
            }
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <MatrixTabs active="charts" />

      {arePeriodsLoaded && !hasPeriods && !isPeriodsError ? (
        <div
          role="status"
          className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden>
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold">{t('noPeriods.title')}</p>
            <p>{t('noPeriods.description')}</p>
          </div>
        </div>
      ) : (
        <>
          {hasPeriods && (
            <div className="mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center md:justify-between">
              <MatrixChartsViewToggle value={view} onChange={onViewChange} />
              <PeriodFilter
                periods={periods}
                value={selectedPeriod}
                onChange={onPeriodChange}
                includeAll={false}
              />
            </div>
          )}

          {renderContent()}
        </>
      )}
    </div>
  )
}
