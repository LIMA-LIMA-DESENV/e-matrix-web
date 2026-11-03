'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getGetEvaluationsHitListsQueryKey,
  usePostEvaluationsHitLists,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationTypeGuard } from './EvaluationTypeGuard'
import { HitListForm } from './HitListForm'
import { evaluationsListHref } from './list-href'
import { type HitListFormData, toHitListInput } from './schema'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

export function CreateHitListPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="hit_list">
        <CreateHitList />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Creates a Hit List (J1). Saved, it goes back to the tab with a message
 * citing the code the API assigned (`HL-<n>`).
 */
function CreateHitList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref('hit_list', searchParams)

  // A Viewer reaching this URL directly goes back to the tab, as on every
  // form of the web (FR-002). The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const activities = useEvaluationActivityOptions('hit_list', canEdit)
  const { mutateAsync, isPending, isError, error } =
    usePostEvaluationsHitLists()

  async function handleSubmit(data: HitListFormData) {
    let createdCode: string | null = null

    try {
      const response = await mutateAsync({ data: toHitListInput(data) })
      if (response.status === 201) createdCode = response.data.code
    } catch {
      // Shown from the mutation state, translated, with the form kept —
      // including an activity deleted after this screen loaded (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsHitListsQueryKey(),
    })
    router.push(
      createdCode
        ? evaluationsListHref('hit_list', searchParams, {
            param: 'created',
            code: createdCode,
          })
        : listHref
    )
    return true
  }

  if (!canEdit) return null

  return (
    <HitListForm
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
