'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useTranslateError } from '@/lib/error-translator'
import type { EvaluationType } from '@/lib/evaluation-types'

import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref } from './list-href'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'

/** `<tab>/novo` of any evaluation type (FR-010, D-5). */
export function CreateEvaluationPage({ type }: { type: EvaluationType }) {
  return (
    <Suspense fallback={<EvaluationFormSkeleton />}>
      <EvaluationTypeGuard type={type}>
        <CreateEvaluation
          key={type}
          definition={evaluationWebDefinition(type)}
        />
      </EvaluationTypeGuard>
    </Suspense>
  )
}

/**
 * Creates a record of the type (J1), in the type's own form. Saved, it goes
 * back to the tab with a message citing the code the API assigned
 * (`<prefix>-<n>`).
 */
function CreateEvaluation({
  definition,
}: {
  definition: EvaluationWebDefinition
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const listHref = evaluationsListHref(definition.type, searchParams)

  // A Viewer reaching this URL directly goes back to the tab, as on every
  // form of the web (FR-002). The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) router.replace(listHref)
  }, [canEdit, listHref, router])

  const activities = useEvaluationActivityOptions(definition, canEdit)
  const { create, isPending, isError, error } = definition.useCreate()

  async function handleSubmit(data: unknown) {
    let createdCode: string | null = null

    try {
      createdCode = await create(definition.form.toInput(data))
    } catch {
      // Shown from the mutation state, translated, with the form kept —
      // including an activity deleted after this screen loaded (§12).
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: definition.listQueryKey(),
    })
    router.push(
      createdCode
        ? evaluationsListHref(definition.type, searchParams, {
            param: 'created',
            code: createdCode,
          })
        : listHref
    )
    return true
  }

  if (!canEdit) return null

  const Form = definition.form.Component

  return (
    <Form
      key={definition.type}
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
