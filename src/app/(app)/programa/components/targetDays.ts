const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calendar days from `today` to `target`, both `YYYY-MM-DD`: positive when the
 * target is ahead, negative when it has passed and 0 on the day itself
 * (FR-022). Both are read as UTC midnight, so no time zone or daylight saving
 * shift enters the count. `today` comes from `toLocalCalendarDate()`, the
 * user's local day. Returns `null` for a malformed value.
 */
export function countCalendarDaysUntil(target: string, today: string) {
  if (!DATE_ONLY.test(target) || !DATE_ONLY.test(today)) return null

  const targetTime = Date.parse(`${target}T00:00:00Z`)
  const todayTime = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(targetTime) || Number.isNaN(todayTime)) return null

  return Math.round((targetTime - todayTime) / DAY_MS)
}
