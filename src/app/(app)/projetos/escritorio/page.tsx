'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useId, useMemo, useState } from 'react'

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
import {
  type ImprovementProject,
  type MaterialReceipt,
  useGetImprovementProjects,
  useGetMaterialReceipts,
} from '@/http/api'
import {
  downloadImprovementProjectPhoto,
  downloadMaterialReceiptFile,
  downloadReceivingMaterialsTemplate,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'
import { getErrorKey, useTranslateError } from '@/lib/error-translator'

import {
  improvementProjectFormPath,
  materialReceiptFormPath,
  projectFormHref,
} from '../_form/list-href'
import {
  ALL_OFFICE_TYPES,
  DeleteProjectModal,
  ImprovementProjectDetailsModal,
  MaterialReceiptDetailsModal,
  matchesOfficeSearch,
  matchesOfficeType,
  NewProjectButton,
  OFFICE_LIST_CONFIG,
  OFFICE_SORT_COLUMNS,
  OfficeRecordsTable,
  type OfficeRow,
  OfficeTypeFilter,
  ProjectCard,
  ProjectsTabs,
  toOfficeRows,
  useDeleteImprovementProject,
  useDeleteMaterialReceipt,
  useImprovementProjectPdf,
  useOfficeRecordsTableColumns,
  useProjectFeedback,
} from '../components'

/**
 * The RGA and the RA of one period, or of every period without `periodId`, as
 * the single records query `usePeriodSlice` expects (D-14, FR-034): loading
 * while either loads, failed if either fails, and a 404 `Period not found.`
 * from either is the error it sees, so either one triggers the reload.
 */
function useOfficeRecordsInPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  const projects = useGetImprovementProjects(
    periodId ? { scope: 'office', period_id: periodId } : { scope: 'office' },
    { query }
  )
  const receipts = useGetMaterialReceipts(
    periodId ? { period_id: periodId } : undefined,
    { query }
  )

  const data = useMemo(
    () =>
      projects.data?.status === 200 && receipts.data?.status === 200
        ? toOfficeRows(projects.data.data, receipts.data.data)
        : undefined,
    [projects.data, receipts.data]
  )

  const failed = [projects, receipts].filter((result) => result.isError)
  const error = (
    failed.find((result) => getErrorKey(result.error) === 'periodNotFound') ??
    failed[0]
  )?.error

  return {
    data,
    isLoading: projects.isLoading || receipts.isLoading,
    isError: failed.length > 0,
    error,
    refetch: () => Promise.all([projects.refetch(), receipts.refetch()]),
  }
}

export default function EscritorioPage() {
  const columns = useOfficeRecordsTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <OfficeList />
    </Suspense>
  )
}

/**
 * The Escritório tab, for every role (J3, J15): the RGA and the RA of the
 * period slice in one table, filtered by type in `?type=`, their details, the
 * PDF of each RGA and the blank one (J6, J7; the RA has none, R-28) and the
 * static receiving materials form. Who may edit also gets "Novo", editing and
 * deleting of the RGA and of the RA (J8–J10, J12); a Viewer gets none of
 * them (FR-040).
 * The slice works like Produção, through the shared `usePeriodSlice`
 * (FR-034); type, search, sort and pages stay in the client.
 */
