'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetPeriodsIdQueryKey,
  getGetPeriodsQueryKey,
  useGetPeriodsId,
  usePutPeriodsId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { PeriodForm } from '../../_form/PeriodForm'
import type { PeriodFormData } from '../../_form/schema'
import { DeletePeriodModal, PeriodLinkedRecords } from '../../components'

const LIST_HREF = '/parametros/periodos'

function EditPeriodSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-40 rounded-md bg-surface-container-high" />
        <div className="h-10 w-72 rounded-md bg-surface-container-high" />
      </div>
      <div className="h-64 rounded-xl bg-surface-container-high" />
      <div className="h-32 rounded-xl bg-surface-container-high" />
    </div>
  )
}

export default function EditPeriodPage() {
  const t = useTranslations('periods.form')
  const router = useRouter()
  const { id: periodId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { isAdmin } = useAuth()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const {
    data: periodResponse,
    isLoading,
    isError,
    refetch,
  } = useGetPeriodsId(periodId, {
    query: { enabled: isAdmin && !!periodId },
  })

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutPeriodsId()

  const period =
    periodResponse?.status === 200 ? periodResponse.data : undefined

  const initialValues = useMemo<PeriodFormData | undefined>(
    () =>
      period
        ? {
            description: period.description,
            start_date: period.start_date,
            end_date: period.end_date,
          }
        : undefined,
    [period]
  )

  async function handleSubmit(data: PeriodFormData) {
    try {
      await mutateAsync({
        id: periodId,
        data: {
          description: data.description,
          // Calendar days go as typed (`YYYY-MM-DD`), never through Date.
          start_date: data.start_date,
          end_date: data.end_date,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetPeriodsIdQueryKey(periodId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetPeriodsQueryKey() })
    router.push(LIST_HREF)
  }

  function handleDeleted(deleted: { description: string }) {
    setIsDeleteOpen(false)
    router.push(
      `${LIST_HREF}?deleted=${encodeURIComponent(deleted.description)}`
    )
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return <EditPeriodSkeleton />
  }

  if (isError || !period || !initialValues) {
    return (
      <ListErrorState title={t('loadError')} onRetry={() => void refetch()} />
    )
  }

  return (
    <>
      <PeriodForm
        mode="edit"
        initialValues={initialValues}
        isSubmitting={isPending}
        errorMessage={isUpdateError ? translateError(updateError) : null}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteOpen(true)}
      >
        <PeriodLinkedRecords linkedRecords={period.linked_records} />
      </PeriodForm>

      <DeletePeriodModal
        period={isDeleteOpen ? period : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
