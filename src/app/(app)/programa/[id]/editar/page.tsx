'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetProgramsIdQueryKey,
  getGetProgramsQueryKey,
  useGetProgramsId,
  usePutProgramsId,
} from '@/http/api'
import { downloadProgramFile } from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'
import { ProgramForm } from '../../_form/ProgramForm'
import { RemoveProgramFileModal } from '../../_form/RemoveProgramFileModal'
import type { ProgramFormData, ProgramFormValues } from '../../_form/schema'
import { DeleteProgramModal, type ProgramRef } from '../../components'

const LIST_HREF = '/programa'

function EditProgramSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-40 rounded-md bg-surface-container-high" />
        <div className="h-10 w-72 rounded-md bg-surface-container-high" />
      </div>
      <div className="h-96 rounded-xl bg-surface-container-high" />
    </div>
  )
}

export default function EditProgramPage() {
  const t = useTranslations('programs.form')
  const router = useRouter()
  const { id: programId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRemoveFileOpen, setIsRemoveFileOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  // A Viewer reaching this URL directly goes back to the listing (FR-020,
  // AC-001), before any write request is even possible. The real guard is
  // the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(LIST_HREF)
    }
  }, [canEdit, router])

  const {
    data: programResponse,
    isLoading,
    isError,
    refetch,
  } = useGetProgramsId(programId, {
    query: { enabled: canEdit && !!programId },
  })

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutProgramsId()

  const record =
    programResponse?.status === 200 ? programResponse.data : undefined

  const initialValues = useMemo<ProgramFormValues | undefined>(
    () =>
      record
        ? {
            type: record.type,
            question: record.question,
            description: record.description,
            actions: record.actions,
            responsible: record.responsible,
            target_date: record.target_date,
            completed_percentage: String(record.completed_percentage),
          }
        : undefined,
    [record]
  )

  async function handleSubmit(data: ProgramFormData, file?: File) {
    try {
      await mutateAsync({
        id: programId,
        data: {
          ...data,
          // Undefined leaves the part out, which is what keeps the current
          // file intact (R-11, FR-014). Never send an empty File here.
          file,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetProgramsIdQueryKey(programId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetProgramsQueryKey() })
    router.push(`${LIST_HREF}?updated=${encodeURIComponent(programId)}`)
  }

  function handleDeleted(deleted: ProgramRef) {
    setIsDeleteOpen(false)
    // Items have no name; the type is what the feedback names (R-7).
    router.push(`${LIST_HREF}?deleted=${encodeURIComponent(deleted.type)}`)
  }

  function handleFileRemoved() {
    setIsRemoveFileOpen(false)
    // The item stays — only its file is gone — so the listing is where the
    // result shows, as in Documentos.
    router.push(`${LIST_HREF}?fileRemoved=${encodeURIComponent(programId)}`)
  }

  async function handleDownloadFile() {
    if (!record?.file || isDownloading) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      await downloadProgramFile(record)
    } catch (error) {
      setDownloadError(error)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!canEdit) {
    return null
  }

  if (isLoading) {
    return <EditProgramSkeleton />
  }

  if (isError || !record || !initialValues) {
    return (
      <ListErrorState title={t('loadError')} onRetry={() => void refetch()} />
    )
  }

  const errorSource = isUpdateError ? updateError : downloadError
  const errorMessage = errorSource ? translateError(errorSource) : null

  return (
    <>
      <ProgramForm
        mode="edit"
        initialValues={initialValues}
        currentFile={record.file}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteOpen(true)}
        onRemoveFile={record.file ? () => setIsRemoveFileOpen(true) : undefined}
        onDownloadFile={() => void handleDownloadFile()}
        isDownloadingFile={isDownloading}
      />

      <RemoveProgramFileModal
        record={isRemoveFileOpen ? record : null}
        onClose={() => setIsRemoveFileOpen(false)}
        onRemoved={handleFileRemoved}
      />

      <DeleteProgramModal
        record={isDeleteOpen ? record : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
