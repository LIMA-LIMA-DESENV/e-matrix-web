'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getGetPeriodsQueryKey, usePostPeriods } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { PeriodForm } from '../_form/PeriodForm'
import type { PeriodFormData } from '../_form/schema'

export default function CreatePeriodPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const { mutateAsync, isPending, isError, error } = usePostPeriods()

  async function handleSubmit(data: PeriodFormData) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
        data: {
          description: data.description,
          // Calendar days go as typed (`YYYY-MM-DD`), never through Date.
          start_date: data.start_date,
          end_date: data.end_date,
        },
      })
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetPeriodsQueryKey() })
    router.push(
      createdId
        ? `/parametros/periodos?created=${encodeURIComponent(createdId)}`
        : '/parametros/periodos'
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <PeriodForm
      mode="create"
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
