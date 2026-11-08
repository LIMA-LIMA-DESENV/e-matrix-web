'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import type { ListFeedbackMessage } from '@/components/list'

import { EVALUATION_FEEDBACK_PARAMS } from '../_form/list-href'

/**
 * Shows the success message a record page left in the URL — created,
 * updated or photo removed, each carrying the record's code (J1, J3, FR-017,
 * D-7) — and then drops
 * the param, so a reload does not show it again.
 */
export function useEvaluationFeedback(
  onFeedback: (message: ListFeedbackMessage) => void
) {
  const t = useTranslations('evaluations.feedback')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createdCode = searchParams.get('created')
  const updatedCode = searchParams.get('updated')
  const photoRemovedCode = searchParams.get('photoRemoved')

  useEffect(() => {
    let text: string | null = null

    if (createdCode) text = t('created', { code: createdCode })
    else if (updatedCode) text = t('updated', { code: updatedCode })
    else if (photoRemovedCode) {
      text = t('photoRemoved', { code: photoRemovedCode })
    }

    if (!text) return

    onFeedback({ tone: 'success', text })

    const params = new URLSearchParams(searchParams.toString())
    for (const key of EVALUATION_FEEDBACK_PARAMS) params.delete(key)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    createdCode,
    updatedCode,
    photoRemovedCode,
    onFeedback,
    pathname,
    router,
    searchParams,
    t,
  ])
}
