'use client'

import { notFound, usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type ReactNode, Suspense, useMemo, useState } from 'react'

import {
  ClearFiltersButton,
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  paginate,
  type RowActionsMenuProps,
  serializeListState,
  sortItems,
  useListState,
} from '@/components/list'
import { Button, Input } from '@/components/ui'
import {
  type ChecklistItem,
  type HitListItem,
  useGetEvaluationsChecklists,
  useGetEvaluationsHitLists,
} from '@/http/api'
import { type EvaluationType, useEvaluationTypes } from '@/lib/evaluation-types'

import { EvaluationsTable, useEvaluationTableColumns } from './EvaluationsTable'
import { EvaluationsTabs } from './EvaluationsTabs'
import {
  EVALUATION_LIST_CONFIG,
  evaluationSortColumns,
  matchesEvaluationSearch,
} from './listing'
import type { EvaluationRow } from './types'
import { useChecklistPdf } from './use-checklist-pdf'
import { useHitListPdf } from './use-hit-list-pdf'

/**
 * The tab of one evaluation type (J-1), for every role and read only. A type
 * the API does not enable is the not found page (J-4, FR-011); its listing
 * is never requested.
 */
export function EvaluationTypePage({ type }: { type: EvaluationType }) {
  const columns = useEvaluationTableColumns()

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <EnabledEvaluationType type={type} />
    </Suspense>
  )
}

function EnabledEvaluationType({ type }: { type: EvaluationType }) {
  const t = useTranslations('evaluations')
  const columns = useEvaluationTableColumns()
  const { types, isLoaded, isError, refetch } = useEvaluationTypes()

  if (!isLoaded) {
    return isError ? (
      <ListErrorState
        title={t('typesLoadErrorTitle')}
        onRetry={() => void refetch()}
      />
    ) : (
      <ListTableSkeleton columns={columns} />
    )
  }

  if (!types.includes(type)) notFound()

  return (
    <div>
      <EvaluationsTabs active={type} types={types} />
      {type === 'hit_list' ? <HitListList /> : <ChecklistList />}
    </div>
  )
}

/**
 * The Hit List has no name of its own: the name is the translated type. Its
 * PDF is the way to see a record (D-7): "PDF" on each row and the blank form
 * at the top of the tab, which needs no record (J-2, J-3).
 */
