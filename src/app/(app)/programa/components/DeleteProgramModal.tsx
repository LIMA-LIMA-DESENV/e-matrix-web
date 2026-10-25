import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetProgramsIdQueryKey,
  getGetProgramsQueryKey,
  type Program,
  useDeleteProgramsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { useProgramTypeLabel } from './ProgramTypeLabel'

export type ProgramRef = Pick<Program, 'id' | 'type' | 'question'>

interface DeleteProgramModalProps {
  /** The item to delete; `null` keeps the modal closed. */
  record: ProgramRef | null
  onClose: () => void
  /** Called after the API deleted it and the list was invalidated. */
  onDeleted: (record: ProgramRef) => void
}

/**
 * Confirms an item deletion, warning that it is final and takes the
 * attachment with it (R-12). Nothing points at an item, so deletion is never
 * blocked (FR-017) and nothing is fetched beforehand. Several items may share
 * a type, so the question is shown too, to tell them apart. A 404 (already
 * deleted in another tab) is shown translated and the list is refreshed.
 */
export function DeleteProgramModal({
  record,
  onClose,
  onDeleted,
}: DeleteProgramModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <DeleteProgramDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  )
}

function DeleteProgramDialog({
  record,
  onClose,
  onDeleted,
}: DeleteProgramModalProps & { record: ProgramRef }) {
  const t = useTranslations('programs.delete')
  const typeLabel = useProgramTypeLabel()
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [deleteError, setDeleteError] = useState<unknown>(null)

  const { mutateAsync: deleteProgram, isPending } = useDeleteProgramsId()

  async function handleConfirm() {
    setDeleteError(null)

    try {
      await deleteProgram({ id: record.id })
    } catch (error) {
      setDeleteError(error)
      void queryClient.invalidateQueries({
        queryKey: getGetProgramsQueryKey(),
      })
      return
    }

    queryClient.removeQueries({
      queryKey: getGetProgramsIdQueryKey(record.id),
    })
    // The list carries the score, so refetching it recalculates it (AC-010).
    await queryClient.invalidateQueries({
      queryKey: getGetProgramsQueryKey(),
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
          <p>{t.rich('question', { type: typeLabel(record.type), strong })}</p>
          <p className="line-clamp-3 break-words italic">{record.question}</p>
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
