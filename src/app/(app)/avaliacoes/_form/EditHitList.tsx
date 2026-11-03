'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getGetEvaluationsHitListsIdQueryKey,
  getGetEvaluationsHitListsQueryKey,
  useGetEvaluationsHitListsId,
  usePutEvaluationsHitListsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import { HitListForm } from './HitListForm'
import { evaluationsListHref } from './list-href'
import {
  type HitListFormData,
  toHitListFormValues,
  toHitListInput,
} from './schema'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

export function EditHitListPage() {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type="hit_list">
        <EditHitList />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Edits a Hit List (J3), titled with its code. Every field may change,
 * including the activity (R-7); the `PUT` replaces all of them, so what is
 * emptied is cleared. Saved, it goes back to the tab with the message.
 */
function EditHitList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref('hit_list', searchParams)

  // A Viewer reaching this URL directly goes back to the tab, before any
  // write request is even possible (FR-002). The real guard is the API.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const detail = useGetEvaluationsHitListsId(id, {
    query: { enabled: canEdit && !!id },
  })
  const activities = useEvaluationActivityOptions('hit_list', canEdit)
  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutEvaluationsHitListsId()

  const record = detail.data?.status === 200 ? detail.data.data : undefined

  const initialValues = useMemo<HitListFormData | undefined>(
    () => (record ? toHitListFormValues(record) : undefined),
    [record]
  )

  async function handleSubmit(data: HitListFormData) {
    if (!record) return false

    try {
      await mutateAsync({ id: record.id, data: toHitListInput(data) })
    } catch {
      // Shown from the mutation state, translated — a 404 when the record
      // was deleted meanwhile (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsHitListsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetEvaluationsHitListsQueryKey(),
    })
    router.push(
      evaluationsListHref('hit_list', searchParams, {
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
        type="hit_list"
        description={translateError(detail.error ?? detail.data)}
        listHref={listHref}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  return (
    <HitListForm
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
