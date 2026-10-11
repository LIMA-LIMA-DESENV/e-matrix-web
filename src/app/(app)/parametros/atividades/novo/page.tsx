'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getGetActivitiesQueryKey, usePostActivities } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import { ActivityForm } from '../_form/ActivityForm'
import type { ActivityFormData } from '../_form/schema'

export default function CreateActivityPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const { mutateAsync, isPending, isError, error } = usePostActivities()

  async function handleSubmit(data: ActivityFormData) {
    let createdId: string | null = null

    try {
      const response = await mutateAsync({
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
      if (response.status === 201) createdId = response.data.id
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetActivitiesQueryKey(),
    })
    router.push(
      createdId
        ? `/parametros/atividades?created=${encodeURIComponent(createdId)}`
        : '/parametros/atividades'
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <ActivityForm
      mode="create"
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
