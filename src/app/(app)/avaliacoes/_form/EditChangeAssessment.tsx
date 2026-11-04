'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getGetEvaluationsChangeAssessmentsIdQueryKey,
  getGetEvaluationsChangeAssessmentsQueryKey,
  useGetEvaluationsChangeAssessmentsId,
  usePutEvaluationsChangeAssessmentsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ChangeAssessmentForm } from './ChangeAssessmentForm'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref } from './list-href'
import {
  type ChangeAssessmentFormData,
  toChangeAssessmentFormValues,
  toChangeAssessmentInput,
} from './schema'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

export function EditChangeAssessmentPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="change_assessment">
        <EditChangeAssessment />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Edits an Avaliação de Mudanças / Projetos (J3), titled with its code.
 * Every field may change, including the activity (R-11); the `PUT` replaces
 * all of them, so what is emptied is cleared (FR-006). Saved, it goes back
 * to the tab with the message.
 */
function EditChangeAssessment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref('change_assessment', searchParams)

  // A Viewer reaching this URL directly goes back to the tab, before any
  // write request is even possible (FR-002). The real guard is the API.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const detail = useGetEvaluationsChangeAssessmentsId(id, {
    query: { enabled: canEdit && !!id },
  })
  const activities = useEvaluationActivityOptions('change_assessment', canEdit)
  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutEvaluationsChangeAssessmentsId()

  const record = detail.data?.status === 200 ? detail.data.data : undefined

  const initialValues = useMemo<ChangeAssessmentFormData | undefined>(
    () => (record ? toChangeAssessmentFormValues(record) : undefined),
    [record]
  )

  async function handleSubmit(data: ChangeAssessmentFormData) {
    if (!record) return false

    try {
      await mutateAsync({ id: record.id, data: toChangeAssessmentInput(data) })
    } catch {
      // Shown from the mutation state, translated — a 404 when the record
      // was deleted meanwhile (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsChangeAssessmentsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsChangeAssessmentsQueryKey(),
    })
    router.push(
      evaluationsListHref('change_assessment', searchParams, {
        param: 'updated',
        code: record.code,
      })
    )
    return true
  }

  if (!canEdit) return null

  if (detail.isLoading) return <EvaluationFormSkeleton />

  if (!record || !initialValues) {
    return (
      <EvaluationLoadError
        type="change_assessment"
        description={translateError(detail.error ?? detail.data)}
        listHref={listHref}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  return (
    <ChangeAssessmentForm
      code={record.code}
      initialValues={initialValues}
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending}
      errorMessage={isUpdateError ? translateError(updateError) : null}
      onSubmit={handleSubmit}
    />
  )
}
