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
import { type Period, useGetPeriods } from '@/http/api'

import {
  DeletePeriodModal,
  matchesPeriodSearch,
  PERIOD_LIST_CONFIG,
  PeriodsFilterBar,
  PeriodsHeader,
  PeriodsTable,
  periodSortColumns,
  usePeriodTableColumns,
} from './components'

/** Set by `novo/` after a successful create: `?created=<id>`. */
const CREATED_PARAM = 'created'
/** Set by `[id]/editar/` after a delete: `?deleted=<description>`. */
const DELETED_PARAM = 'deleted'

type PeriodRef = Pick<Period, 'id' | 'description'>

export default function PeriodosPage() {
  const columns = usePeriodTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <PeriodsList />
    </Suspense>
  )
}

function PeriodsList() {
  const t = useTranslations('periods')
  const tc = useTranslations('common')
  const columns = usePeriodTableColumns()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin } = useAuth()
  const list = useListState(PERIOD_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PeriodRef | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, router])

  const {
    data: periodsResponse,
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    refetch: refetchPeriods,
  } = useGetPeriods({
    query: {
      enabled: isAdmin,
    },
  })

  const periods = useMemo<Period[]>(
    () => (periodsResponse?.status === 200 ? periodsResponse.data : []),
    [periodsResponse]
  )

  // Success message after a create or a delete from the edit page, then the
  // param is dropped so a reload does not show it again.
  const createdId = searchParams.get(CREATED_PARAM)
  const deletedDescription = searchParams.get(DELETED_PARAM)

  useEffect(() => {
    if (!createdId && !deletedDescription) return
    if (createdId && periodsResponse?.status !== 200) return

    const created = createdId
      ? periods.find((period) => period.id === createdId)
      : undefined
    if (created) {
      setFeedback({
        tone: 'success',
        text: t('created', { description: created.description }),
      })
    } else if (deletedDescription) {
      setFeedback({
        tone: 'success',
        text: t('deleted', { description: deletedDescription }),
      })
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete(CREATED_PARAM)
    params.delete(DELETED_PARAM)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }, [
    createdId,
    deletedDescription,
    periods,
    periodsResponse,
    pathname,
    router,
    searchParams,
    t,
  ])

  const { q: search, sortState } = list

  const visiblePeriods = useMemo(() => {
    const filtered = periods.filter((period) =>
      matchesPeriodSearch(period, search)
    )

    return sortItems(
      filtered,
      periodSortColumns,
      sortState,
      PERIOD_LIST_CONFIG.defaultSort
    )
  }, [periods, search, sortState])

  const pageData = paginate(visiblePeriods, list.page)

  function openCreate() {
    router.push('/parametros/periodos/novo')
  }

  function openEdit(period: Period) {
    router.push(`/parametros/periodos/${period.id}/editar`)
  }

  function getRowActions(period: Period): RowActionsMenuProps {
    return {
      edit: [
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(period) },
      ],
      exit: [
        {
          label: t('deleteAction'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(period)
          },
        },
      ],
    }
  }

  function handleDeleted(period: PeriodRef) {
    setPendingDelete(null)
    setFeedback({
      tone: 'success',
      text: t('deleted', { description: period.description }),
    })
  }

  function renderContent() {
    if (isPeriodsLoading) {
      return <ListTableSkeleton columns={columns} />
    }

    if (isPeriodsError) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={() => void refetchPeriods()}
        />
      )
    }

    if (periods.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="date_range"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Button type="button" onClick={openCreate} className="mt-2">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                add
              </span>
              {t('newPeriod')}
            </Button>
          }
        />
      )
    }

    if (visiblePeriods.length === 0) {
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
      <PeriodsTable
        periods={pageData.items}
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
      <PeriodsHeader totalCount={periods.length} onNewPeriod={openCreate} />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <PeriodsFilterBar
        search={search}
        hasActiveFilters={list.hasActiveFilters}
        onSearchChange={list.setSearch}
        onClearFilters={list.clearFilters}
      />

      {renderContent()}

      <DeletePeriodModal
        period={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
