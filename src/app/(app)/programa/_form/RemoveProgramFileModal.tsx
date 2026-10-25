import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import {
  getGetProgramsIdQueryKey,
  getGetProgramsQueryKey,
  type Program,
  useDeleteProgramsIdFile,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import { useProgramTypeLabel } from '../components/ProgramTypeLabel'

type ProgramRef = Pick<Program, 'id' | 'type'>

interface RemoveProgramFileModalProps {
  /** The item whose file to remove; `null` keeps the modal closed. */
  record: ProgramRef | null
  onClose: () => void
  /** Called after the API removed the file and the caches were invalidated. */
  onRemoved: () => void
}

/**
 * Explicit confirmation for removing the attachment of an item (R-11,
 * FR-015). The item itself stays: this is the gesture kept separate from
 * replacing the file. The API answers 404 `Program file not found.` when
 * there is no file to remove, which the modal shows translated.
 */
export function RemoveProgramFileModal({
  record,
  onClose,
  onRemoved,
}: RemoveProgramFileModalProps) {
  if (!record) return null

  // Mounted only while open, so each opening starts clean.
  return (
    <RemoveProgramFileDialog
      key={record.id}
      record={record}
      onClose={onClose}
      onRemoved={onRemoved}
    />
  )
}

function RemoveProgramFileDialog({
  record,
  onClose,
  onRemoved,
}: RemoveProgramFileModalProps & { record: ProgramRef }) {
  const t = useTranslations('programs.removeFile')
  const typeLabel = useProgramTypeLabel()
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [removeError, setRemoveError] = useState<unknown>(null)

  const { mutateAsync: removeFile, isPending } = useDeleteProgramsIdFile()

  async function handleConfirm() {
    setRemoveError(null)

    try {
      await removeFile({ id: record.id })
    } catch (error) {
      setRemoveError(error)
      // The file may have been removed elsewhere (404): refresh both caches
      // so the screen stops offering a file that no longer exists.
      void queryClient.invalidateQueries({
        queryKey: getGetProgramsIdQueryKey(record.id),
      })
      void queryClient.invalidateQueries({
        queryKey: getGetProgramsQueryKey(),
      })
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetProgramsIdQueryKey(record.id),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetProgramsQueryKey(),
    })
    onRemoved()
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
          <p>{t('description')}</p>
        </div>
      }
      confirmLabel={t('confirm')}
      pendingLabel={t('removing')}
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
