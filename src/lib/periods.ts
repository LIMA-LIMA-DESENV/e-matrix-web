import type { Period } from '@/http/api'

type PeriodRange = Pick<Period, 'id' | 'start_date' | 'end_date'>

/**
 * The user's local calendar day as `YYYY-MM-DD`. `toISOString()` would give
 * the UTC day, which is already tomorrow in UTC-3 late in the evening.
 */
export function toLocalCalendarDate(date: Date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * The period a calendar day falls in, limits included, or `undefined` when it
 * falls in none. Dates are `YYYY-MM-DD`, compared as text, so no time zone is
 * involved. Periods never overlap, so there is at most one.
 */
export function findPeriodContainingDate<P extends PeriodRange>(
  periods: readonly P[],
  date: string
): P | undefined {
  return periods.find(
    (period) => period.start_date <= date && date <= period.end_date
  )
}

/**
 * Default of a period filter: the period that contains `today`, limits
 * included, or else the one with the greatest `end_date` — the legacy
 * `findCurrentPeriod()` / `findLastPeriod()` pair (D-10). `today` and the
 * period dates are `YYYY-MM-DD`, compared as text, so no time zone is
 * involved. Returns `undefined` when there is no period at all.
 */
export function resolveDefaultPeriod<P extends PeriodRange>(
  periods: readonly P[],
  today: string
): P | undefined {
  const current = findPeriodContainingDate(periods, today)
  if (current) return current

  return periods.reduce<P | undefined>(
    (latest, period) =>
      !latest || period.end_date > latest.end_date ? period : latest,
    undefined
  )
}
