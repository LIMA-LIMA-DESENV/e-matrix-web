'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetDocumentsIdQueryKey,
  getGetDocumentsQueryKey,
  useGetDocumentsId,
  usePutDocumentsId,
} from '@/http/api'
import { downloadDocumentFile } from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'
import { DocumentForm } from '../../_form/DocumentForm'
import { RemoveDocumentFileModal } from '../../_form/RemoveDocumentFileModal'
import type { DocumentFormData } from '../../_form/schema'
import { DeleteDocumentModal } from '../../components'

const LIST_HREF = '/documentos'

function EditDocumentSkeleton() {
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

export default function EditDocumentPage() {
  const t = useTranslations('documents.form')
  const router = useRouter()
  const { id: documentId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRemoveFileOpen, setIsRemoveFileOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  // A Viewer reaching this URL directly goes back to the listing (FR-024),
  // before any write request is even possible. The real guard is the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(LIST_HREF)
    }
  }, [canEdit, router])

  const {
    data: documentResponse,
    isLoading,
    isError,
    refetch,
  } = useGetDocumentsId(documentId, {
    query: { enabled: canEdit && !!documentId },
  })

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutDocumentsId()

  const record =
    documentResponse?.status === 200 ? documentResponse.data : undefined

  const initialValues = useMemo<DocumentFormData | undefined>(
    () =>
      record
        ? {
            material: record.material,
            name: record.name,
            responsible: record.responsible,
            date: record.date,
          }
        : undefined,
    [record]
  )

  async function handleSubmit(data: DocumentFormData, file?: File) {
    try {
      await mutateAsync({
        id: documentId,
        data: {
          material: data.material,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          // Undefined leaves the part out, which is what keeps the current
          // file intact (FR-011, D-8, J6). Never send an empty File here.
          file,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetDocumentsIdQueryKey(documentId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey() })
    router.push(`${LIST_HREF}?updated=${encodeURIComponent(documentId)}`)
  }

  function handleDeleted(deleted: { name: string }) {
    setIsDeleteOpen(false)
    router.push(`${LIST_HREF}?deleted=${encodeURIComponent(deleted.name)}`)
  }

  function handleFileRemoved() {
    setIsRemoveFileOpen(false)
    // The document stays — only its file is gone — so the listing is where
    // the result shows: the row remains, now without the download (AC-022).
    router.push(`${LIST_HREF}?fileRemoved=${encodeURIComponent(documentId)}`)
  }

  async function handleDownloadFile() {
    if (!record?.file || isDownloading) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      await downloadDocumentFile(record)
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
    return <EditDocumentSkeleton />
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
      <DocumentForm
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

      <RemoveDocumentFileModal
        record={isRemoveFileOpen ? record : null}
        onClose={() => setIsRemoveFileOpen(false)}
        onRemoved={handleFileRemoved}
      />

      <DeleteDocumentModal
        record={isDeleteOpen ? record : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
