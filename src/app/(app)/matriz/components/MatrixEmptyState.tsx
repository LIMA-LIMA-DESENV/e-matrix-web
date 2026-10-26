import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'

import { ConfirmActionModal, ListEmptyState } from '@/components/list'
import { Button } from '@/components/ui'
import {
  getGetMatricesPeriodIdQueryKey,
  type getMatricesPeriodIdResponse,
  type Matrix,
  usePostMatricesPeriodId,
} from '@/http/api'
import { getErrorKey, useTranslateError } from '@/lib/error-translator'

type MatrixStart = 'copy' | 'blank'

type MatrixEmptyStateProps =
  | {
      /** The Matrix of the period, not initialized. */
      matrix: Matrix
      /** The Resultados tab, where the Matrix is started. */
      variant?: 'results'
      /** Users and admins start it; the viewer sees no action (R-3). */
      canEdit: boolean
    }
  | {
      matrix: Matrix
      /**
       * The Charts tab: no action for any role, with a text pointing to the
       * Resultados tab (FR-003 of the charts).
       */
      variant: 'charts'
    }

/**
 * A period whose Matrix was not initialized. Opening it records nothing
 * (R-4). The viewer only sees this state (J2). Who edits starts it once (J3):
 * "Copiar de <period>", when there is a period to copy from, or "Começar em
 * branco", each confirmed first, with the name of the period it copies from.
 * The Matrix the API answers with replaces the cached one, so the table shows
 * up at once and the actions do not come back (R-5).
 *
 * When someone else started it meanwhile, the Matrix is read again and the
 * table shows up. When the period to copy from changed meanwhile (D-6), it is
 * read again and the new name is shown, to be confirmed again (FR-019).
 *
 * The Charts tab shows it with `variant="charts"`: no action for any role,
 * since the Matrix is started on the Resultados tab only.
 *
 * Mount it with the period id as its key, so the message of a changed origin
 * does not carry over to another period.
 */
export function MatrixEmptyState(props: MatrixEmptyStateProps) {
  const { matrix } = props
  const isCharts = props.variant === 'charts'
  const canEdit = !isCharts && props.canEdit
  const t = useTranslations('matrix')
  const tErrors = useTranslations('errors')
  const translateError = useTranslateError()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<MatrixStart | null>(null)
  const [startError, setStartError] = useState<unknown>(null)
  const [sourceChanged, setSourceChanged] = useState(false)

  const { mutateAsync: startMatrix, isPending } = usePostMatricesPeriodId()

  const { period, copy_source: copySource } = matrix
  const queryKey = getGetMatricesPeriodIdQueryKey(period.id)

  function open(start: MatrixStart) {
    setStartError(null)
    setSourceChanged(false)
    setPending(start)
  }

  async function handleConfirm() {
    if (!pending) return

    setStartError(null)

    let response: Awaited<ReturnType<typeof startMatrix>>
    try {
      response = await startMatrix({
        periodId: period.id,
        data: {
          copy_from_period_id:
            pending === 'copy' ? (copySource?.id ?? null) : null,
        },
      })
    } catch (error) {
      const key = getErrorKey(error)

      if (
        key === 'matrixAlreadyInitialized' ||
        key === 'matrixCopySourceChanged'
      ) {
        setPending(null)
        setSourceChanged(key === 'matrixCopySourceChanged')
        await queryClient.invalidateQueries({ queryKey })
        return
      }

      setStartError(error)
      if (key === 'periodNotFound') {
        void queryClient.invalidateQueries({ queryKey })
      }
      return
    }

    if (response.status === 201) {
      queryClient.setQueryData<getMatricesPeriodIdResponse>(queryKey, {
        data: response.data,
        status: 200,
        headers: response.headers,
      })
    }
    setPending(null)
  }

  const strong = (chunks: ReactNode) => (
    <span className="font-bold text-on-surface">{chunks}</span>
  )

  const actions = canEdit && (
    <div className="mt-2 flex flex-col items-center gap-4">
      {sourceChanged && (
        <p
          role="alert"
          className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
        >
          {tErrors('matrixCopySourceChanged')}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {copySource && (
          <Button type="button" onClick={() => open('copy')}>
            <span className="material-symbols-outlined text-lg" aria-hidden>
              content_copy
            </span>
            {t('start.copy', { period: copySource.description })}
          </Button>
        )}
        <Button
          type="button"
          variant={copySource ? 'outline' : 'solid'}
          color="primary"
          onClick={() => open('blank')}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            note_add
          </span>
          {t('start.blank')}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <ListEmptyState
        variant="no-records"
        icon="grid_on"
        title={t('notInitialized.title')}
        description={
          isCharts
            ? t('charts.notInitialized')
            : !canEdit
              ? t('notInitialized.description')
              : copySource
                ? t('notInitialized.editorDescription')
                : t('notInitialized.blankOnlyDescription')
        }
        action={actions || undefined}
      />

      <ConfirmActionModal
        open={pending !== null}
        title={
          pending === 'copy' ? t('start.copyTitle') : t('start.blankTitle')
        }
        description={
          <div className="space-y-3">
            <p>
              {pending === 'copy'
                ? t.rich('start.copyQuestion', {
                    source: copySource?.description ?? '',
                    period: period.description,
                    strong,
                  })
                : t.rich('start.blankQuestion', {
                    period: period.description,
                    strong,
                  })}
            </p>
            <p>{t('start.once')}</p>
          </div>
        }
        confirmLabel={
          pending === 'copy' ? t('start.copyConfirm') : t('start.blankConfirm')
        }
        pendingLabel={t('start.starting')}
        isSubmitting={isPending}
        errorMessage={startError ? translateError(startError) : null}
        onCancel={() => {
          if (!isPending) setPending(null)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
