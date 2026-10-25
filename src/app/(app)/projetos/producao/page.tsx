'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useMemo, useState } from 'react'

import {
  ClearFiltersButton,
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  PeriodFilter,
  type PeriodSliceQueryOptions,
  paginate,
  type RowActionsMenuProps,
  serializeListState,
  sortItems,
  useListState,
  usePeriodSlice,
} from '@/components/list'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { type ImprovementProject, useGetImprovementProjects } from '@/http/api'
import {
  downloadEffectivenessVerificationTemplate,
  downloadImprovementProjectPhoto,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'
import { useTranslateError } from '@/lib/error-translator'

import { improvementProjectFormPath, projectFormHref } from '../_form/list-href'
import {
  DeleteProjectModal,
  ImprovementProjectDetailsModal,
  ImprovementProjectsTable,
  matchesImprovementProjectSearch,
  NewProjectButton,
  PRODUCTION_LIST_CONFIG,
  PRODUCTION_SORT_COLUMNS,
  ProjectCard,
  ProjectsTabs,
  useDeleteImprovementProject,
  useImprovementProjectPdf,
  useImprovementProjectTableColumns,
  useProjectFeedback,
} from '../components'

/** The RGP of one period, or of every period without `periodId`. */
function useProductionProjectsInPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  return useGetImprovementProjects(
    periodId
      ? { scope: 'production', period_id: periodId }
      : { scope: 'production' },
    { query }
  )
}

export default function ProducaoPage() {
  const columns = useImprovementProjectTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <ProductionList />
    </Suspense>
  )
}

/**
 * The Produção tab, for every role (J2, J15): the RGP of the period slice,
 * the detail with the photos, the PDF of each RGP and the blank one (J6, J7)
 * and the effectiveness verification form. Who may edit also gets "Novo",
 * editing and deleting (J8, J10, J12); a Viewer gets none of them (FR-040).
 * The slice works like the other listings sliced by period, through the
 * shared `usePeriodSlice` (FR-034): it is a request parameter, while search,
 * sort and pages stay in the client.
 */
