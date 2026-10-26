'use client'

import { useEffect, useMemo, useState } from 'react'

import { type Period, useGetPeriods } from '@/http/api'
import { getErrorKey } from '@/lib/error-translator'
import { resolveDefaultPeriod, toLocalCalendarDate } from '@/lib/periods'

/**
 * Value of the period filter that lists every record, including those dated
 * outside any period. It only exists in the web URL: the API lists everything
 * when `period_id` is omitted.
 */
export const ALL_PERIODS = 'all'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `ListStateConfig.filters` validator of `?period=`: accepts `all` or
 * something shaped like a period id. Whether the id still exists is checked by
 * `usePeriodSlice` against the loaded periods.
 */
export function isPeriodFilterValue(value: string) {
  return value === ALL_PERIODS || isPeriodIdValue(value)
}

/**
 * `?period=` validator of a screen without "all periods" (the Matrix): only
 * something shaped like a period id, so `all` falls back to the default.
 */
export function isPeriodIdValue(value: string) {
  return UUID_PATTERN.test(value)
}

/** The period the records were requested for no longer exists. */
function isPeriodNotFound(error: unknown) {
  return getErrorKey(error) === 'periodNotFound'
}

/** Query options `usePeriodSlice` hands to the records query. */
export interface PeriodSliceQueryOptions {
  /** False until the slice is known, so no request goes out for nothing. */
  enabled: boolean
  retry: (failureCount: number, error: unknown) => boolean
}

interface RecordsQuery {
  isError: boolean
  error: unknown
}

interface UsePeriodSliceOptions<TRecords extends RecordsQuery> {
  /** `?period=` as `useListState` parsed it: a period id, `all` or `''`. */
  period: string
  /** Writes `?period=`; called with the default period id. */
  onPeriodChange: (value: string) => void
  /**
   * The module's records query, filtered by `periodId` (`undefined` lists
   * every record). Define it at module scope, like any hook.
   */
  useRecords: (
    periodId: string | undefined,
    query: PeriodSliceQueryOptions
  ) => TRecords
}

/**
 * Slice of a listing by period (see `AGENTS.md` §Lists Sliced by Period): the
 * slice is the API's `period_id`, and its default is resolved here, not by
 * the API. Edge cases:
 * - no `period` in the URL: once the periods load, the one that contains
 *   today, or else the one with the greatest `end_date`, is written to the
 *   URL. Until then `isPeriodChosen` is false and no records are requested;
 * - `all`: an explicit choice, kept as is; the records come unfiltered;
 * - an id the loaded periods do not know: the periods are reloaded once, in
 *   case it was created after they were cached, then the default is applied;
 * - a 404 `Period not found.` on the records (the period was deleted
 *   elsewhere): the periods are reloaded once; once it is out of the list,
 *   the default is applied again instead of showing an error;
 * - no period registered: `hasPeriods` is false and every record is listed;
 *   the screen shows a notice instead of the filter.
 *
 * A period the user picked is never replaced: the default only applies while
 * the URL holds no valid one.
 */
export function usePeriodSlice<TRecords extends RecordsQuery>({
  period,
  onPeriodChange,
  useRecords,
}: UsePeriodSliceOptions<TRecords>) {
  // The period id already re-checked against a fresh `GET /periods`, so an
  // unknown or deleted period reloads the list once before the default is
  // applied, and never loops.
  const [recheckedPeriodId, setRecheckedPeriodId] = useState<string | null>(
    null
  )

  const {
    data: periodsResponse,
    isFetching: isPeriodsFetching,
    isError: isPeriodsError,
    refetch: refetchPeriods,
  } = useGetPeriods()

  const arePeriodsLoaded = periodsResponse?.status === 200
  const periods = useMemo<Period[]>(
    () => (periodsResponse?.status === 200 ? periodsResponse.data : []),
    [periodsResponse]
  )
  const hasPeriods = periods.length > 0

  // The URL value only counts once it names a period that exists.
  const selectedPeriod =
    period === ALL_PERIODS || periods.some(({ id }) => id === period)
      ? period
      : ''
  const isPeriodChosen = arePeriodsLoaded && (!hasPeriods || !!selectedPeriod)
  const periodId =
    hasPeriods && selectedPeriod !== ALL_PERIODS ? selectedPeriod : undefined

  const records = useRecords(periodId, {
    enabled: isPeriodChosen,
    // A deleted period is handled below; retrying it only delays that.
    retry: (failureCount, error) =>
      !isPeriodNotFound(error) && failureCount < 3,
  })

  const isPeriodGone =
    !!periodId && records.isError && isPeriodNotFound(records.error)

  // The chosen period was deleted elsewhere: reload the periods; once it is
  // out of the list, the default below is applied again.
  useEffect(() => {
    if (!isPeriodGone || !periodId || recheckedPeriodId === periodId) return

    setRecheckedPeriodId(periodId)
    void refetchPeriods()
  }, [isPeriodGone, periodId, recheckedPeriodId, refetchPeriods])

  // Applies the default when the URL has no usable period: missing, or an id
  // the loaded periods do not know — after reloading them once.
  useEffect(() => {
    if (!arePeriodsLoaded || isPeriodsFetching || !hasPeriods) return
    if (selectedPeriod) return

    if (period && recheckedPeriodId !== period) {
      setRecheckedPeriodId(period)
      void refetchPeriods()
      return
    }

    const fallback = resolveDefaultPeriod(periods, toLocalCalendarDate())
    if (fallback) onPeriodChange(fallback.id)
  }, [
    arePeriodsLoaded,
    isPeriodsFetching,
    hasPeriods,
    selectedPeriod,
    period,
    recheckedPeriodId,
    periods,
    refetchPeriods,
    onPeriodChange,
  ])

  // While a deleted period is being re-checked, the records error is not
  // shown: the screen keeps loading until the default replaces it.
  const isRecheckingPeriod =
    isPeriodGone && (recheckedPeriodId !== periodId || isPeriodsFetching)

  return {
    /** Every registered period, as `GET /periods` lists them. */
    periods,
    arePeriodsLoaded,
    hasPeriods,
    isPeriodsError,
    refetchPeriods,
    /** A valid period id or `all`; `''` while the default is being applied. */
    selectedPeriod,
    /** The `period_id` of the records query; `undefined` lists everything. */
    periodId,
    /** Whether the slice is known and the records may be requested. */
    isPeriodChosen,
    isRecheckingPeriod,
    /** The result of `useRecords`. */
    records,
  }
}
