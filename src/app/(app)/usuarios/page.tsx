'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo, useState } from 'react'

import {
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  paginate,
  type RowActionsMenuProps,
  sortItems,
  useListState,
} from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import {
  getGetUsersQueryKey,
  useDeleteUsersId,
  useGetUsers,
  usePostUsersIdReactivate,
} from '@/http/api'
import { useTranslateError } from '@/lib/error-translator'

import {
  getUserExitAction,
  matchesUserSearch,
  type RuntimeUser,
  USER_LIST_CONFIG,
  type UserLifecycleAction,
  UserLifecycleModal,
  UsersFilterBar,
  UsersHeader,
  UsersTable,
  userSortColumns,
  useUserTableColumns,
} from './components'

interface PendingLifecycle {
  user: RuntimeUser
  action: UserLifecycleAction
}

export default function UsuariosPage() {
  const columns = useUserTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <UsersList />
    </Suspense>
  )
}

function UsersList() {
  const t = useTranslations('users')
  const tc = useTranslations('common')
  const translateError = useTranslateError()
  const columns = useUserTableColumns()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAdmin, user: currentUser } = useAuth()
  const list = useListState(USER_LIST_CONFIG)
  const [pendingLifecycle, setPendingLifecycle] =
    useState<PendingLifecycle | null>(null)
  const [lifecycleErrorMessage, setLifecycleErrorMessage] = useState<
    string | null
  >(null)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useGetUsers({
    query: {
      enabled: isAdmin,
    },
  })

  const { mutateAsync: inactivateUser, isPending: isInactivating } =
    useDeleteUsersId()
  const { mutateAsync: reactivateUser, isPending: isReactivating } =
    usePostUsersIdReactivate()
  const isLifecycleSubmitting = isInactivating || isReactivating

  const users = useMemo(
    () =>
      usersResponse?.status === 200
        ? (usersResponse.data as RuntimeUser[])
        : [],
    [usersResponse]
  )

  const { q: search, sortState } = list

  const visibleUsers = useMemo(() => {
    const filtered = users.filter((user) => matchesUserSearch(user, search))

    return sortItems(
      filtered,
      userSortColumns,
      sortState,
      USER_LIST_CONFIG.defaultSort
    )
  }, [users, search, sortState])

  const pageData = paginate(visibleUsers, list.page)

  function openEdit(user: RuntimeUser) {
    router.push(`/usuarios/${user.id}/editar`)
  }

  function openLifecycleModal(user: RuntimeUser, action: UserLifecycleAction) {
    setLifecycleErrorMessage(null)
    setPendingLifecycle({ user, action })
  }

  function closeLifecycleModal() {
    if (isLifecycleSubmitting) {
      return
    }

    setPendingLifecycle(null)
    setLifecycleErrorMessage(null)
  }

  function getRowActions(user: RuntimeUser): RowActionsMenuProps {
    if (!isAdmin) return {}

    const exitAction = getUserExitAction(
      user,
      user.email === currentUser?.email
    )

    return {
      edit: [
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(user) },
      ],
      exit:
        exitAction === 'inactivate'
          ? [
              {
                label: t('inactivate'),
                icon: 'person_off',
                onSelect: () => openLifecycleModal(user, 'inactivate'),
              },
            ]
          : exitAction === 'reactivate'
            ? [
                {
                  label: t('reactivate'),
                  icon: 'how_to_reg',
                  onSelect: () => openLifecycleModal(user, 'reactivate'),
                },
              ]
            : [],
    }
  }

  async function handleConfirmLifecycle() {
    if (!pendingLifecycle || isLifecycleSubmitting) {
      return
    }

    const { user, action } = pendingLifecycle

    try {
      if (action === 'inactivate') {
        await inactivateUser({ id: user.id })
        setFeedback({
          tone: 'success',
          text: t('inactivated', { name: user.name }),
        })
      } else {
        await reactivateUser({ id: user.id })
        setFeedback({
          tone: 'success',
          text: t('reactivated', { name: user.name }),
        })
      }

      await queryClient.invalidateQueries({
        queryKey: getGetUsersQueryKey(),
      })
      setPendingLifecycle(null)
      setLifecycleErrorMessage(null)
    } catch (error) {
      setLifecycleErrorMessage(translateError(error))
      // The user may have changed elsewhere (e.g. 409 already inactive/active);
      // refresh the list so the row reflects the current status.
      void queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() })
    }
  }

  function renderContent() {
    if (isUsersLoading) {
      return <ListTableSkeleton columns={columns} />
    }

    if (isUsersError) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={() => void refetchUsers()}
        />
      )
    }

    if (users.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="manage_accounts"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      )
    }

    if (visibleUsers.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('noResultsTitle')}
          description={t('noResultsDescription')}
          onClearFilters={list.clearFilters}
        />
      )
    }

    return (
      <UsersTable
        users={pageData.items}
        search={search}
        sort={sortState}
        onSort={list.toggleSort}
        onEdit={openEdit}
        getRowActions={getRowActions}
        footer={
          <ListPagination
            page={pageData.page}
            pageCount={pageData.pageCount}
            total={pageData.total}
            start={pageData.start}
            end={pageData.end}
            itemLabel={t('itemLabel', { count: pageData.total })}
            onPageChange={list.setPage}
          />
        }
      />
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div>
      <UsersHeader
        totalCount={users.length}
        onNewUser={() => router.push('/usuarios/novo')}
      />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <UsersFilterBar
        search={search}
        hasActiveFilters={list.hasActiveFilters}
        onSearchChange={list.setSearch}
        onClearFilters={list.clearFilters}
      />

      {renderContent()}

      <UserLifecycleModal
        user={pendingLifecycle?.user}
        action={pendingLifecycle?.action ?? 'inactivate'}
        isSubmitting={isLifecycleSubmitting}
        errorMessage={lifecycleErrorMessage}
        onCancel={closeLifecycleModal}
        onConfirm={handleConfirmLifecycle}
      />
    </div>
  )
}
