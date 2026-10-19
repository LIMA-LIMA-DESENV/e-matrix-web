'use client'

import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ListEmptyState, ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetManagementPlansQueryKey,
  type getManagementPlansResponse,
  getPutManagementPlansPeriodIdCellsRowLevelMutationKey,
  getPutManagementPlansPeriodIdGoalMutationKey,
  type ManagementPlan,
  type ManagementPlanEvaluatedRow,
  useGetManagementPlans,
  usePutManagementPlansPeriodIdCellsRowLevel,
  usePutManagementPlansPeriodIdGoal,
} from '@/http/api'
import { getErrorKey, useTranslateError } from '@/lib/error-translator'
import { resolveDefaultPeriod, toLocalCalendarDate } from '@/lib/periods'

import {
  ManagementPlanChart,
  ManagementPlanGrid,
  ManagementPlanMiniGrid,
  nextCellState,
} from './components'

const WRITE_MUTATION_KEYS = new Set<unknown>([
  getPutManagementPlansPeriodIdCellsRowLevelMutationKey()[0],
  getPutManagementPlansPeriodIdGoalMutationKey()[0],
])

export default function PlanoDeGestaoPage() {
  return (
    <Suspense fallback={<ManagementPlanSkeleton />}>
      <ManagementPlanScreen />
    </Suspense>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
    />
  )
}

function ManagementPlanSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <SkeletonBlock className="h-72" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <SkeletonBlock key={index} className="h-28 w-40 shrink-0" />
        ))}
      </div>
      <SkeletonBlock className="h-96" />
    </div>
  )
}

/**
 * Management plan of every period, read by every role (J1, J6): the chart of
 * scores and goals, one mini-grid per period and the full grid of the selected
 * one. The API sends all the periods with their derived rows and score, so a
 * single request serves the whole screen and nothing is recalculated here.
 *
 * The selected period lives in `?period=` (FR-022). It is resolved against the
 * periods of `GET /management-plans`, not through `usePeriodSlice`: there is
 * no "all" and no per-period request (D-10). Without the param, or with an id
 * the list does not know, the default — the period that contains today, or
 * else the one with the greatest end date — replaces it (J9).
 *
 * Users and admins change one cell or the goal at a time, saved at once
 * (FR-023). Nothing is optimistic (D-8): while a change of the selected
 * period is saving its grid and goal are disabled, and only the plan the API
 * answers with replaces that period in the cached list, which updates the
 * score, the derived rows, the mini-grid and the chart together. A failure
 * leaves the cache alone and shows the translated error above the grid until
 * the next change; a 404 `Period not found.` reloads the list, so the
 * selection falls back to the default.
 */
function ManagementPlanScreen() {
  const t = useTranslations('managementPlan')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin, canEdit } = useAuth()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const [saveError, setSaveError] = useState<string | null>(null)
  // Periods with a change on its way. `useIsMutating` below disables the grid,
  // but it is notified asynchronously; this guard turns away a second click
  // that arrives before that render (D-8).
  const savingPeriodsRef = useRef(new Set<string>())

  const { data, isLoading, isError, refetch } = useGetManagementPlans()

  const isLoaded = data?.status === 200
  const plans = useMemo<ManagementPlan[]>(
    () => (data?.status === 200 ? data.data : []),
    [data]
  )

  const periodParam = searchParams.get('period') ?? ''
  const selectedPlan = plans.find(({ period }) => period.id === periodParam)

  const selectPeriod = useCallback(
    (periodId: string, mode: 'push' | 'replace') => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', periodId)
      router[mode](`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const selectedPeriodId = selectedPlan?.period.id
  const isSaving =
    useIsMutating({
      predicate: ({ options, state }) =>
        WRITE_MUTATION_KEYS.has(options.mutationKey?.[0]) &&
        (state.variables as { periodId?: string } | undefined)?.periodId ===
          selectedPeriodId,
    }) > 0

  function replacePlan(plan: ManagementPlan) {
    queryClient.setQueryData<getManagementPlansResponse>(
      getGetManagementPlansQueryKey(),
      (current) =>
        current?.status === 200
          ? {
              ...current,
              data: current.data.map((item) =>
                item.period.id === plan.period.id ? plan : item
              ),
            }
          : current
    )
  }

  function handleSaveError(error: unknown) {
    setSaveError(translateError(error))
    if (getErrorKey(error) === 'periodNotFound') {
      void queryClient.invalidateQueries({
        queryKey: getGetManagementPlansQueryKey(),
      })
    }
  }

  function releasePeriod({ periodId }: { periodId: string }) {
    savingPeriodsRef.current.delete(periodId)
  }

  function lockPeriod(periodId: string) {
    if (savingPeriodsRef.current.has(periodId)) return false

    savingPeriodsRef.current.add(periodId)
    return true
  }

  const cellMutation = usePutManagementPlansPeriodIdCellsRowLevel({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200) replacePlan(response.data)
      },
      onError: handleSaveError,
      onSettled: (_data, _error, variables) => releasePeriod(variables),
    },
  })

  const goalMutation = usePutManagementPlansPeriodIdGoal({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200) replacePlan(response.data)
      },
      onError: handleSaveError,
      onSettled: (_data, _error, variables) => releasePeriod(variables),
    },
  })

  function changeCell(row: ManagementPlanEvaluatedRow, levelIndex: number) {
    if (!selectedPlan || !lockPeriod(selectedPlan.period.id)) return

    setSaveError(null)
    cellMutation.mutate({
      periodId: selectedPlan.period.id,
      row,
      level: levelIndex + 1,
      data: { state: nextCellState(row, levelIndex, selectedPlan.rows) },
    })
  }

  function changeGoal(goal: number) {
    if (!selectedPlan || !lockPeriod(selectedPlan.period.id)) return

    setSaveError(null)
    goalMutation.mutate({ periodId: selectedPlan.period.id, data: { goal } })
  }

  useEffect(() => {
    if (!isLoaded || selectedPlan) return

    const fallback = resolveDefaultPeriod(
      plans.map(({ period }) => period),
      toLocalCalendarDate()
    )
    if (fallback) selectPeriod(fallback.id, 'replace')
  }, [isLoaded, selectedPlan, plans, selectPeriod])

  function renderContent() {
    if (isLoading) return <ManagementPlanSkeleton />

    if (isError || (data && !isLoaded)) {
      return (
        <ListErrorState title={t('loadError')} onRetry={() => void refetch()} />
      )
    }

    if (plans.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="date_range"
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            isAdmin ? (
              <Link
                href="/parametros/periodos"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t('empty.action')}
              </Link>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="space-y-6">
        <ManagementPlanChart plans={plans} />

        <section aria-label={t('miniGridsLabel')}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {plans.map((plan) => (
              <ManagementPlanMiniGrid
                key={plan.period.id}
                plan={plan}
                isSelected={plan.period.id === selectedPlan?.period.id}
                onSelect={(periodId) => selectPeriod(periodId, 'push')}
              />
            ))}
          </div>
        </section>

        {saveError && (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
          >
            {saveError}
          </div>
        )}

        {selectedPlan ? (
          <ManagementPlanGrid
            plan={selectedPlan}
            canEdit={canEdit}
            isSaving={isSaving}
            onCellClick={changeCell}
            onGoalChange={changeGoal}
          />
        ) : (
          <SkeletonBlock className="h-96" />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-ematrix-dark">
          {t('title')}{' '}
          <small className="text-lg font-semibold text-outline">
            {t('subtitle')}
          </small>
        </h1>
      </div>

      {renderContent()}
    </div>
  )
}
