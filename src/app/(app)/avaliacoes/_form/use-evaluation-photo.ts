'use client'

import { useMemo, useState } from 'react'

import { saveBlobAsFile } from '@/lib/download-file'

import type { EvaluationWebDefinition } from '../definitions'
import type {
  EvaluationDetail,
  EvaluationFormPhoto,
  EvaluationPhotoRemoveMutation,
  EvaluationPhotoUploadMutation,
} from '../definitions/types'

/*
 * The photo's writes of a type (FR-020), or `null` for a type without a
 * photo, which then makes no photo call at all. Each hook is called only for
 * a type that has it: the generic pages are mounted with `key={type}`, so the
 * definition never changes while they live and the order of the hooks holds.
 */

/** The `PUT …/{id}/photo` of the type, or `null`. */
export function useEvaluationPhotoUpload(
  definition: EvaluationWebDefinition
): EvaluationPhotoUploadMutation | null {
  // biome-ignore lint/correctness/useHookAtTopLevel: the definition is fixed while the page is mounted (`key={type}`), so this branch never changes between renders.
  return definition.photo ? definition.photo.useUpload() : null
}

/** The `DELETE …/{id}/photo` of the type, or `null`. */
export function useEvaluationPhotoRemove(
  definition: EvaluationWebDefinition
): EvaluationPhotoRemoveMutation | null {
  // biome-ignore lint/correctness/useHookAtTopLevel: the definition is fixed while the page is mounted (`key={type}`), so this branch never changes between renders.
  return definition.photo ? definition.photo.useRemove() : null
}

/**
 * The stored photo of a record as the form shows it (FR-024): its name and a
 * loader of its thumbnail, stable per record, so `PhotoPreview` downloads it
 * once and again only when the record changes. `null` when the record has
 * no photo; `undefined` for a type without one, or before the record loads.
 */
export function useEvaluationFormPhoto(
  definition: EvaluationWebDefinition,
  record: EvaluationDetail | undefined
): EvaluationFormPhoto | null | undefined {
  const photo = definition.photo

  return useMemo(() => {
    if (!photo || !record) return undefined
    if (!record.photo) return null

    return {
      name: record.photo.name,
      load: (signal: AbortSignal) => photo.fetch(record, signal),
    }
  }, [photo, record])
}

/**
 * "Baixar foto" of the view and the edit: downloads the stored photo through
 * the type's `fetch` and saves it under the name it was uploaded with. One
 * download at a time; a failure is kept in `error`, to be shown translated.
 */
export function useEvaluationPhotoDownload(
  definition: EvaluationWebDefinition,
  record: EvaluationDetail | undefined
) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function download() {
    const photo = record?.photo
    if (!record || !photo || !definition.photo || isDownloading) return

    setError(null)
    setIsDownloading(true)
    try {
      const blob = await definition.photo.fetch(record)
      if (blob) saveBlobAsFile(blob, photo.name)
    } catch (downloadError) {
      setError(downloadError)
    } finally {
      setIsDownloading(false)
    }
  }

  return { isDownloading, error, download, clearError: () => setError(null) }
}
