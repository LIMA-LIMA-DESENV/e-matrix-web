'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import {
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  type PeriodSliceQueryOptions,
  paginate,
  type RowActionsMenuProps,
  serializeListState,
  sortItems,
  useListState,
  usePeriodSlice,
} from '@/components/list'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { type Training, useGetTrainings } from '@/http/api'
import {
  downloadTrainingFile,
  downloadTrainingTemplate,
  type TrainingTemplateKey,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import { FEEDBACK_PARAMS, trainingFormHref } from './_form/list-href'
import {
  DeleteTrainingModal,
  getTrainingSortColumns,
  matchesTrainingSearch,
  TRAINING_LIST_CONFIG,
  TrainingDetailsModal,
  TrainingsFilterBar,
  TrainingsHeader,
  TrainingsTable,
  useTrainingContentLabel,
  useTrainingTableColumns,
} from './components'

type TrainingRef = Pick<Training, 'id' | 'name'>

/** The trainings of one period, or of every period without `periodId`. */
function useTrainingsInPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  return useGetTrainings(periodId ? { period_id: periodId } : undefined, {
    query,
  })
}

export default function TreinamentosPage() {
  const columns = useTrainingTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <TrainingsList />
    </Suspense>
  )
}

/**
 * Trainings listing, for every role: there is no redirect by profile, and a
 * Viewer reads, opens the detail and downloads like anyone else (J13). What
 * separates reading from editing is `canEdit`: a Viewer gets no write action
 * at all (FR-027).
 *
 * The listing is sliced by period (R-10). The slice is a request parameter, so
 * changing it fetches again, while search, sort and pages stay in the client
 * (D-9). Its default is resolved by `usePeriodSlice`, not by the API
 * (D-10).
 */