function ProductionList() {
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const columns = useImprovementProjectTableColumns()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const list = useListState(PRODUCTION_LIST_CONFIG)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<ImprovementProject | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ImprovementProject | null>(
    null
  )
  const deleteImprovementProject = useDeleteImprovementProject()
  const [downloadingPhoto, setDownloadingPhoto] =
    useState<ImprovementProjectPhotoKey | null>(null)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const pdf = useImprovementProjectPdf((text) => {
    // Shown on the listing, so the detail is closed to reveal it.
    setSelected(null)
    setFeedback({ tone: 'error', text })
  })

  useProjectFeedback(setFeedback)

  const { q: search, sortState, setFilter } = list
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
      data: projectsResponse,
      isLoading: isProjectsLoading,
      isError: isProjectsError,
      refetch: refetchProjects,
    },
  } = usePeriodSlice({
    period: periodParam,
    onPeriodChange,
    useRecords: useProductionProjectsInPeriod,
  })

  const projects = useMemo<ImprovementProject[]>(
    () => (projectsResponse?.status === 200 ? projectsResponse.data : []),
    [projectsResponse]
  )

  const visibleProjects = useMemo(
    () =>
      sortItems(
        projects.filter((record) =>
          matchesImprovementProjectSearch(record, search)
        ),
        PRODUCTION_SORT_COLUMNS,
        sortState,
        PRODUCTION_LIST_CONFIG.defaultSort
      ),
    [projects, search, sortState]
  )

  const pageData = paginate(visibleProjects, list.page)

  // The period is always set, so it is not a filter to "clear": clearing
  // keeps the slice and only drops the search.
  const hasActiveFilters = Boolean(search.trim())

  function clearFilters() {
    const query = serializeListState(
      { ...list, q: '', page: 1, filters: { period: periodParam } },
      PRODUCTION_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Every date is refused while no period is registered (FR-005), so "Novo"
  // is offered disabled, with the reason (J4, AC-025).
  const isCreateDisabled = arePeriodsLoaded && !hasPeriods

  // The form routes carry the tab's state, so going back keeps it.
  function openCreate() {
    router.push(
      projectFormHref(improvementProjectFormPath('production'), searchParams)
    )
  }

  function openEdit(record: ImprovementProject) {
    router.push(
      projectFormHref(
        improvementProjectFormPath('production', record.id),
        searchParams
      )
    )
  }

  /**
   * "Visualizar" and "Baixar PDF" are offered to every role (J5, J6, J15);
   * editing and deleting only to who may edit (FR-040). The deletion lives on
   * the listing itself (D-15).
   */
  function getRowActions(record: ImprovementProject): RowActionsMenuProps {
    const view = {
      label: tc('view'),
      icon: 'visibility',
      onSelect: () => setSelected(record),
    }
    const business = [
      {
        label: t('pdf.download'),
        icon: 'picture_as_pdf',
        onSelect: () => handleDownloadPdf(record),
      },
    ]

    if (!canEdit) {
      return { edit: [view], business }
    }

    return {
      edit: [
        view,
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(record) },
      ],
      business,
      exit: [
        {
          label: t('delete.action'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(record)
          },
        },
      ],
    }
  }

  function handleDeleted(record: { code: string }) {
    setPendingDelete(null)
    setFeedback({
      tone: 'success',
      text: t('feedback.deleted', { code: record.code }),
    })
  }

  function handleDownloadPdf(record: ImprovementProject) {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadPdf(record)
  }

  function handleDownloadBlankPdf() {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadBlankPdf('production')
  }

  async function handleDownloadPhoto(
    record: ImprovementProject,
    photo: ImprovementProjectPhotoKey
  ) {
    if (downloadingPhoto) return

    setFeedback(null)
    setDownloadingPhoto(photo)

    try {
      await downloadImprovementProjectPhoto(record, photo)
    } catch (error) {
      // Shown on the listing, so the detail is closed to reveal it.
      setSelected(null)
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setDownloadingPhoto(null)
    }
  }

  async function handleDownloadTemplate() {
    if (isDownloadingTemplate) return

    setFeedback(null)
    setIsDownloadingTemplate(true)

    try {
      await downloadEffectivenessVerificationTemplate()
    } catch (error) {
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  function handleRetry() {
    if (isPeriodsError || !arePeriodsLoaded) {
      void refetchPeriods()
      return
    }

    void refetchProjects()
  }

  function renderContent() {
    if (isPeriodsError || (isProjectsError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('production.loadErrorTitle')}
          description={t('production.loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isProjectsLoading || isRecheckingPeriod) {
      return <ListTableSkeleton columns={columns} />
    }

    if (projects.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="list_alt"
          title={t('production.emptyTitle')}
          description={t('production.emptyDescription')}
          action={
            canEdit ? (
              <NewProjectButton
                label={t('newImprovementProject')}
                onClick={openCreate}
                disabled={isCreateDisabled}
                className="mt-2"
              />
            ) : undefined
          }
        />
      )
    }

    if (visibleProjects.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('production.noResultsTitle')}
          description={t('production.noResultsDescription')}
          onClearFilters={clearFilters}
        />
      )
    }

    return (
      <ImprovementProjectsTable
        records={pageData.items}
        search={search}
        sort={sortState}
        onSort={list.toggleSort}
        getRowActions={getRowActions}
        onOpenDetails={setSelected}
        footer={
          <ListPagination
            page={pageData.page}
            pageCount={pageData.pageCount}
            total={pageData.total}
            start={pageData.start}
            end={pageData.end}
            itemLabel={t('production.itemLabel', { count: pageData.total })}
            onPageChange={list.setPage}
          />
        }
      />
    )
  }

  return (
    <div>
      <ProjectsTabs active="production" />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <ProjectCard
          icon="list_alt"
          title={t('cards.improvementProject.title')}
          description={t('cards.improvementProject.description')}
          meta={t('production.count', { count: projects.length })}
        >
          <Button
            type="button"
            variant="outline"
            color="primary"
            onClick={handleDownloadBlankPdf}
            disabled={pdf.isGenerating}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              picture_as_pdf
            </span>
            {pdf.isGeneratingBlank
              ? t('pdf.generating')
              : t('pdf.downloadBlank')}
          </Button>
          {canEdit && (
            <NewProjectButton
              label={t('newImprovementProject')}
              onClick={openCreate}
              disabled={isCreateDisabled}
            />
          )}
        </ProjectCard>

        <ProjectCard
          icon="fact_check"
          title={t('cards.effectivenessVerification.title')}
          description={t('cards.effectivenessVerification.description')}
        >
          <Button
            type="button"
            variant="outline"
            color="primary"
            onClick={() => void handleDownloadTemplate()}
            disabled={isDownloadingTemplate}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              download
            </span>
            {isDownloadingTemplate
              ? t('downloading')
              : t('cards.effectivenessVerification.download')}
          </Button>
        </ProjectCard>
      </div>

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-end">
        <div className="relative flex-1">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-outline"
            aria-hidden
          >
            search
          </span>
          <Input
            value={search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={t('production.searchPlaceholder')}
            aria-label={t('production.searchLabel')}
            className="border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20"
            size="lg"
          />
        </div>

        {arePeriodsLoaded && hasPeriods && (
          <PeriodFilter
            periods={periods}
            value={selectedPeriod}
            onChange={onPeriodChange}
          />
        )}

        {hasActiveFilters && <ClearFiltersButton onClick={clearFilters} />}
      </div>

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

      <ImprovementProjectDetailsModal
        record={selected}
        downloadingPhoto={downloadingPhoto}
        onClose={() => setSelected(null)}
        onDownloadPhoto={(record, photo) =>
          void handleDownloadPhoto(record, photo)
        }
        isGeneratingPdf={pdf.isGenerating}
        onDownloadPdf={handleDownloadPdf}
      />

      <DeleteProjectModal
        record={pendingDelete}
        onConfirm={deleteImprovementProject}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