function HitListList() {
  const t = useTranslations('evaluations')
  const query = useGetEvaluationsHitLists()
  const name = t('types.hit_list')
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const pdf = useHitListPdf((text) => setFeedback({ tone: 'error', text }))

  function handleDownloadPdf(row: EvaluationRow) {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadPdf(row.id)
  }

  function handleDownloadBlankPdf() {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadBlankPdf()
  }

  function getRowActions(row: EvaluationRow): RowActionsMenuProps {
    return {
      business: [
        {
          label: t('pdf.download'),
          icon: 'picture_as_pdf',
          onSelect: () => handleDownloadPdf(row),
        },
      ],
    }
  }

  const rows = useMemo<EvaluationRow[] | undefined>(
    () =>
      query.data?.status === 200
        ? query.data.data.map((item: HitListItem) => ({
            id: item.id,
            number: item.number,
            code: item.code,
            type: 'hit_list',
            name,
            activity: item.activity,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
        : undefined,
    [query.data, name]
  )

  return (
    <EvaluationList
      type="hit_list"
      rows={rows}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      getRowActions={getRowActions}
      actions={<BlankPdfButton pdf={pdf} onClick={handleDownloadBlankPdf} />}
      feedback={
        <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />
      }
    />
  )
}

/**
 * The Coleta de Dados In Loco shows the `name` of each record. Like the Hit
 * List, its PDF is the way to see a record: "PDF" on each row and the blank
 * form at the top of the tab (J-2, J-3).
 */
function ChecklistList() {
  const t = useTranslations('evaluations')
  const query = useGetEvaluationsChecklists()
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const pdf = useChecklistPdf((text) => setFeedback({ tone: 'error', text }))

  function handleDownloadPdf(row: EvaluationRow) {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadPdf(row.id)
  }

  function handleDownloadBlankPdf() {
    if (pdf.isGenerating) return

    setFeedback(null)
    void pdf.downloadBlankPdf()
  }

  function getRowActions(row: EvaluationRow): RowActionsMenuProps {
    return {
      business: [
        {
          label: t('pdf.download'),
          icon: 'picture_as_pdf',
          onSelect: () => handleDownloadPdf(row),
        },
      ],
    }
  }

  const rows = useMemo<EvaluationRow[] | undefined>(
    () =>
      query.data?.status === 200
        ? query.data.data.map((item: ChecklistItem) => ({
            id: item.id,
            number: item.number,
            code: item.code,
            type: 'checklist',
            name: item.name,
            activity: item.activity,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
        : undefined,
    [query.data]
  )

  return (
    <EvaluationList
      type="checklist"
      rows={rows}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      getRowActions={getRowActions}
      actions={<BlankPdfButton pdf={pdf} onClick={handleDownloadBlankPdf} />}
      feedback={
        <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />
      }
    />
  )
}

/** "PDF em branco" beside the search, disabled while any PDF is generated. */
function BlankPdfButton({
  pdf,
  onClick,
}: {
  pdf: { isGenerating: boolean; isGeneratingBlank: boolean }
  onClick: () => void
}) {
  const t = useTranslations('evaluations')

  return (
    <Button
      type="button"
      variant="outline"
      color="primary"
      onClick={onClick}
      disabled={pdf.isGenerating}
    >
      <span className="material-symbols-outlined text-lg" aria-hidden>
        picture_as_pdf
      </span>
      {pdf.isGeneratingBlank ? t('pdf.generating') : t('pdf.downloadBlank')}
    </Button>
  )
}

interface EvaluationListProps {
  type: EvaluationType
  /** `undefined` while loading or after an error. */
  rows: EvaluationRow[] | undefined
  isError: boolean
  onRetry: () => void
  /** The ⋮ menu of each row, if the type has row actions. */
  getRowActions?: (row: EvaluationRow) => RowActionsMenuProps
  /** Buttons at the top of the tab, beside the search, shown in every state. */
  actions?: ReactNode
  /** The strip that reports the result of an action. */
  feedback?: ReactNode
}

/**
 * Search, sort and pages in the client, as in Projetos (FR-012). The list is
 * global (R-6): it takes no period, so the period chosen on another screen
 * never changes it.
 */
function EvaluationList({
  type,
  rows,
  isError,
  onRetry,
  getRowActions,
  actions,
  feedback,
}: EvaluationListProps) {
  const t = useTranslations('evaluations')
  const columns = useEvaluationTableColumns()
  const router = useRouter()
  const pathname = usePathname()
  const list = useListState(EVALUATION_LIST_CONFIG)
  const { q: search, sortState } = list
  const typeLabel = t(`types.${type}`)

  const visibleRows = useMemo(
    () =>
      sortItems(
        (rows ?? []).filter((row) =>
          matchesEvaluationSearch(row, search, typeLabel)
        ),
        evaluationSortColumns(typeLabel),
        sortState,
        EVALUATION_LIST_CONFIG.defaultSort
      ),
    [rows, search, sortState, typeLabel]
  )

  const pageData = paginate(visibleRows, list.page)
  const hasActiveFilters = Boolean(search.trim())

  function clearFilters() {
    const query = serializeListState(
      { ...list, q: '', page: 1 },
      EVALUATION_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function renderContent() {
    if (isError && !rows) {
      return (
        <ListErrorState
          title={t('list.loadErrorTitle')}
          description={t('list.loadErrorDescription')}
          onRetry={onRetry}
        />
      )
    }

    if (!rows) {
      return <ListTableSkeleton columns={columns} />
    }

    if (rows.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="assignment"
          title={t('list.emptyTitle')}
          description={t('list.emptyDescription')}
        />
      )
    }

    if (visibleRows.length === 0) {
      return (
        <ListEmptyState
          variant="no-results"
          title={t('list.noResultsTitle')}
          description={t('list.noResultsDescription')}
          onClearFilters={clearFilters}
        />
      )
    }

    return (
      <EvaluationsTable
        rows={pageData.items}
        typeLabel={typeLabel}
        search={search}
        sort={sortState}
        onSort={list.toggleSort}
        getRowActions={getRowActions}
        footer={
          <ListPagination
            page={pageData.page}
            pageCount={pageData.pageCount}
            total={pageData.total}
            start={pageData.start}
            end={pageData.end}
            itemLabel={t('list.itemLabel', { count: pageData.total })}
            onPageChange={list.setPage}
          />
        }
      />
    )
  }

  return (
    <>
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
            placeholder={t('list.searchPlaceholder')}
            aria-label={t('list.searchLabel')}
            className="border-none bg-surface-container-low pl-12 focus:ring-2 focus:ring-primary-container/20"
            size="lg"
          />
        </div>

        {hasActiveFilters && <ClearFiltersButton onClick={clearFilters} />}
        {actions}
      </div>

      {feedback}
      {renderContent()}
    </>
  )
}
