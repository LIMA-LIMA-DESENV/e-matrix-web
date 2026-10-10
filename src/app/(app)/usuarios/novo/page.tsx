'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { getGetUsersQueryKey, usePostUsers } from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import type { UserFormData } from '../_form/schema'
import { UserForm } from '../_form/UserForm'

export default function CreateUserPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const { mutateAsync, isPending, isError, error } = usePostUsers()

  async function handleSubmit(data: UserFormData) {
    try {
      await mutateAsync({
        data: {
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password ?? '',
          role: data.role,
          // Whoever receives an initial password must replace it.
          mustChangePassword: true,
        },
      })
    } catch {
      // Shown from the mutation state.
      return
    }

    await queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() })
    router.push('/usuarios')
  }

  if (!isAdmin) {
    return null
  }

  return (
    <UserForm
      mode="create"
      isSubmitting={isPending}
      errorMessage={isError ? translateError(error) : null}
      onSubmit={handleSubmit}
    />
  )
}
