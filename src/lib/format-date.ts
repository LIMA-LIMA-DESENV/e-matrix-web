'use client'

import { useFormatter } from 'next-intl'
import { useCallback } from 'react'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Formats a calendar day sent by the API as `YYYY-MM-DD` (no time, no time
 * zone) in the active locale. `new Date('2026-01-01')` is UTC midnight, which
 * is still the previous day in UTC-3; formatting in UTC keeps the same day.
 * Returns `null` for empty or malformed values.
 */
export function useFormatDateOnly() {
  const format = useFormatter()

  return useCallback(
    (value?: string | null) => {
      if (!value || !DATE_ONLY.test(value)) return null

      const date = new Date(`${value}T00:00:00Z`)
      if (Number.isNaN(date.getTime())) return null

      return format.dateTime(date, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC',
      })
    },
    [format]
  )
}
