'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetMeetingsIdQueryKey,
  getGetMeetingsQueryKey,
  type Period,
  useGetMeetingsId,
  useGetPeriods,
  usePutMeetingsId,
} from '@/http/api'
import {
  downloadMeetingFile,
  type MeetingAttachmentKey,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'
import {
  FILE_REMOVED_PARAMS,
  MEETINGS_LIST_PATH,
  meetingsListHref,
  meetingsListHrefAfterSave,
  meetingsListHrefWithFeedback,
} from '../../_form/list-href'
import { MeetingForm, type MeetingFormFiles } from '../../_form/MeetingForm'
import { RemoveMeetingFileModal } from '../../_form/RemoveMeetingFileModal'
import type { MeetingFormData } from '../../_form/schema'
import { DeleteMeetingModal } from '../../components'

function EditMeetingSkeleton() {
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

export default function EditMeetingPage() {
  return (
    <Suspense fallback={<EditMeetingSkeleton />}>
      <EditMeeting />
    </Suspense>
  )
}

function EditMeeting() {
  const t = useTranslations('meetings.form')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: meetingId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { canEdit } = useAuth()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [removingAttachment, setRemovingAttachment] =
    useState<MeetingAttachmentKey | null>(null)
  const [downloadingAttachment, setDownloadingAttachment] =
    useState<MeetingAttachmentKey | null>(null)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  // A Viewer reaching this URL directly goes back to the listing (FR-026),
  // before any write request is even possible. The real guard is the API.
  useEffect(() => {
    if (!canEdit) {
      router.replace(MEETINGS_LIST_PATH)
    }
  }, [canEdit, router])

  const {
    data: meetingResponse,
    isLoading: isMeetingLoading,
    isError: isMeetingError,
    refetch: refetchMeeting,
  } = useGetMeetingsId(meetingId, {
    query: { enabled: canEdit && !!meetingId },
  })

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

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutMeetingsId()

  const record =
    meetingResponse?.status === 200 ? meetingResponse.data : undefined

  const initialValues = useMemo<MeetingFormData | undefined>(
    () =>
      record
        ? {
            type: record.type,
            name: record.name,
            responsible: record.responsible,
            date: record.date,
            subject: record.subject,
            status: record.status,
          }
        : undefined,
    [record]
  )

  async function handleSubmit(data: MeetingFormData, files: MeetingFormFiles) {
    try {
      await mutateAsync({
        id: meetingId,
        data: {
          type: data.type,
          name: data.name,
          responsible: data.responsible,
          // Calendar day goes as typed (`YYYY-MM-DD`), never through Date.
          date: data.date,
          subject: data.subject,
          status: data.status,
          // Each attachment left blank stays undefined, which leaves its part
          // out and keeps that file intact (FR-014, J8); a picked one
          // replaces only itself (FR-015, J9). Never send an empty File.
          presence_list: files.presence_list,
          minutes: files.minutes,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetMeetingsIdQueryKey(meetingId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey() })
    router.push(
      meetingsListHrefAfterSave(searchParams, periods, data.date, {
        param: 'updated',
        value: meetingId,
      })
    )
  }

  function handleDeleted(deleted: { name: string }) {
    setIsDeleteOpen(false)
    router.push(
      meetingsListHrefWithFeedback(searchParams, {
        param: 'deleted',
        value: deleted.name,
      })
    )
  }

  function handleFileRemoved(attachment: MeetingAttachmentKey) {
    setRemovingAttachment(null)
    // The meeting and its other attachment stay, so the listing is where the
    // result shows: the row remains, without that one download (AC-026). The
    // date did not change, so the slice the user came from still has it.
    router.push(
      meetingsListHrefWithFeedback(searchParams, {
        param: FILE_REMOVED_PARAMS[attachment],
        value: meetingId,
      })
    )
  }

  async function handleDownloadFile(attachment: MeetingAttachmentKey) {
    if (!record || downloadingAttachment) return

    setDownloadError(null)
    setDownloadingAttachment(attachment)

    try {
      await downloadMeetingFile(record, attachment)
    } catch (error) {
      setDownloadError(error)
    } finally {
      setDownloadingAttachment(null)
    }
  }

  if (!canEdit) {
    return null
  }

  if (isMeetingLoading || isPeriodsLoading) {
    return <EditMeetingSkeleton />
  }

  if (
    isMeetingError ||
    isPeriodsError ||
    periodsResponse?.status !== 200 ||
    !record ||
    !initialValues
  ) {
    return (
      <ListErrorState
        title={t('loadError')}
        onRetry={() => {
          void refetchMeeting()
          void refetchPeriods()
        }}
      />
    )
  }

  const errorSource = isUpdateError ? updateError : downloadError
  const errorMessage = errorSource ? translateError(errorSource) : null

  return (
    <>
      <MeetingForm
        mode="edit"
        initialValues={initialValues}
        currentFiles={{
          'presence-list': record.presence_list,
          minutes: record.minutes,
        }}
        periods={periods}
        listHref={meetingsListHref(searchParams)}
        isSubmitting={isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteOpen(true)}
        onRemoveFile={setRemovingAttachment}
        onDownloadFile={(attachment) => void handleDownloadFile(attachment)}
        downloadingAttachment={downloadingAttachment}
      />

      <RemoveMeetingFileModal
        record={removingAttachment ? record : null}
        attachment={removingAttachment}
        onClose={() => setRemovingAttachment(null)}
        onRemoved={handleFileRemoved}
      />

      <DeleteMeetingModal
        record={isDeleteOpen ? record : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
