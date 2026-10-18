import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetMeetingsIdQueryKey,
  getGetMeetingsQueryKey,
  type Meeting,
  useDeleteMeetingsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface DeleteMeetingModalProps {
  /** The meeting to delete; `null` keeps the modal closed. */
  record: Pick<Meeting, 'id' | 'name'> | null
  onClose: () => void
  /** Called after the API deleted it and the list was invalidated. */
  onDeleted: (record: Pick<Meeting, 'id' | 'name'>) => void
}

/**
 * Confirms a meeting deletion, warning that it is final and that the
 * attendance list and the minutes go with it, with no copy kept (R-23, RK-6).
 * There is **no dependency check**: no module points at a meeting, so deletion
 * is never blocked (FR-018). Offered on the listing and on the edit page. A
 * 404 (already deleted in another tab) is shown translated and the list is
 * refreshed.
 */
export function DeleteMeetingModal({
  record,
  onClose,
  onDeleted,
}: DeleteMeetingModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteMeetingDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteMeetingDialog({
  record,
  onClose,
  onDeleted,
}: DeleteMeetingModalProps & { record: Pick<Meeting, 'id' | 'name'> }) {
  const t = useTranslations('meetings.delete')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const { mutateAsync: deleteMeeting, isPending } = useDeleteMeetingsId()

  async function handleConfirm() {
    setDeleteError(null)

    try {
      await deleteMeeting({ id: record.id })
    } catch (error) {
      setDeleteError(error)
      void queryClient.invalidateQueries({
        queryKey: getGetMeetingsQueryKey(),
      })
      return
    }

    queryClient.removeQueries({
      queryKey: getGetMeetingsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetMeetingsQueryKey(),
    })
    onDeleted(record)
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
      pendingLabel={t('deleting')}
      destructive
      isSubmitting={isPending}
      errorMessage={deleteError ? translateError(deleteError) : null}
      onCancel={() => {
        if (!isPending) onClose()
      }}
      onConfirm={handleConfirm}
    />
  )
}
