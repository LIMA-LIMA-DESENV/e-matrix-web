import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetMeetingsIdQueryKey,
  getGetMeetingsQueryKey,
  type getMeetingsIdResponse,
  type Meeting,
  useDeleteMeetingsIdFilesAttachment,
} from '@/http/api'
import type { MeetingAttachmentKey } from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

type MeetingRef = Pick<Meeting, 'id' | 'name'>

interface RemoveMeetingFileModalProps {
  /** The meeting whose attachment to remove; `null` keeps it closed. */
  record: MeetingRef | null
  /** Which attachment to remove; `null` keeps it closed. */
  attachment: MeetingAttachmentKey | null
  onClose: () => void
  /** Called after the API removed the file and the caches were updated. */
  onRemoved: (attachment: MeetingAttachmentKey) => void
}

/**
 * Explicit confirmation for removing **one** attachment of a meeting (R-18,
 * FR-025). The modal names the attachment, because the removal keeps no copy
 * and the minutes are the record of decisions (RK-6); the meeting and the
 * other attachment stay. The API answers 200 with the updated meeting, which
 * goes straight into the detail cache; a 404 (no file any more) is shown
 * translated.
 */
export function RemoveMeetingFileModal({
  record,
  attachment,
  onClose,
  onRemoved,
}: RemoveMeetingFileModalProps) {
  if (!record || !attachment) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveMeetingFileDialog
      key={`${record.id}:${attachment}`}
      record={record}
      attachment={attachment}
      onClose={onClose}
      onRemoved={onRemoved}
    />
  )
}

function RemoveMeetingFileDialog({
  record,
  attachment,
  onClose,
  onRemoved,
}: RemoveMeetingFileModalProps & {
  record: MeetingRef
  attachment: MeetingAttachmentKey
}) {
  const t = useTranslations(`meetings.removeFile.${attachment}`)
  const tr = useTranslations('meetings.removeFile')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [removeError, setRemoveError] = useState<unknown>(null)

  const { mutateAsync: removeFile, isPending } =
    useDeleteMeetingsIdFilesAttachment()

  async function handleConfirm() {
    setRemoveError(null)

    let response: Awaited<ReturnType<typeof removeFile>>

    try {
      response = await removeFile({ id: record.id, attachment })
    } catch (error) {
      setRemoveError(error)
      // The file may have been removed elsewhere (404): refresh both caches
      // so the screen stops offering a file that no longer exists.
      void queryClient.invalidateQueries({
        queryKey: getGetMeetingsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetMeetingsQueryKey(),
      })
      return
    }

    // The meeting comes back with this attachment `null` and the other one
    // intact (D-11): no second request for the detail. Every period slice of
    // the listing is refreshed.
    if (response.status === 200) {
      queryClient.setQueryData<getMeetingsIdResponse>(
        getGetMeetingsIdQueryKey(record.id),
        response
      )
    }
    await queryClient.invalidateQueries({
      queryKey: getGetMeetingsQueryKey(),
    })
    onRemoved(attachment)
  }

  const strong = (chunks: ReactNode) => (
    <span className="font-bold text-on-surface">{chunks}</span>
  )

  return (
    <ConfirmActionModal
      open
      title={t('title')}
      description={
        <div className="space-y-3">
          <p>{t.rich('question', { name: record.name, strong })}</p>
          <p>{t('description')}</p>
        </div>
      }
      confirmLabel={t('confirm')}
      pendingLabel={tr('removing')}
      destructive
      isSubmitting={isPending}
      errorMessage={removeError ? translateError(removeError) : null}
      onCancel={() => {
        if (!isPending) onClose()
      }}
      onConfirm={handleConfirm}
    />
  )
}
