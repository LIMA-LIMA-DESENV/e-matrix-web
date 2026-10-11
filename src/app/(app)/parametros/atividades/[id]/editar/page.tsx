'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetActivitiesIdQueryKey,
  getGetActivitiesQueryKey,
  useGetActivitiesId,
  usePutActivitiesId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ActivityForm } from '../../_form/ActivityForm'
import type { ActivityFormData } from '../../_form/schema'
import { DeleteActivityModal } from '../../components'

const LIST_HREF = '/parametros/atividades'

function EditActivitySkeleton() {
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

export default function EditActivityPage() {
  const t = useTranslations('activities.form')
  const router = useRouter()
  const { id: activityId } = useParams<{ id: string }>()
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
    data: activityResponse,
    isLoading,
    isError,
    refetch,
  } = useGetActivitiesId(activityId, {
    query: { enabled: isAdmin && !!activityId },
  })

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutActivitiesId()

  const activity =
    activityResponse?.status === 200 ? activityResponse.data : undefined

  const initialValues = useMemo<ActivityFormData | undefined>(
    () =>
      activity
        ? {
            code: activity.code,
            name: activity.name,
            fabric: activity.fabric,
            line: activity.line,
            area: activity.area,
            function: activity.function,
          }
        : undefined,
    [activity]
  )

  async function handleSubmit(data: ActivityFormData) {
    try {
      await mutateAsync({
        id: activityId,
        // `function` is never destructured: it is not a valid variable name.
        data: {
          code: data.code,
          name: data.name,
          fabric: data.fabric,
          line: data.line,
          area: data.area,
          function: data.function,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetActivitiesIdQueryKey(activityId),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetActivitiesQueryKey(),
    })
    router.push(`${LIST_HREF}?updated=${encodeURIComponent(activityId)}`)
  }

  function handleDeleted(deleted: { name: string }) {
    setIsDeleteOpen(false)
    router.push(`${LIST_HREF}?deleted=${encodeURIComponent(deleted.name)}`)
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return <EditActivitySkeleton />
  }

  if (isError || !activity || !initialValues) {
    return (
      <ListErrorState title={t('loadError')} onRetry={() => void refetch()} />
    )
  }

  return (
    <>
      {/* No linked records panel here, on purpose (D-8): changing an activity
          never undoes a link, so the counts only matter when deleting. */}
      <ActivityForm
        mode="edit"
        initialValues={initialValues}
        isSubmitting={isPending}
        errorMessage={isUpdateError ? translateError(updateError) : null}
        onSubmit={handleSubmit}
        onDelete={() => setIsDeleteOpen(true)}
      />

      <DeleteActivityModal
        activity={isDeleteOpen ? activity : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  )
}
