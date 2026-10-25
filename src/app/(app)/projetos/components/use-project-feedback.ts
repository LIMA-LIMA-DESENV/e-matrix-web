'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import type { ListFeedbackMessage } from '@/components/list'

import {
  FEEDBACK_PARAMS,
  FILE_REMOVED_PARAM,
  PHOTO_REMOVED_PARAMS,
} from '../_form/list-href'

/**
 * Shows the success message a form page left in the URL — created, updated
 * or an attachment removed, each carrying the record's code (J8) — and then drops
 * the param, so a reload does not show it again.
 */
export function useProjectFeedback(
  onFeedback: (message: ListFeedbackMessage) => void
) {
  const t = useTranslations('projects.feedback')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createdCode = searchParams.get('created')
  const updatedCode = searchParams.get('updated')
  const beforePhotoCode = searchParams.get(PHOTO_REMOVED_PARAMS['before-photo'])
  const afterPhotoCode = searchParams.get(PHOTO_REMOVED_PARAMS['after-photo'])
  const fileCode = searchParams.get(FILE_REMOVED_PARAM)

  useEffect(() => {
    let text: string | null = null

    if (createdCode) text = t('created', { code: createdCode })
    else if (updatedCode) text = t('updated', { code: updatedCode })
    else if (beforePhotoCode) {
      text = t('photoRemoved.before-photo', { code: beforePhotoCode })
    } else if (afterPhotoCode) {
      text = t('photoRemoved.after-photo', { code: afterPhotoCode })
    } else if (fileCode) {
      text = t('fileRemoved', { code: fileCode })
    }

    if (!text) return

    onFeedback({ tone: 'success', text })

    const params = new URLSearchParams(searchParams.toString())
    for (const key of FEEDBACK_PARAMS) params.delete(key)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    createdCode,
    updatedCode,
    beforePhotoCode,
    afterPhotoCode,
    fileCode,
    onFeedback,
    pathname,
    router,
    searchParams,
    t,
  ])
}
