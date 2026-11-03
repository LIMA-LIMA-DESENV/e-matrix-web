'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getGetEvaluationsChecklistsQueryKey,
  usePostEvaluationsChecklists,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ChecklistForm } from './ChecklistForm'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref } from './list-href'
import { type ChecklistFormData, toChecklistInput } from './schema'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

export function CreateChecklistPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="checklist">
        <CreateChecklist />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Creates a Coleta de Dados (J1). Saved, it goes back to the tab with a message
 * citing the code the API assigned (`CDIA-<n>`).
 */
function CreateChecklist() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref('checklist', searchParams)

  // A Viewer reaching this URL directly goes back to the tab, as on every
  // form of the web (FR-002). The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const activities = useEvaluationActivityOptions('checklist', canEdit)
  const { mutateAsync, isPending, isError, error } =
    usePostEvaluationsChecklists()

  async function handleSubmit(data: ChecklistFormData) {
    let createdCode: string | null = null

    try {
      const response = await mutateAsync({ data: toChecklistInput(data) })
      if (response.status === 201) createdCode = response.data.code
    } catch {
      // Shown from the mutation state, translated, with the form kept —
      // including an activity deleted after this screen loaded (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsChecklistsQueryKey(),
    })
    router.push(
      createdCode
        ? evaluationsListHref('checklist', searchParams, {
            param: 'created',
            code: createdCode,
          })
        : listHref
    )
    return true
  }

  if (!canEdit) return null

  return (
    <ChecklistForm
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
