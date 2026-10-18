'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetMeetingsQueryKey,
  type Period,
  useGetPeriods,
  usePostMeetings,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import {
  MEETINGS_LIST_PATH,
  meetingsListHref,
  meetingsListHrefAfterSave,
} from '../_form/list-href'
import { MeetingForm, type MeetingFormFiles } from '../_form/MeetingForm'
import type { MeetingFormData } from '../_form/schema'

function MeetingFormSkeleton() {
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

export default function CreateMeetingPage() {
  return (
    <Suspense fallback={<MeetingFormSkeleton />}>
      <CreateMeeting />
    </Suspense>
  )
}

function CreateMeeting() {
  const t = useTranslations('meetings')
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()

  // A Viewer reaching this URL directly goes back to the listing (FR-026).
  // The real guard is the API, which answers 403.
  useEffect(() => {
    if (!canEdit) {
      router.replace(MEETINGS_LIST_PATH)
    }
  }, [canEdit, router])

  // The date is checked against these, so the form waits for them (FR-025).
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

  const { mutateAsync, isPending, isError, error } = usePostMeetings()

  async function handleSubmit(data: MeetingFormData, files: MeetingFormFiles) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          type: data.type,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          subject: data.subject,
          status: data.status,
          // An attachment not picked stays undefined, which leaves its part
          // out of the multipart body entirely: "no file" to the API (FR-011).
          presence_list: files.presence_list,
          minutes: files.minutes,
        },
      })
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state, translated — including a period
      // deleted after this screen loaded, which only the API can see.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey() })
    router.push(
      createdId
        ? meetingsListHrefAfterSave(searchParams, periods, data.date, {
            param: 'created',
            value: createdId,
          })
        : meetingsListHref(searchParams)
    )
  }

  if (!canEdit) {
    return null
  }

  if (isPeriodsLoading) {
    return <MeetingFormSkeleton />
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
    <MeetingForm
      mode="create"
      periods={periods}
      listHref={meetingsListHref(searchParams)}
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
