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
import { type Meeting, useGetMeetings } from '@/http/api'
import {
  downloadMeetingFile,
  downloadMeetingTemplate,
  type MeetingAttachmentKey,
  type MeetingTemplateKey,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import {
  FEEDBACK_PARAMS,
  FILE_REMOVED_PARAMS,
  meetingFormHref,
} from './_form/list-href'
import {
  DeleteMeetingModal,
  getMeetingSortColumns,
  MEETING_LIST_CONFIG,
  MeetingDetailsModal,
  MeetingsFilterBar,
  MeetingsHeader,
  MeetingsTable,
  matchesMeetingSearch,
  useMeetingTableColumns,
  useMeetingTypeLabel,
} from './components'

type MeetingRef = Pick<Meeting, 'id' | 'name'>

/** The meetings of one period, or of every period without `periodId`. */
function useMeetingsInPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  return useGetMeetings(periodId ? { period_id: periodId } : undefined, {
    query,
  })
}

export default function ReunioesPage() {
  const columns = useMeetingTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <MeetingsList />
    </Suspense>
  )
}

/**
 * Meetings listing, for every role: a Viewer reads, opens the detail and
 * downloads the attachments and the templates like anyone else (J13). What
 * separates reading from editing is `canEdit`: a Viewer gets no write action
 * at all (FR-026).
 *
 * The listing is sliced by period exactly like Treinamentos (R-10, FR-024),
 * through the shared `usePeriodSlice` (D-12): the slice is a request
 * parameter, while search, sort and pages stay in the client.
 */
