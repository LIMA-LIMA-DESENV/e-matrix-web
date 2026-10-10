'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'

import { ListErrorState } from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetUsersIdQueryKey,
  getGetUsersQueryKey,
  UserRole,
  useGetUsersId,
  usePutUsersId,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'
import type { UserFormData } from '../../_form/schema'
import { UserForm } from '../../_form/UserForm'

function EditUserSkeleton() {
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

export default function EditUserPage() {
  const t = useTranslations('users.form')
  const router = useRouter()
  const { id: userId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const translateError = useTranslateError()
  const { isAdmin, user: currentUser } = useAuth()

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const {
    data: userResponse,
    isLoading,
    isError,
    refetch,
  } = useGetUsersId(userId, {
    query: { enabled: isAdmin && !!userId },
  })

  const {
    mutateAsync,
    isPending,
    isError: isUpdateError,
    error: updateError,
  } = usePutUsersId()

  const user = userResponse?.status === 200 ? userResponse.data : undefined

  const initialValues = useMemo<UserFormData | undefined>(
    () =>
      user
        ? {
            name: user.name ?? '',
            email: user.email ?? '',
            role: user.role ?? UserRole.viewer,
            password: '',
          }
        : undefined,
    [user]
  )

  // The session has no user id; the e-mail identifies the current user here
  // and the API enforces the rule anyway.
  const isCurrentUser = !!user?.email && user.email === currentUser?.email

  async function handleSubmit(data: UserFormData) {
    try {
      await mutateAsync({
        id: userId,
        data: {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role,
        },
      })
    } catch {
      return
    }

    await queryClient.invalidateQueries({
      queryKey: getGetUsersIdQueryKey(userId),
    })
    await queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() })
    router.push('/usuarios')
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return <EditUserSkeleton />
  }

  if (isError || !initialValues) {
    return (
      <ListErrorState title={t('loadError')} onRetry={() => void refetch()} />
    )
  }

  return (
    <UserForm
      mode="edit"
      initialValues={initialValues}
      isCurrentUser={isCurrentUser}
      isSubmitting={isPending}
      errorMessage={isUpdateError ? translateError(updateError) : null}
      onSubmit={handleSubmit}
    />
  )
}
