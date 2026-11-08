'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getErrorKey, useTranslateError } from '@/lib/error-translator'
import type { EvaluationType } from '@/lib/evaluation-types'

import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import type {
  EvaluationCreated,
  EvaluationFormFiles,
} from '../definitions/types'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationTypeGuard } from './EvaluationTypeGuard'
import {
  evaluationFormHref,
  evaluationFormPath,
  evaluationsListHref,
  PHOTO_FAILED_PARAM,
} from './list-href'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'
import { useEvaluationPhotoUpload } from './use-evaluation-photo'

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
 * (`<prefix>-<n>`). A type with a photo sends the picked one after the
 * `POST` (D-2); if that upload fails, the record exists, so the screen moves
 * to its edit, which explains that the photo was not sent (§12).
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
  const photoUpload = useEvaluationPhotoUpload(definition)
  // Covers the POST and the upload after it: neither mutation is pending in
  // between, and a second click must not send the record twice (§12).
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(data: unknown, files?: EvaluationFormFiles) {
    setIsSaving(true)
    try {
      return await save(data, files)
    } finally {
      setIsSaving(false)
    }
  }

  async function save(data: unknown, files?: EvaluationFormFiles) {
    let created: EvaluationCreated | null = null

    try {
      created = await create(definition.form.toInput(data))
    } catch {
      // Shown from the mutation state, translated, with the form kept —
      // including an activity deleted after this screen loaded (§12).
      return false
    }

    const photo = files?.photo
    if (created && photo && photoUpload) {
      try {
        await photoUpload.upload(created.id, photo)
      } catch (uploadError) {
        // The record is saved without the photo (H-2): its edit tells so
        // and lets the photo be sent again. No retry is automatic.
        await invalidateRecord(created.id)
        router.push(photoFailedHref(created.id, uploadError))
        return true
      }
    }

    await queryClient.invalidateQueries({
      queryKey: definition.listQueryKey(),
    })
    router.push(
      created
        ? evaluationsListHref(definition.type, searchParams, {
            param: 'created',
            code: created.code,
          })
        : listHref
    )
    return true
  }

  async function invalidateRecord(id: string) {
    await queryClient.invalidateQueries({
      queryKey: definition.detailQueryKey(id),
    })
    await queryClient.invalidateQueries({
      queryKey: definition.listQueryKey(),
    })
  }

  /** The edit of the record just created, keeping the tab's state. */
  function photoFailedHref(id: string, uploadError: unknown) {
    const href = evaluationFormHref(
      evaluationFormPath(definition.type, { id, edit: true }),
      searchParams
    )
    const param = `${PHOTO_FAILED_PARAM}=${encodeURIComponent(
      getErrorKey(uploadError)
    )}`
    return `${href}${href.includes('?') ? '&' : '?'}${param}`
  }

  if (!canEdit) return null

  const Form = definition.form.Component

  return (
    <Form
      key={definition.type}
      activities={activities}
      listHref={listHref}
      isSubmitting={isPending || isSaving}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
