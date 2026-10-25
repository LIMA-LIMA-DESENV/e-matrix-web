'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getGetProgramsQueryKey, usePostPrograms } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ProgramForm } from '../_form/ProgramForm'
import type { ProgramFormData } from '../_form/schema'

const LIST_HREF = '/programa'

export default function CreateProgramPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()

  // A Viewer reaching this URL directly goes back to the listing (FR-020,
  // AC-001). The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(LIST_HREF)
    }
  }, [canEdit, router])

  const { mutateAsync, isPending, isError, error } = usePostPrograms()

  async function handleSubmit(data: ProgramFormData, file?: File) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          ...data,
          // Undefined leaves the part out of the multipart body entirely,
          // which is what "no file" means to the API (FR-013).
          file,
        },
      })
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetProgramsQueryKey() })
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
    <ProgramForm
      mode="create"
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
