'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getGetEvaluationsChangeAssessmentsQueryKey,
  usePostEvaluationsChangeAssessments,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ChangeAssessmentForm } from './ChangeAssessmentForm'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref } from './list-href'
import {
  type ChangeAssessmentFormData,
  toChangeAssessmentInput,
} from './schema'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

export function CreateChangeAssessmentPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="change_assessment">
        <CreateChangeAssessment />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Creates an Avaliação de Mudanças / Projetos (J1). Saved, it goes back to
 * the tab with a message citing the code the API assigned (`AMP-<n>`).
 */
function CreateChangeAssessment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref('change_assessment', searchParams)

  // A Viewer reaching this URL directly goes back to the tab, as on every
  // form of the web (FR-002). The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const activities = useEvaluationActivityOptions('change_assessment', canEdit)
  const { mutateAsync, isPending, isError, error } =
    usePostEvaluationsChangeAssessments()

  async function handleSubmit(data: ChangeAssessmentFormData) {
    let createdCode: string | null = null

    try {
      const response = await mutateAsync({
        data: toChangeAssessmentInput(data),
      })
      if (response.status === 201) createdCode = response.data.code
    } catch {
      // Shown from the mutation state, translated, with the form kept —
      // including an activity deleted after this screen loaded (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsChangeAssessmentsQueryKey(),
    })
    router.push(
      createdCode
        ? evaluationsListHref('change_assessment', searchParams, {
            param: 'created',
            code: createdCode,
          })
        : listHref
    )
    return true
  }

  if (!canEdit) return null

  return (
    <ChangeAssessmentForm
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
