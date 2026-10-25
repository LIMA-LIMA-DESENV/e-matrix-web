'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetMaterialReceiptsIdQueryKey,
  getGetMaterialReceiptsQueryKey,
  type getMaterialReceiptsIdResponse,
  type Period,
  useDeleteMaterialReceiptsIdFile,
  useGetMaterialReceiptsId,
  useGetPeriods,
  usePutMaterialReceiptsId,
} from '@/http/api'
import { downloadMaterialReceiptFile } from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import {
  FILE_REMOVED_PARAM,
  PROJECT_TAB_PATHS,
  projectsListHref,
  projectsListHrefAfterSave,
  projectsListHrefWithFeedback,
} from './list-href'
import { MaterialReceiptForm } from './MaterialReceiptForm'
import { ProjectFormSkeleton } from './ProjectFormSkeleton'
import { RemoveProjectFileModal } from './RemoveProjectFileModal'
import type { MaterialReceiptFormData } from './schema'

const listPath = PROJECT_TAB_PATHS.office

export function EditMaterialReceiptPage() {
  return (
    <Suspense fallback={<ProjectFormSkeleton />}>
      <EditMaterialReceipt />
    </Suspense>
  )
}

/**
 * Edits an RA (J10), titled with its code. The stored receipt form shows its
 * name with download and remove (J11); a blank file field keeps it. The
 * deletion is on the listing only (D-15).
 */
function EditMaterialReceipt() {
  const t = useTranslations('projects')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: receiptId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [isRemovingFile, setIsRemovingFile] = useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  // A Viewer reaching this URL directly goes back to the tab (FR-040),
  // before any write request is even possible. The real guard is the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(listPath)
    }
  }, [canEdit, router])

  const {
    data: receiptResponse,
    isLoading: isReceiptLoading,
    isError: isReceiptError,
    refetch: refetchReceipt,
  } = useGetMaterialReceiptsId(receiptId, {
    query: { enabled: canEdit && !!receiptId },
  })

  // The date is checked against these, so the form waits for them.
  const {
    data: periodsResponse,
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    refetch: refetchPeriods,
  } = useGetPeriods({ query: { enabled: canEdit } })

  const periods = useMemo<Period[]>(
    () => (periodsResponse?.status === 200 ? periodsResponse.data : []),
    [periodsResponse]
  )

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutMaterialReceiptsId()

  const { mutateAsync: removeFile } = useDeleteMaterialReceiptsIdFile()

  const record =
    receiptResponse?.status === 200 ? receiptResponse.data : undefined

  const initialValues = useMemo<MaterialReceiptFormData | undefined>(
    () =>
      record
        ? {
            employee: record.employee,
            employee_registry: record.employee_registry,
            date: record.date,
          }
        : undefined,
    [record]
  )

  async function handleSubmit(data: MaterialReceiptFormData, file?: File) {
    if (!record) return false

    try {
      await mutateAsync({
        id: receiptId,
        data: {
          employee: data.employee,
          employee_registry: data.employee_registry,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          // A blank field stays undefined, which leaves the part out and
          // keeps the stored form intact (R-18); a picked one replaces it.
          // Never send an empty File.
          file,
        },
      })
    } catch {
      // Shown from the mutation state.
      return false
    }

    await queryClient.invalidateQueries({
      queryKey: getGetMaterialReceiptsIdQueryKey(receiptId),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetMaterialReceiptsQueryKey(),
    })
    router.push(
      projectsListHrefAfterSave(
        listPath,
        searchParams,
        periods,
        { date: data.date, type: 'ra' },
        { param: 'updated', code: record.code }
      )
    )
    return true
  }

  /**
   * Removes the receipt form (J11). The API answers 200 with the record and
   * `file: null`, which goes straight into the detail cache; the tab is where
   * the result shows, as for the photos of an RGP/RGA. A failure (404:
   * removed elsewhere) refreshes both caches and is shown in the modal.
   */
  async function handleConfirmRemoveFile() {
    if (!record) return

    let response: Awaited<ReturnType<typeof removeFile>>

    try {
      response = await removeFile({ id: record.id })
    } catch (error) {
      void queryClient.invalidateQueries({
        queryKey: getGetMaterialReceiptsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetMaterialReceiptsQueryKey(),
      })
      throw error
    }

    if (response.status === 200) {
      queryClient.setQueryData<getMaterialReceiptsIdResponse>(
        getGetMaterialReceiptsIdQueryKey(record.id),
        response
      )
    }
    await queryClient.invalidateQueries({
      queryKey: getGetMaterialReceiptsQueryKey(),
    })

    setIsRemovingFile(false)
    router.push(
      projectsListHrefWithFeedback(listPath, searchParams, {
        param: FILE_REMOVED_PARAM,
        code: record.code,
      })
    )
  }

  async function handleDownloadFile() {
    if (!record || isDownloadingFile) return

    setDownloadError(null)
    setIsDownloadingFile(true)

    try {
      await downloadMaterialReceiptFile(record)
    } catch (error) {
      setDownloadError(error)
    } finally {
      setIsDownloadingFile(false)
    }
  }

  if (!canEdit) {
    return null
  }

  if (isReceiptLoading || isPeriodsLoading) {
    return <ProjectFormSkeleton />
  }

  if (
    isReceiptError ||
    isPeriodsError ||
    periodsResponse?.status !== 200 ||
    !record ||
    !initialValues
  ) {
    return (
      <ListErrorState
        title={t('form.loadReceiptError')}
        onRetry={() => {
          void refetchReceipt()
          void refetchPeriods()
        }}
      />
    )
  }

  const errorSource = isUpdateError ? updateError : downloadError
  const errorMessage = errorSource ? translateError(errorSource) : null

  return (
    <>
      <MaterialReceiptForm
        mode="edit"
        code={record.code}
        initialValues={initialValues}
        currentFile={record.file}
        periods={periods}
        listHref={projectsListHref(listPath, searchParams)}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onRemoveFile={() => setIsRemovingFile(true)}
        onDownloadFile={() => void handleDownloadFile()}
        isDownloadingFile={isDownloadingFile}
      />

      <RemoveProjectFileModal
        code={isRemovingFile ? record.code : null}
        fileLabel={isRemovingFile ? t('materialReceiptDetails.file') : null}
        onConfirm={handleConfirmRemoveFile}
        onClose={() => setIsRemovingFile(false)}
      />
    </>
  )
}
