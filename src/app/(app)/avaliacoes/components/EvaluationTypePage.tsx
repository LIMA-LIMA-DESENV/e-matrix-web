'use client'

import {
  notFound,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
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
import { useAuth } from '@/contexts/AuthContext'
import { type EvaluationType, useEvaluationTypes } from '@/lib/evaluation-types'

import { evaluationFormHref, evaluationFormPath } from '../_form/list-href'
import {
  type EvaluationWebDefinition,
  evaluationWebDefinition,
} from '../definitions'
import { DeleteEvaluationModal } from './DeleteEvaluationModal'
import { EvaluationsTable, useEvaluationTableColumns } from './EvaluationsTable'
import { EvaluationsTabs } from './EvaluationsTabs'
import {
  EVALUATION_LIST_CONFIG,
  evaluationSortColumns,
  matchesEvaluationSearch,
} from './listing'
import type { EvaluationRow } from './types'
import { useDeleteEvaluation } from './use-delete-evaluation'
import { useEvaluationFeedback } from './use-evaluation-feedback'
import { useEvaluationPdf } from './use-evaluation-pdf'

/**
 * The tab of one evaluation type (J-1), for every role. A type
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
      <EvaluationTypeList
        key={type}
        definition={evaluationWebDefinition(type)}
      />
    </div>
  )
}

/**
 * The record actions of a type (FR-015, J1 to J4): "Visualizar" for every
 * role and "Alterar" and "Excluir" for who may edit in the ⋮ menu of each
 * row, beside the row's PDF, and "Nova …" for who may edit. The record routes
 * carry the tab's state, so going back keeps it. "Excluir" asks for
 * confirmation and reports the result on the tab's feedback strip (FR-016).
 * A type with `restrictedRead` has no row actions for who may not edit.
 */
function useEvaluationRecordActions(
  definition: EvaluationWebDefinition,
  newLabel: string,
  onDownloadPdf: (row: EvaluationRow) => void,
  setFeedback: (message: ListFeedbackMessage | null) => void
) {
  const t = useTranslations('evaluations')
  const tc = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canEdit } = useAuth()
  const deleteEvaluation = useDeleteEvaluation(definition)
  const [pendingDelete, setPendingDelete] = useState<EvaluationRow | null>(null)

  function open(target: Parameters<typeof evaluationFormPath>[1]) {
    router.push(
      evaluationFormHref(
        evaluationFormPath(definition.type, target),
        searchParams
      )
    )
  }

  function getRowActions(row: EvaluationRow): RowActionsMenuProps {
    const view = {
      label: tc('view'),
      icon: 'visibility',
      onSelect: () => open({ id: row.id }),
    }

    return {
      edit: canEdit
        ? [
            view,
            {
              label: t('actions.edit'),
              icon: 'edit',
              onSelect: () => open({ id: row.id, edit: true }),
            },
          ]
        : [view],
      business: [
        {
          label: t('pdf.download'),
          icon: 'picture_as_pdf',
          onSelect: () => onDownloadPdf(row),
        },
      ],
      exit: canEdit
        ? [
            {
              label: t('delete.action'),
              icon: 'delete',
              onSelect: () => {
                setFeedback(null)
                setPendingDelete(row)
              },
            },
          ]
        : undefined,
    }
  }

  const deleteModal = (
    <DeleteEvaluationModal
      record={pendingDelete}
      onConfirm={deleteEvaluation}
      onClose={() => setPendingDelete(null)}
      onDeleted={(record) => {
        setPendingDelete(null)
        setFeedback({
          tone: 'success',
          text: t('feedback.deleted', { code: record.code }),
        })
      }}
    />
  )

  const newButton = canEdit ? (
    <NewEvaluationButton
      label={newLabel}
      onClick={() => open({ create: true })}
    />
  ) : null

  // A type that only editors read (FR-016) has no row action for the others:
  // the table then has no actions column, and "PDF em branco" stays.
  const canReadRecords = canEdit || !definition.restrictedRead

  return {
    getRowActions: canReadRecords ? getRowActions : undefined,
    newButton,
    deleteModal,
  }
}

/**
 * The listing of a type, driven by its definition (FR-010): each row has
 * "Visualizar" and "PDF" for every role and "Alterar" and "Excluir" for who
 * may edit; the top of the tab has the blank form and, for who may edit,
 * "Nova …" (FR-015, J1 to J5). Mounted once per type (`key`), as the
 * definition's queries are hooks.
 */
function EvaluationTypeList({
  definition,
}: {
  definition: EvaluationWebDefinition
}) {
  const t = useTranslations('evaluations')
  const list = definition.useList()
  const typeLabel = definition.typeLabel(t)
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const pdf = useEvaluationPdf(definition, (text) =>
    setFeedback({ tone: 'error', text })
  )

  useEvaluationFeedback(setFeedback)

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

  const { getRowActions, newButton, deleteModal } = useEvaluationRecordActions(
    definition,
    definition.newLabel(t),
    handleDownloadPdf,
    setFeedback
  )

  const rows = useMemo<EvaluationRow[] | undefined>(
    () =>
      list.items?.map((item) => ({
        id: item.id,
        number: item.number,
        code: item.code,
        type: definition.type,
        name: definition.rowName(item, typeLabel),
        activity: item.activity,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    [list.items, definition, typeLabel]
  )

  return (
    <EvaluationList
      typeLabel={typeLabel}
      rows={rows}
      isError={list.isError}
      onRetry={list.refetch}
      getRowActions={getRowActions}
      actions={
        <>
          <BlankPdfButton pdf={pdf} onClick={handleDownloadBlankPdf} />
          {newButton}
        </>
      }
      emptyAction={newButton}
      feedback={
        <ListFeedback message={feedback} onDismiss={() => setFeedback(null)} />
      }
      dialogs={deleteModal}
    />
  )
}

/**
 * "Nova …" of a type, beside the search and on the empty state (FR-015).
 * Rendered only for who may edit.
 */
function NewEvaluationButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20 hover:opacity-90"
    >
      <span className="material-symbols-outlined text-lg" aria-hidden>
        add
      </span>
      {label}
    </Button>
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
  /** The translated type, searched and sorted as the type column. */
  typeLabel: string
  /** `undefined` while loading or after an error. */
  rows: EvaluationRow[] | undefined
  isError: boolean
  onRetry: () => void
  /** The ⋮ menu of each row, if the type has row actions. */
  getRowActions?: (row: EvaluationRow) => RowActionsMenuProps
  /** Buttons at the top of the tab, beside the search, shown in every state. */
  actions?: ReactNode
  /** The action of the empty state ("Nova …", for who may edit). */
  emptyAction?: ReactNode
  /** The strip that reports the result of an action. */
  feedback?: ReactNode
  /** Dialogs of the row actions (the deletion confirmation). */
  dialogs?: ReactNode
}

/**
 * Search, sort and pages in the client, as in Projetos (FR-012). The list is
 * global (R-6): it takes no period, so the period chosen on another screen
 * never changes it.
 */
function EvaluationList({
  typeLabel,
  rows,
  isError,
  onRetry,
  getRowActions,
  actions,
  emptyAction,
  feedback,
  dialogs,
}: EvaluationListProps) {
  const t = useTranslations('evaluations')
  const columns = useEvaluationTableColumns()
  const router = useRouter()
  const pathname = usePathname()
  const list = useListState(EVALUATION_LIST_CONFIG)
  const { q: search, sortState } = list

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
          action={
            emptyAction ? <div className="mt-2">{emptyAction}</div> : undefined
          }
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
      {dialogs}
    </>
  )
}
