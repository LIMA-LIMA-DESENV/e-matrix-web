'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetTrainingsQueryKey,
  type Period,
  useGetPeriods,
  usePostTrainings,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import {
  TRAININGS_LIST_PATH,
  trainingsListHref,
  trainingsListHrefAfterSave,
} from '../_form/list-href'
import type { TrainingFormData } from '../_form/schema'
import { TrainingForm } from '../_form/TrainingForm'

function TrainingFormSkeleton() {
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

export default function CreateTrainingPage() {
  return (
    <Suspense fallback={<TrainingFormSkeleton />}>
      <CreateTraining />
    </Suspense>
  )
}

function CreateTraining() {
  const t = useTranslations('trainings')
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()

  // A Viewer reaching this URL directly goes back to the listing (FR-027).
  // The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(TRAININGS_LIST_PATH)
    }
  }, [canEdit, router])

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

  const { mutateAsync, isPending, isError, error } = usePostTrainings()

  async function handleSubmit(data: TrainingFormData, file?: File) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          content: data.content,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          subject: data.subject,
          status: data.status,
          // Undefined leaves the part out of the multipart body entirely,
          // which is what "no file" means to the API (FR-011, R-15).
          file,
        },
      })
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state, translated — including a period
      // deleted after this screen loaded, which only the API can see.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetTrainingsQueryKey() })
    router.push(
      createdId
        ? trainingsListHrefAfterSave(searchParams, periods, data.date, {
            param: 'created',
            value: createdId,
          })
        : trainingsListHref(searchParams)
    )
  }

  if (!canEdit) {
    return null
  }

  if (isPeriodsLoading) {
    return <TrainingFormSkeleton />
  }

  if (isPeriodsError || periodsResponse?.status !== 200) {
    return (
      <ListErrorState
        title={t('loadErrorTitle')}
        onRetry={() => void refetchPeriods()}
      />
    )
  }

  return (
    <TrainingForm
      mode="create"
      periods={periods}
      listHref={trainingsListHref(searchParams)}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