function OfficeList() {
  const t = useTranslations('projects')
  const tc = useTranslations('common')
  const columns = useOfficeRecordsTableColumns()
  const translateError = useTranslateError()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const list = useListState(OFFICE_LIST_CONFIG)
  const emptyHintId = useId()
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const [selected, setSelected] = useState<OfficeRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<OfficeRow | null>(null)
  const deleteImprovementProject = useDeleteImprovementProject()
  const deleteMaterialReceipt = useDeleteMaterialReceipt()
  const [downloadingPhoto, setDownloadingPhoto] =
    useState<ImprovementProjectPhotoKey | null>(null)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const pdf = useImprovementProjectPdf((text) => {
    // Shown on the listing, so the detail is closed to reveal it.
    setSelected(null)
    setFeedback({ tone: 'error', text })
  })

  useProjectFeedback(setFeedback)

  const { q: search, sortState, setFilter } = list
  const periodParam = list.filters.period
  const typeParam = list.filters.type

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
      data: recordsData,
      isLoading: isRecordsLoading,
      isError: isRecordsError,
      refetch: refetchRecords,
    },
  } = usePeriodSlice({
    period: periodParam,
    onPeriodChange,
    useRecords: useOfficeRecordsInPeriod,
  })

  const rows = useMemo<OfficeRow[]>(() => recordsData ?? [], [recordsData])
  const projectCount = rows.filter((row) => row.type === 'rga').length

  const typeLabels = useMemo(
    () => ({
      rga: [t('shortTypes.rga'), t('types.rga')],
      ra: [t('shortTypes.ra'), t('types.ra')],
    }),
    [t]
  )

  // The type filter applies before the search, so "no results" and the
  // pages count only the rows of the chosen type.
  const visibleRows = useMemo(
    () =>
      sortItems(
        rows.filter(
          (row) =>
            matchesOfficeType(row, typeParam) &&
            matchesOfficeSearch(row, search, typeLabels)
        ),
        OFFICE_SORT_COLUMNS,
        sortState,
        OFFICE_LIST_CONFIG.defaultSort
      ),
    [rows, typeParam, search, typeLabels, sortState]
  )

  const pageData = paginate(visibleRows, list.page)

  // The period is always set, so it is not a filter to "clear": clearing
  // keeps the slice and drops the search and the type.
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(typeParam && typeParam !== ALL_OFFICE_TYPES)

  function clearFilters() {
    const query = serializeListState(
      { ...list, q: '', page: 1, filters: { period: periodParam, type: '' } },
      OFFICE_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Every date is refused while no period is registered (FR-005), so "Novo"
  // is offered disabled, with the reason (J4, AC-025).
  const isCreateDisabled = arePeriodsLoaded && !hasPeriods

  // The form routes carry the tab's state, so going back keeps it.
  function openCreate() {
    router.push(
      projectFormHref(improvementProjectFormPath('office'), searchParams)
    )
  }

  function openCreateReceipt() {
    router.push(projectFormHref(materialReceiptFormPath(), searchParams))
  }

  function openEdit(row: OfficeRow) {
    router.push(
      projectFormHref(
        row.type === 'rga'
          ? improvementProjectFormPath('office', row.record.id)
          : materialReceiptFormPath(row.record.id),
        searchParams
      )
    )
  }

  /**
   * "Visualizar" is offered to every role (J5, J15), and "Baixar PDF" too,
   * on RGA rows only: the RA has no PDF (R-28). Editing and deleting an RGA
   * or an RA are offered only to who may edit (FR-040), the deletion on the
   * listing itself (D-15).
   */
  function getRowActions(row: OfficeRow): RowActionsMenuProps {
    const view = {
      label: tc('view'),
      icon: 'visibility',
      onSelect: () => setSelected(row),
    }

    const business =
      row.type === 'rga'
        ? [
            {
              label: t('pdf.download'),
              icon: 'picture_as_pdf',
              onSelect: () => handleDownloadPdf(row.record),
            },
          ]
        : undefined

    if (!canEdit) {
      return { edit: [view], business }
    }

    return {
      edit: [
        view,
        { label: tc('edit'), icon: 'edit', onSelect: () => openEdit(row) },
      ],
      business,
      exit: [
        {
          label: t('delete.action'),
          icon: 'delete',
          onSelect: () => {
            setFeedback(null)
            setPendingDelete(row)
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
    void pdf.downloadBlankPdf('office')
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

  async function handleDownloadFile(record: MaterialReceipt) {
    if (isDownloadingFile) return

    setFeedback(null)
    setIsDownloadingFile(true)

    try {
      await downloadMaterialReceiptFile(record)
    } catch (error) {
      setSelected(null)
      setFeedback({ tone: 'error', text: translateError(error) })
    } finally {
      setIsDownloadingFile(false)
    }
  }

  async function handleDownloadTemplate() {
    if (isDownloadingTemplate) return

    setFeedback(null)
    setIsDownloadingTemplate(true)

    try {
      await downloadReceivingMaterialsTemplate()
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

    void refetchRecords()
  }

  function renderContent() {
    if (isPeriodsError || (isRecordsError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('office.loadErrorTitle')}
          description={t('office.loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isRecordsLoading || isRecheckingPeriod) {
      return <ListTableSkeleton columns={columns} />
    }

    if (rows.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="list_alt"
          title={t('office.emptyTitle')}
          description={t('office.emptyDescription')}
          action={
            canEdit ? (
              <div className="mt-2">
                <div className="flex flex-wrap justify-center gap-3">
                  <NewProjectButton
                    label={t('newImprovementProject')}
                    onClick={openCreate}
                    disabled={isCreateDisabled}
                    hintId={emptyHintId}
                  />
                  <NewProjectButton
                    label={t('newMaterialReceipt')}
                    onClick={openCreateReceipt}
                    disabled={isCreateDisabled}
                    hintId={emptyHintId}
                  />
                </div>
                {/* One reason for both buttons (J4, AC-025). */}
                {isCreateDisabled && (
                  <p
                    id={emptyHintId}
                    className="mt-2 text-xs font-medium text-on-surface-variant"
                  >
                    {t('newDisabledHint')}
                  </p>
                )}
              </div>
            ) : undefined
          }
        />
      )
    }

    if (visibleRows.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('office.noResultsTitle')}
          description={t('office.noResultsDescription')}
          onClearFilters={clearFilters}
        />
      )
    }

    return (
      <OfficeRecordsTable
        rows={pageData.items}
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
            itemLabel={t('office.itemLabel', { count: pageData.total })}
            onPageChange={list.setPage}
          />
        }
      />
    )
  }

  return (
    <div>
      <ProjectsTabs active="office" />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <ProjectCard
          icon="list_alt"
          title={t('cards.improvementProject.title')}
          description={t('cards.improvementProject.description')}
          meta={t('office.count', { count: projectCount })}
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
          icon="inventory_2"
          title={t('cards.materialReceipt.title')}
          description={t('cards.materialReceipt.description')}
          meta={t('office.materialReceiptCount', {
            count: rows.length - projectCount,
          })}
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
              : t('cards.materialReceipt.download')}
          </Button>
          {canEdit && (
            <NewProjectButton
              label={t('newMaterialReceipt')}
              onClick={openCreateReceipt}
              disabled={isCreateDisabled}
            />
          )}
        </ProjectCard>
      </div>

      <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />

      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:flex-wrap md:items-end">
        <div className="relative flex-1 md:min-w-72">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-outline"
            aria-hidden
          >
            search
          </span>
          <Input
            value={search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={t('office.searchPlaceholder')}
            aria-label={t('office.searchLabel')}
            className="border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20"
            size="lg"
          />
        </div>

        <div className="flex h-12 items-center">
          <OfficeTypeFilter
            value={typeParam}
            onChange={(value) => setFilter('type', value)}
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
        record={selected?.type === 'rga' ? selected.record : null}
        downloadingPhoto={downloadingPhoto}
        onClose={() => setSelected(null)}
        onDownloadPhoto={(record, photo) =>
          void handleDownloadPhoto(record, photo)
        }
        isGeneratingPdf={pdf.isGenerating}
        onDownloadPdf={handleDownloadPdf}
      />

      <MaterialReceiptDetailsModal
        record={selected?.type === 'ra' ? selected.record : null}
        isDownloadingFile={isDownloadingFile}
        onClose={() => setSelected(null)}
        onDownloadFile={(record) => void handleDownloadFile(record)}
      />

      <DeleteProjectModal
        record={pendingDelete?.record ?? null}
        onConfirm={
          pendingDelete?.type === 'ra'
            ? deleteMaterialReceipt
            : deleteImprovementProject
        }
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
