'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useTranslateError } from '@/lib/error-translator'
import type { EvaluationType } from '@/lib/evaluation-types'

import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref } from './list-href'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

/** `<tab>/[id]/editar` of any evaluation type (FR-010, D-5). */
export function EditEvaluationPage({ type }: { type: EvaluationType }) {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type={type}>
        <EditEvaluation key={type} definition={evaluationWebDefinition(type)} />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Edits a record of the type (J3), titled with its code. Every field may
 * change, including the activity; the `PUT` replaces all of them, so what
 * is emptied is cleared. Saved, it goes back to the tab with the message.
 */
function EditEvaluation({
  definition,
}: {
  definition: EvaluationWebDefinition
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref(definition.type, searchParams)

  // A Viewer reaching this URL directly goes back to the tab, before any
  // write request is even possible (FR-002). The real guard is the API.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const detail = definition.useDetail(id, canEdit && !!id)
  const activities = useEvaluationActivityOptions(definition, canEdit)
  const {
    update,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = definition.useUpdate()

  const record = detail.data

  const initialValues = useMemo(
    () => (record ? definition.form.toFormValues(record) : undefined),
    [definition, record]
  )

  async function handleSubmit(data: unknown) {
    if (!record) return false

    try {
      await update(record.id, definition.form.toInput(data))
    } catch {
      // Shown from the mutation state, translated — a 404 when the record
      // was deleted meanwhile (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: definition.detailQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: definition.listQueryKey(),
    })
    router.push(
      evaluationsListHref(definition.type, searchParams, {
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
        type={definition.type}
        description={translateError(detail.failure)}
        listHref={listHref}
        onRetry={detail.refetch}
      />
    )
  }

  const Form = definition.form.Component

  return (
    <Form
      key={`${definition.type}:${record.id}`}
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
