'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ConfirmActionModal } from '@/components/list'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { getGetProgramsQueryKey, usePostProgramsReset } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

interface ResetProgramsActionProps {
  /** Called after the API reset the items and the list was invalidated. */
  onReset: () => void
}

/**
 * Legacy "Redefinir registros de programas" (R-16): replaces every program
 * item, and its attachment, with the five default items. Admin only (D-6);
 * the confirmation spells out the loss (RK-1). On error the modal stays open
 * with the translated message, and the server left the list untouched.
 */
export function ResetProgramsAction({ onReset }: ResetProgramsActionProps) {
  const t = useTranslations('parameters.resetPrograms')
  const { isAdmin } = useAuth()
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [resetError, setResetError] = useState<unknown>(null)

  const { mutate: resetPrograms, isPending } = usePostProgramsReset({
    mutation: {
      // `/programa` would keep showing the old items until a reload
      // otherwise. Returned, so the action stays pending until it is done.
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetProgramsQueryKey() }),
    },
  })

  if (!isAdmin) return null

  // `mutate`, not `mutateAsync`: the modal's double-submit guard is released
  // as soon as this returns, so the error render enables the buttons again.
  function handleConfirm() {
    setResetError(null)
    resetPrograms(undefined, {
      onSuccess: () => {
        setOpen(false)
        onReset()
      },
      onError: (error) => setResetError(error),
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        color="error"
        onClick={() => {
          setResetError(null)
          setOpen(true)
        }}
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          restart_alt
        </span>
        {t('action')}
      </Button>

      <ConfirmActionModal
        open={open}
        title={t('title')}
        description={
          <div className="space-y-3">
            <p>{t('question')}</p>
            <p>{t('description')}</p>
          </div>
        }
        confirmLabel={t('confirm')}
        pendingLabel={t('resetting')}
        destructive
        isSubmitting={isPending}
        errorMessage={resetError ? translateError(resetError) : null}
        onCancel={() => {
          if (!isPending) setOpen(false)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
