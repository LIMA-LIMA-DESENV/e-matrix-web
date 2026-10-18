'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetTrainingsIdQueryKey,
  getGetTrainingsQueryKey,
  type Period,
  useGetPeriods,
  useGetTrainingsId,
  usePutTrainingsId,
} from '@/http/api'
import { downloadTrainingFile } from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'
import {
  TRAININGS_LIST_PATH,
  trainingsListHref,
  trainingsListHrefAfterSave,
  trainingsListHrefWithFeedback,
} from '../../_form/list-href'
import { RemoveTrainingFileModal } from '../../_form/RemoveTrainingFileModal'
import type { TrainingFormData } from '../../_form/schema'
import { TrainingForm } from '../../_form/TrainingForm'
import { DeleteTrainingModal } from '../../components'

function EditTrainingSkeleton() {
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

export default function EditTrainingPage() {
  return (
    <Suspense fallback={<EditTrainingSkeleton />}>
      <EditTraining />
    </Suspense>
  )
}

function EditTraining() {
  const t = useTranslations('trainings.form')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: trainingId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRemoveFileOpen, setIsRemoveFileOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  // A Viewer reaching this URL directly goes back to the listing (FR-027),
  // before any write request is even possible. The real guard is the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(TRAININGS_LIST_PATH)
    }
  }, [canEdit, router])

  const {
    data: trainingResponse,
    isLoading: isTrainingLoading,
    isError: isTrainingError,
    refetch: refetchTraining,
  } = useGetTrainingsId(trainingId, {
    query: { enabled: canEdit && !!trainingId },
  })

  // The date is checked against these, so the form waits for them (FR-026).
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
  } = usePutTrainingsId()

  const record =
    trainingResponse?.status === 200 ? trainingResponse.data : undefined

  const initialValues = useMemo<TrainingFormData | undefined>(
    () =>
      record
        ? {
            content: record.content,
            name: record.name,
            responsible: record.responsible,
            date: record.date,
            subject: record.subject,
            status: record.status,
          }
        : undefined,
    [record]
  )

  async function handleSubmit(data: TrainingFormData, file?: File) {
    try {
      await mutateAsync({
        id: trainingId,
        data: {
          content: data.content,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          subject: data.subject,
          status: data.status,
          // Undefined leaves the part out, which is what keeps the current
          // file intact (FR-014, R-18, J8). Never send an empty File here.
          file,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetTrainingsIdQueryKey(trainingId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetTrainingsQueryKey() })
    router.push(
      trainingsListHrefAfterSave(searchParams, periods, data.date, {
        param: 'updated',
        value: trainingId,
      })
    )
  }

  function handleDeleted(deleted: { name: string }) {
    setIsDeleteOpen(false)
    router.push(
      trainingsListHrefWithFeedback(searchParams, {
        param: 'deleted',
        value: deleted.name,
      })
    )
  }

  function handleFileRemoved() {
    setIsRemoveFileOpen(false)
    // The training stays — only its file is gone — so the listing is where
    // the result shows: the row remains, now without the download (AC-028).
    // The date did not change, so the slice the user came from still has it.
    router.push(
      trainingsListHrefWithFeedback(searchParams, {
        param: 'fileRemoved',
        value: trainingId,
      })
    )
  }

  async function handleDownloadFile() {
    if (!record?.file || isDownloading) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      await downloadTrainingFile(record)
    } catch (error) {
      setDownloadError(error)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!canEdit) {
    return null
  }

  if (isTrainingLoading || isPeriodsLoading) {
    return <EditTrainingSkeleton />
  }

  if (
    isTrainingError ||
    isPeriodsError ||
    periodsResponse?.status !== 200 ||
    !record ||
    !initialValues
  ) {
    return (
      <ListErrorState
        title={t('loadError')}
        onRetry={() => {
          void refetchTraining()
          void refetchPeriods()
        }}
      />
    )
  }

  const errorSource = isUpdateError ? updateError : downloadError
  const errorMessage = errorSource ? translateError(errorSource) : null

  return (
    <>
      <TrainingForm
        mode="edit"
        initialValues={initialValues}
        currentFile={record.file}
        periods={periods}
        listHref={trainingsListHref(searchParams)}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteOpen(true)}
        onRemoveFile={record.file ? () => setIsRemoveFileOpen(true) : undefined}
        onDownloadFile={() => void handleDownloadFile()}
        isDownloadingFile={isDownloading}
      />

      <RemoveTrainingFileModal
        record={isRemoveFileOpen ? record : null}
        onClose={() => setIsRemoveFileOpen(false)}
        onRemoved={handleFileRemoved}
      />

      <DeleteTrainingModal
        record={isDeleteOpen ? record : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