function TrainingsList() {
  const t = useTranslations('trainings')
  const tc = useTranslations('common')
  const columns = useTrainingTableColumns()
  const contentLabel = useTrainingContentLabel()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const list = useListState(TRAINING_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<Training | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TrainingRef | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] =
    useState<TrainingTemplateKey | null>(null)

  const { q: search, sortState, setFilter } = list
  const content = list.filters.content
  const periodParam = list.filters.period

  const onPeriodChange = useCallback(
    (value: string) => setFilter('period', value),
    [setFilter]
  )
  const {
    periods,
    arePeriodsLoaded,
    hasPeriods,
    isPeriodsError,
    refetchPeriods,
    selectedPeriod,
    isPeriodChosen,
    isRecheckingPeriod,
    records: {
      data: trainingsResponse,
      isLoading: isTrainingsLoading,
      isError: isTrainingsError,
      refetch: refetchTrainings,
    },
  } = usePeriodSlice({
    period: periodParam,
    onPeriodChange,
    useRecords: useTrainingsInPeriod,
  })

  const trainings = useMemo<Training[]>(
    () => (trainingsResponse?.status === 200 ? trainingsResponse.data : []),
    [trainingsResponse]
  )

  // Success message after a create, an update, a file removal or a delete
  // from the form pages, then the param is dropped so a reload does not show
  // it again. A saved training comes back in the slice of its own date, so it
  // is found in the loaded list (J7).
  const createdId = searchParams.get('created')
  const updatedId = searchParams.get('updated')
  const fileRemovedId = searchParams.get('fileRemoved')
  const deletedName = searchParams.get('deleted')

  useEffect(() => {
    const changedId = createdId ?? updatedId ?? fileRemovedId
    if (!changedId && !deletedName) return
    if (changedId && trainingsResponse?.status !== 200) return

    const changed = changedId
      ? trainings.find((record) => record.id === changedId)
      : undefined

    if (changed) {
      setFeedback({
        tone: 'success',
        text: createdId
          ? t('created', { name: changed.name })
          : updatedId
            ? t('updated', { name: changed.name })
            : t('fileRemoved', { name: changed.name }),
      })
    } else if (deletedName) {
      setFeedback({
        tone: 'success',
        text: t('deleted', { name: deletedName }),
      })
    }

    const params = new URLSearchParams(searchParams.toString())
    for (const key of FEEDBACK_PARAMS) params.delete(key)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [
    createdId,
    updatedId,
    fileRemovedId,
    deletedName,
    trainings,
    trainingsResponse,
    pathname,
    router,
    searchParams,
    t,
  ])

  const sortColumns = useMemo(
    () => getTrainingSortColumns(contentLabel),
    [contentLabel]
  )

  const visibleTrainings = useMemo(() => {
    const filtered = trainings.filter(
      (record) =>
        (!content || record.content === content) &&
        matchesTrainingSearch(record, search, contentLabel)
    )

    return sortItems(
      filtered,
      sortColumns,
      sortState,
      TRAINING_LIST_CONFIG.defaultSort
    )
  }, [trainings, content, search, contentLabel, sortColumns, sortState])

  const pageData = paginate(visibleTrainings, list.page)

  // The period is always set, so it is not a filter to "clear": clearing
  // keeps the slice and only drops the search and the content.
  const hasActiveFilters = Boolean(search.trim()) || Boolean(content)

  function clearFilters() {
    const query = serializeListState(
      {
        ...list,
        q: '',
        page: 1,
        filters: { content: '', period: periodParam },
      },
      TRAINING_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Every date is refused while no period is registered (FR-006), so the
  // create action is offered disabled, with the reason (J3, AC-026).
  const isCreateDisabled = arePeriodsLoaded && !hasPeriods

  // The form routes carry the listing's state, so going back keeps it.
  function openCreate() {
    router.push(trainingFormHref('/treinamentos/novo', searchParams))
  }

  function openEdit(record: Training) {
    router.push(
      trainingFormHref(`/treinamentos/${record.id}/editar`, searchParams)
    )
  }

  /**
   * "Visualizar" is offered to every role; editing and deleting only to who
   * may edit (FR-027). The deletion lives on the listing itself (R-25).
   */
  function getRowActions(record: Training): RowActionsMenuProps {
    const view = {
      label: tc('view'),
      icon: 'visibility',
      onSelect: () => setSelected(record),
    }

    if (!canEdit) {
      return { edit: [view] }
    }

    return {
      edit: [
        view,
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(record) },
      ],
      exit: [
        {
          label: t('deleteAction'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(record)
          },
        },
      ],
    }
  }

  function handleDeleted(record: TrainingRef) {
    setPendingDelete(null)
    setFeedback({ tone: 'success', text: t('deleted', { name: record.name }) })
  }

  async function handleDownloadFile(record: Training) {
    if (!record.file || downloadingId) return

    setFeedback(null)
    setDownloadingId(record.id)

    try {
      await downloadTrainingFile(record)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDownloadTemplate(template: TrainingTemplateKey) {
    if (downloadingTemplate) return

    setFeedback(null)
    setDownloadingTemplate(template)

    try {
      await downloadTrainingTemplate(template)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingTemplate(null)
    }
  }

  function handleRetry() {
    if (isPeriodsError || !arePeriodsLoaded) {
      void refetchPeriods()
      return
    }

    void refetchTrainings()
  }

  function renderContent() {
    if (isPeriodsError || (isTrainingsError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isTrainingsLoading || isRecheckingPeriod) {
      return <ListTableSkeleton columns={columns} />
    }

    if (trainings.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="directions_bike"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            canEdit ? (
              <Button
                type="button"
                onClick={openCreate}
                disabled={isCreateDisabled}
                title={
                  isCreateDisabled ? t('newTrainingDisabledHint') : undefined
                }
                className="mt-2"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  add
                </span>
                {t('newTraining')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    if (visibleTrainings.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('noResultsTitle')}
          description={t('noResultsDescription')}
          onClearFilters={clearFilters}
        />
      )
    }

    return (
      <TrainingsTable
        trainings={pageData.items}
        search={search}
        sort={sortState}
        downloadingId={downloadingId}
        onSort={list.toggleSort}
        getRowActions={getRowActions}
        onOpenDetails={setSelected}
        onDownloadFile={handleDownloadFile}
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

  return (
    <div>
      <TrainingsHeader
        totalCount={trainings.length}
        downloadingTemplate={downloadingTemplate}
        onDownloadTemplate={(template) => void handleDownloadTemplate(template)}
        onNewTraining={canEdit ? openCreate : undefined}
        isNewTrainingDisabled={isCreateDisabled}
      />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <TrainingsFilterBar
        search={search}
        content={content}
        periods={arePeriodsLoaded && hasPeriods ? periods : null}
        period={selectedPeriod}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={list.setSearch}
        onContentChange={(value) => setFilter('content', value)}
        onPeriodChange={(value) => setFilter('period', value)}
        onClearFilters={clearFilters}
      />

      {arePeriodsLoaded && !hasPeriods && (
        <div
          role="status"
          className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden>
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold">{t('noPeriods.title')}</p>
            <p>{t('noPeriods.description')}</p>
          </div>
        </div>
      )}

      {renderContent()}

      <TrainingDetailsModal
        record={selected}
        isDownloading={Boolean(selected && downloadingId === selected.id)}
        isDownloadingTemplate={Boolean(
          selected && downloadingTemplate === selected.content
        )}
        onClose={() => setSelected(null)}
        onDownloadFile={handleDownloadFile}
        onDownloadTemplate={(value) => void handleDownloadTemplate(value)}
      />

      <DeleteTrainingModal
        record={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
