'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useTranslateError } from '@/lib/error-translator'
import type { EvaluationType } from '@/lib/evaluation-types'

import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import type { EvaluationFormFiles } from '../definitions/types'
import { EvaluationFormSkeleton } from './EvaluationFormSkeleton'
import { EvaluationLoadError, EvaluationTypeGuard } from './EvaluationTypeGuard'
import { evaluationsListHref, PHOTO_FAILED_PARAM } from './list-href'
import { RemoveEvaluationPhotoModal } from './RemoveEvaluationPhotoModal'
import { useEvaluationActivityOptions } from './use-evaluation-activity-options'
import {
  useEvaluationFormPhoto,
  useEvaluationPhotoDownload,
  useEvaluationPhotoRemove,
  useEvaluationPhotoUpload,
} from './use-evaluation-photo'

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
 * The notice of a photo that was not sent (J1, J3, H-2): the record's data
 * is saved, the photo is not. `created` comes from the create, through
 * `?photoFailed=<error key>`; `updated` from this screen's own save.
 */
type PhotoFailure =
  | { kind: 'created'; errorKey: string }
  | { kind: 'updated'; error: unknown }

/**
 * Edits a record of the type (J3), titled with its code. Every field may
 * change, including the activity; the `PUT` replaces all of them, so what
 * is emptied is cleared. Saved, it goes back to the tab with the message.
 *
 * A type with a photo (FR-020) sends the picked one after the `PUT` (D-2):
 * if that upload fails, the screen stays, with the data saved and the
 * notice, so the photo can be sent again. "Remover foto" is confirmed and
 * removes it at once (D-7), then goes back to the tab with the message.
 */
function EditEvaluation({
  definition,
}: {
  definition: EvaluationWebDefinition
}) {
  const t = useTranslations('evaluations')
  const te = useTranslations('errors')
  const router = useRouter()
  const pathname = usePathname()
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
  const photoUpload = useEvaluationPhotoUpload(definition)
  const photoRemove = useEvaluationPhotoRemove(definition)
  // Covers the PUT and the upload after it: neither mutation is pending in
  // between, and the form must stay locked meanwhile (§12).
  const [isSaving, setIsSaving] = useState(false)
  const [photoFailure, setPhotoFailure] = useState<PhotoFailure | null>(null)
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false)

  const record = detail.data

  const initialValues = useMemo(
    () => (record ? definition.form.toFormValues(record) : undefined),
    [definition, record]
  )
  const currentPhoto = useEvaluationFormPhoto(definition, record)
  const photoDownload = useEvaluationPhotoDownload(definition, record)

  // `?photoFailed=` is shown once and dropped from the URL, like `?created=`
  // on the tab, so a reload does not show it again.
  const photoFailedParam = searchParams.get(PHOTO_FAILED_PARAM)
  useEffect(() => {
    if (photoFailedParam === null) return

    setPhotoFailure({ kind: 'created', errorKey: photoFailedParam })
    const params = new URLSearchParams(searchParams.toString())
    params.delete(PHOTO_FAILED_PARAM)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [photoFailedParam, pathname, router, searchParams])

  async function invalidateRecord(recordId: string) {
    await queryClient.invalidateQueries({
      queryKey: definition.detailQueryKey(recordId),
    })
    await queryClient.invalidateQueries({
      queryKey: definition.listQueryKey(),
    })
  }

  async function handleSubmit(data: unknown, files?: EvaluationFormFiles) {
    setIsSaving(true)
    try {
      return await save(data, files)
    } finally {
      setIsSaving(false)
    }
  }

  async function save(data: unknown, files?: EvaluationFormFiles) {
    if (!record) return false

    setPhotoFailure(null)
    photoDownload.clearError()

    try {
      await update(record.id, definition.form.toInput(data))
    } catch {
      // Shown from the mutation state, translated — a 404 when the record
      // was deleted meanwhile (§12).
      return false
    }

    const photo = files?.photo
    if (photo && photoUpload) {
      try {
        await photoUpload.upload(record.id, photo)
      } catch (uploadError) {
        // The data is saved, the photo is not (H-2): the screen stays, with
        // the photo still picked, so saving again sends it. No retry is
        // automatic.
        await invalidateRecord(record.id)
        setPhotoFailure({ kind: 'updated', error: uploadError })
        return false
      }
    }

    await invalidateRecord(record.id)
    router.push(
      evaluationsListHref(definition.type, searchParams, {
        param: 'updated',
        code: record.code,
      })
    )
    return true
  }

  /**
   * Removes the photo at once (D-7, R-9), after the confirmation; the other
   * fields are not saved. Both caches are refreshed, also on a failure (a
   * 404 when it was removed elsewhere), which the modal shows translated.
   */
  async function handleConfirmRemovePhoto() {
    if (!record || !photoRemove) return

    try {
      await photoRemove.remove(record.id)
    } catch (error) {
      void invalidateRecord(record.id)
      throw error
    }

    await invalidateRecord(record.id)
    setIsRemovingPhoto(false)
    router.push(
      evaluationsListHref(definition.type, searchParams, {
        param: 'photoRemoved',
        code: record.code,
      })
    )
  }

  function photoFailureMessage(failure: PhotoFailure, code: string) {
    if (failure.kind === 'updated') {
      return t('photoFailed.updated', {
        error: translateError(failure.error),
      })
    }

    // Only a known key is shown; anything else the URL carries is generic.
    const key = te.has(failure.errorKey as never)
      ? failure.errorKey
      : 'unexpected'
    return t('photoFailed.created', { code, error: te(key as never) })
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

  function errorMessage() {
    if (isUpdateError) return translateError(updateError)
    if (photoFailure && record) {
      return photoFailureMessage(photoFailure, record.code)
    }
    if (photoDownload.error) return translateError(photoDownload.error)
    return null
  }

  return (
    <>
      <Form
        key={`${definition.type}:${record.id}`}
        code={record.code}
        initialValues={initialValues}
        activities={activities}
        listHref={listHref}
        isSubmitting={isPending || isSaving}
        errorMessage={errorMessage()}
        onSubmit={handleSubmit}
        {...(definition.photo && {
          currentPhoto,
          onRemovePhoto: () => setIsRemovingPhoto(true),
          onDownloadPhoto: () => void photoDownload.download(),
          isDownloadingPhoto: photoDownload.isDownloading,
        })}
      />

      {definition.photo && (
        <RemoveEvaluationPhotoModal
          code={isRemovingPhoto ? record.code : null}
          onConfirm={handleConfirmRemovePhoto}
          onClose={() => setIsRemovingPhoto(false)}
        />
      )}
    </>
  )
}
