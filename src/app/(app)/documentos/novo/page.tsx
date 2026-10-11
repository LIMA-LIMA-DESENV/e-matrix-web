'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getGetDocumentsQueryKey, usePostDocuments } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { DocumentForm } from '../_form/DocumentForm'
import type { DocumentFormData } from '../_form/schema'

const LIST_HREF = '/documentos'

export default function CreateDocumentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()

  // A Viewer reaching this URL directly goes back to the listing (FR-024).
  // The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(LIST_HREF)
    }
  }, [canEdit, router])

  const { mutateAsync, isPending, isError, error } = usePostDocuments()

  async function handleSubmit(data: DocumentFormData, file?: File) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          material: data.material,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          // Undefined leaves the part out of the multipart body entirely,
          // which is what "no file" means to the API (FR-008, D-8).
          file,
        },
      })
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey() })
    router.push(
      createdId
        ? `${LIST_HREF}?created=${encodeURIComponent(createdId)}`
        : LIST_HREF
    )
  }

  if (!canEdit) {
    return null
  }

  return (
    <DocumentForm
      mode="create"
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