function MeetingsList() {
  const t = useTranslations('meetings')
  const tc = useTranslations('common')
  const columns = useMeetingTableColumns()
  const typeLabel = useMeetingTypeLabel()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const list = useListState(MEETING_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<Meeting | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MeetingRef | null>(null)
  const [downloading, setDownloading] = useState<{
    id: string
    attachment: MeetingAttachmentKey
  } | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] =
    useState<MeetingTemplateKey | null>(null)

  const { q: search, sortState, setFilter } = list
  const type = list.filters.type
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
      data: meetingsResponse,
      isLoading: isMeetingsLoading,
      isError: isMeetingsError,
      refetch: refetchMeetings,
    },
  } = usePeriodSlice({
    period: periodParam,
    onPeriodChange,
    useRecords: useMeetingsInPeriod,
  })

  const meetings = useMemo<Meeting[]>(
    () => (meetingsResponse?.status === 200 ? meetingsResponse.data : []),
    [meetingsResponse]
  )

  // Success message after a create, an update, an attachment removal or a
  // delete from the form pages, then the param is dropped so a reload does
  // not show it again. A saved meeting comes back in the slice of its own
  // date, so it is found in the loaded list (J7).
  const createdId = searchParams.get('created')
  const updatedId = searchParams.get('updated')
  const presenceListRemovedId = searchParams.get(
    FILE_REMOVED_PARAMS['presence-list']
  )
  const minutesRemovedId = searchParams.get(FILE_REMOVED_PARAMS.minutes)
  const deletedName = searchParams.get('deleted')

  useEffect(() => {
    const changedId =
      createdId ?? updatedId ?? presenceListRemovedId ?? minutesRemovedId
    if (!changedId && !deletedName) return
    if (changedId && meetingsResponse?.status !== 200) return

    const changed = changedId
      ? meetings.find((record) => record.id === changedId)
      : undefined

    if (changed) {
      setFeedback({
        tone: 'success',
        text: createdId
          ? t('created', { name: changed.name })
          : updatedId
            ? t('updated', { name: changed.name })
            : presenceListRemovedId
              ? t('fileRemoved.presence-list', { name: changed.name })
              : t('fileRemoved.minutes', { name: changed.name }),
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
    presenceListRemovedId,
    minutesRemovedId,
    deletedName,
    meetings,
    meetingsResponse,
    pathname,
    router,
    searchParams,
    t,
  ])

  const sortColumns = useMemo(
    () => getMeetingSortColumns(typeLabel),
    [typeLabel]
  )

  const visibleMeetings = useMemo(() => {
    const filtered = meetings.filter(
      (record) =>
        (!type || record.type === type) &&
        matchesMeetingSearch(record, search, typeLabel)
    )

    return sortItems(
      filtered,
      sortColumns,
      sortState,
      MEETING_LIST_CONFIG.defaultSort
    )
  }, [meetings, type, search, typeLabel, sortColumns, sortState])

  const pageData = paginate(visibleMeetings, list.page)

  // The period is always set, so it is not a filter to "clear": clearing
  // keeps the slice and only drops the search and the type.
  const hasActiveFilters = Boolean(search.trim()) || Boolean(type)

  function clearFilters() {
    const query = serializeListState(
      {
        ...list,
        q: '',
        page: 1,
        filters: { type: '', period: periodParam },
      },
      MEETING_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Every date is refused while no period is registered (FR-006), so the
  // create action is offered disabled, with the reason (J3, FR-024).
  const isCreateDisabled = arePeriodsLoaded && !hasPeriods

  // The form routes carry the listing's state, so going back keeps it.
  function openCreate() {
    router.push(meetingFormHref('/reunioes/novo', searchParams))
  }

  function openEdit(record: Meeting) {
    router.push(meetingFormHref(`/reunioes/${record.id}/editar`, searchParams))
  }

  /**
   * "Visualizar" is offered to every role (J4, J13); editing and deleting only
   * to who may edit (FR-026). The deletion lives on the listing itself (R-23).
   */
  function getRowActions(record: Meeting): RowActionsMenuProps {
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

  function handleDeleted(record: MeetingRef) {
    setPendingDelete(null)
    setFeedback({ tone: 'success', text: t('deleted', { name: record.name }) })
  }

  async function handleDownloadFile(
    record: Meeting,
    attachment: MeetingAttachmentKey
  ) {
    if (downloading) return

    setFeedback(null)
    setDownloading({ id: record.id, attachment })

    try {
      await downloadMeetingFile(record, attachment)
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownloadTemplate(template: MeetingTemplateKey) {
    if (downloadingTemplate) return

    setFeedback(null)
    setDownloadingTemplate(template)

    try {
      await downloadMeetingTemplate(template)
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

    void refetchMeetings()
  }

  function renderContent() {
    if (isPeriodsError || (isMeetingsError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isMeetingsLoading || isRecheckingPeriod) {
      return <ListTableSkeleton columns={columns} />
    }

    if (meetings.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="calendar_month"
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            canEdit ? (
              <Button
                type="button"
                onClick={openCreate}
                disabled={isCreateDisabled}
                title={
                  isCreateDisabled ? t('newMeetingDisabledHint') : undefined
                }
                className="mt-2"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  add
                </span>
                {t('newMeeting')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    if (visibleMeetings.length === 0) {
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
      <MeetingsTable
        meetings={pageData.items}
        search={search}
        sort={sortState}
        downloading={downloading}
        onSort={list.toggleSort}
        getRowActions={getRowActions}
        onOpenDetails={setSelected}
        onDownloadFile={(record, attachment) =>
          void handleDownloadFile(record, attachment)
        }
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
      <MeetingsHeader
        totalCount={meetings.length}
        downloadingTemplate={downloadingTemplate}
        onDownloadTemplate={(template) => void handleDownloadTemplate(template)}
        onNewMeeting={canEdit ? openCreate : undefined}
        isNewMeetingDisabled={isCreateDisabled}
      />

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <MeetingsFilterBar
        search={search}
        type={type}
        periods={arePeriodsLoaded && hasPeriods ? periods : null}
        period={selectedPeriod}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={list.setSearch}
        onTypeChange={(value) => setFilter('type', value)}
        onPeriodChange={onPeriodChange}
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

      <MeetingDetailsModal
        record={selected}
        downloadingAttachment={
          selected && downloading?.id === selected.id
            ? downloading.attachment
            : null
        }
        onClose={() => setSelected(null)}
        onDownloadFile={(record, attachment) =>
          void handleDownloadFile(record, attachment)
        }
      />

      <DeleteMeetingModal
        record={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
