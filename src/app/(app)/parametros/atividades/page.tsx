'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { type Activity, useGetActivities } from '@/http/api'

import {
  ACTIVITY_LIST_CONFIG,
  ActivitiesFilterBar,
  ActivitiesHeader,
  ActivitiesTable,
  activitySortColumns,
  DeleteActivityModal,
  matchesActivitySearch,
  useActivityTableColumns,
} from './components'

/** Set by `novo/` after a successful create: `?created=<id>`. */
const CREATED_PARAM = 'created'
/** Set by `[id]/editar/` after a successful update: `?updated=<id>`. */
const UPDATED_PARAM = 'updated'
/** Set by `[id]/editar/` after a delete: `?deleted=<name>`. */
const DELETED_PARAM = 'deleted'

type ActivityRef = Pick<Activity, 'id' | 'name'>

export default function AtividadesPage() {
  const columns = useActivityTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <ActivitiesList />
    </Suspense>
  )
}

function ActivitiesList() {
  const t = useTranslations('activities')
  const tc = useTranslations('common')
  const columns = useActivityTableColumns()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin } = useAuth()
  const list = useListState(ACTIVITY_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ActivityRef | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const {
    data: activitiesResponse,
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useGetActivities({
    query: {
      enabled: isAdmin,
    },
  })

  const activities = useMemo<Activity[]>(
    () => (activitiesResponse?.status === 200 ? activitiesResponse.data : []),
    [activitiesResponse]
  )

  // Success message after a create, an update or a delete from the edit page,
  // then the param is dropped so a reload does not show it again.
  const createdId = searchParams.get(CREATED_PARAM)
  const updatedId = searchParams.get(UPDATED_PARAM)
  const deletedName = searchParams.get(DELETED_PARAM)

  useEffect(() => {
    if (!createdId && !updatedId && !deletedName) return
    if ((createdId || updatedId) && activitiesResponse?.status !== 200) return

    const changedId = createdId ?? updatedId
    const changed = changedId
      ? activities.find((activity) => activity.id === changedId)
      : undefined
    if (changed) {
      setFeedback({
        tone: 'success',
        text: createdId
          ? t('created', { name: changed.name })
          : t('updated', { name: changed.name }),
      })
    } else if (deletedName) {
      setFeedback({
        tone: 'success',
        text: t('deleted', { name: deletedName }),
      })
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete(CREATED_PARAM)
    params.delete(UPDATED_PARAM)
    params.delete(DELETED_PARAM)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }, [
    createdId,
    updatedId,
    deletedName,
    activities,
    activitiesResponse,
    pathname,
    router,
    searchParams,
    t,
  ])

  const { q: search, sortState } = list

  const visibleActivities = useMemo(() => {
    const filtered = activities.filter((activity) =>
      matchesActivitySearch(activity, search)
    )

    return sortItems(
      filtered,
      activitySortColumns,
      sortState,
      ACTIVITY_LIST_CONFIG.defaultSort
    )
  }, [activities, search, sortState])

  const pageData = paginate(visibleActivities, list.page)

  function openCreate() {
    router.push('/parametros/atividades/novo')
  }

  function openEdit(activity: Activity) {
    router.push(`/parametros/atividades/${activity.id}/editar`)
  }

  function getRowActions(activity: Activity): RowActionsMenuProps {
    return {
      edit: [
        {
          label: tc('edit'),
          icon: 'edit',
          onSelect: () => openEdit(activity),
        },
      ],
      exit: [
        {
          label: t('deleteAction'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(activity)
          },
        },
      ],
    }
  }

  function handleDeleted(activity: ActivityRef) {
    setPendingDelete(null)
    setFeedback({
      tone: 'success',
      text: t('deleted', { name: activity.name }),
    })
  }

  function renderContent() {
    if (isActivitiesLoading) {
      return <ListTableSkeleton columns={columns} />
    }

    if (isActivitiesError) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={() => void refetchActivities()}
        />
      )
    }

    if (activities.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="engineering"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Button type="button" onClick={openCreate} className="mt-2">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                add
              </span>
              {t('newActivity')}
            </Button>
          }
        />
      )
    }

    if (visibleActivities.length === 0) {
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
      <ActivitiesTable
        activities={pageData.items}
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
      <ActivitiesHeader
        totalCount={activities.length}
        onNewActivity={openCreate}
      />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <ActivitiesFilterBar
        search={search}
        hasActiveFilters={list.hasActiveFilters}
        onSearchChange={list.setSearch}
        onClearFilters={list.clearFilters}
      />

      {renderContent()}

      <DeleteActivityModal
        activity={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
