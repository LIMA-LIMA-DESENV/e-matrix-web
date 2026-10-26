'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useMemo, useState } from 'react'

import {
  ListEmptyState,
  ListErrorState,
  ListFeedback,
  type ListFeedbackMessage,
  ListPagination,
  ListTableSkeleton,
  type PeriodSliceQueryOptions,
  paginate,
  serializeListState,
  sortItems,
  useListState,
  usePeriodSlice,
} from '@/components/list'
import { useAuth } from '@/contexts/AuthContext'
import { type MatrixRow, useGetMatricesPeriodId } from '@/http/api'

import {
  clearedMatrixFilters,
  DEFAULT_MATRIX_COLUMNS,
  ExportMenu,
  getFilteredMatrixColumns,
  getMatrixSortColumns,
  MATRIX_LIST_CONFIG,
  MatrixEmptyState,
  type MatrixExportFormat,
  MatrixFilterBar,
  MatrixTable,
  MatrixTabs,
  matchesMatrixColumnFilters,
  matchesMatrixSearch,
  useMatrixColumnLabels,
  useMatrixColumns,
  useMatrixExport,
  useMatrixProjects,
  useMatrixValueLabels,
  useUpdateMatrixField,
} from './components'

/**
 * The Matrix of one period. There is no "all periods" (R-2): without a
 * period id nothing is requested, which is also the case with no period
 * registered.
 */
function useMatrixOfPeriod(
  periodId: string | undefined,
  query: PeriodSliceQueryOptions
) {
  return useGetMatricesPeriodId(periodId ?? '', {
    query: { ...query, enabled: query.enabled && !!periodId },
  })
}

export default function MatrizPage() {
  const columns = useMatrixColumnLabels(DEFAULT_MATRIX_COLUMNS)

  return (
    <Suspense fallback={<ListTableSkeleton columns={columns} />}>
      <MatrixResults />
    </Suspense>
  )
}

/**
 * The Resultados tab, for every role; users and admins also start the Matrix
 * of the period and edit its cells, the viewer only reads (R-15). The Matrix is
 * sliced by period like the listings sliced by period (FR-018): the period is
 * a request parameter and its default is resolved by `usePeriodSlice`, while
 * search, column filters, sort and pages stay in the client and in the URL
 * (FR-021, FR-023). The visible columns are remembered in the browser
 * (FR-022). The export takes the visible columns and the filtered rows of
 * every page (FR-025). The projects of the row menus are loaded with the
 * screen, once for every period (FR-026). Opening a period, initialized or
 * not, only reads (R-4).
 */
function MatrixResults() {
  const t = useTranslations('matrix')
  const router = useRouter()
  const pathname = usePathname()
  const labels = useMatrixValueLabels()
  const list = useListState(MATRIX_LIST_CONFIG)
  const {
    visibleColumns,
    visibleKeys,
    isDefaultSelection,
    toggleColumn,
    showAllColumns,
    resetColumns,
  } = useMatrixColumns()
  const skeletonColumns = useMatrixColumnLabels(visibleColumns)
  const projects = useMatrixProjects()
  const [feedback, setFeedback] = useState<ListFeedbackMessage | null>(null)
  const matrixExport = useMatrixExport((text) =>
    setFeedback({ tone: 'error', text })
  )

  const { canEdit } = useAuth()
  const { q: search, filters, sortState, setFilter } = list

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
      data: matrixResponse,
      isLoading: isMatrixLoading,
      isError: isMatrixError,
      refetch: refetchMatrix,
    },
  } = usePeriodSlice({
    period: list.filters.period,
    onPeriodChange,
    useRecords: useMatrixOfPeriod,
  })

  const matrix = matrixResponse?.status === 200 ? matrixResponse.data : null
  const saveField = useUpdateMatrixField(matrix?.period.id ?? '')

  const sortColumns = useMemo(() => getMatrixSortColumns(labels), [labels])

  // Hidden columns keep filtering: the filters are in the URL, not in the
  // columns on screen.
  const visibleRows = useMemo<MatrixRow[]>(() => {
    const rows = matrix?.rows ?? []
    const filtered = rows.filter(
      (row) =>
        matchesMatrixSearch(row, search, labels) &&
        matchesMatrixColumnFilters(row, filters)
    )

    return sortItems(
      filtered,
      sortColumns,
      sortState,
      MATRIX_LIST_CONFIG.defaultSort
    )
  }, [matrix, search, filters, labels, sortColumns, sortState])

  const pageData = paginate(visibleRows, list.page)

  const filteredKeys = useMemo(
    () => getFilteredMatrixColumns(filters),
    [filters]
  )

  // The period is always set, so it is not something to "clear".
  const canClear =
    Boolean(search.trim()) || filteredKeys.size > 0 || !isDefaultSelection

  /**
   * "Limpar", as in the legacy: the default columns, no search and no column
   * filter, in the same period (R-10).
   */
  function clearAll() {
    resetColumns()

    const query = serializeListState(
      {
        ...list,
        q: '',
        page: 1,
        filters: clearedMatrixFilters(filters.period),
      },
      MATRIX_LIST_CONFIG
    )
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function handleExport(format: MatrixExportFormat) {
    if (!matrix) return

    setFeedback(null)
    void matrixExport.exportMatrix(format, {
      columns: visibleColumns,
      rows: visibleRows,
      periodDescription: matrix.period.description,
    })
  }

  function handleRetry() {
    if (isPeriodsError || !arePeriodsLoaded) {
      void refetchPeriods()
      return
    }

    void refetchMatrix()
  }

  function renderContent() {
    if (isPeriodsError || (isMatrixError && !isRecheckingPeriod)) {
      return (
        <ListErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          onRetry={handleRetry}
        />
      )
    }

    if (!isPeriodChosen || isMatrixLoading || isRecheckingPeriod || !matrix) {
      return <ListTableSkeleton columns={skeletonColumns} />
    }

    if (!matrix.initialized) {
      return (
        <MatrixEmptyState
          key={matrix.period.id}
          matrix={matrix}
          canEdit={canEdit}
        />
      )
    }

    if (matrix.rows.length === 0) {
      return (
        <ListEmptyState
          variant="no-records"
          icon="grid_on"
          title={t('noActivities.title')}
          description={t('noActivities.description')}
        />
      )
    }

    // With no row left the table keeps its header, so the column filters can
    // still be changed.
    return (
      <MatrixTable
        rows={pageData.items}
        columns={visibleColumns}
        search={search}
        sort={sortState}
        onSort={list.toggleSort}
        filters={filters}
        onFilterChange={setFilter}
        projects={projects}
        canEdit={canEdit}
        onSaveField={saveField}
        footer={
          visibleRows.length === 0 ? (
            <ListEmptyState variant="no-results" onClearFilters={clearAll} />
          ) : (
            <ListPagination
              page={pageData.page}
              pageCount={pageData.pageCount}
              total={pageData.total}
              start={pageData.start}
              end={pageData.end}
              itemLabel={t('itemLabel', { count: pageData.total })}
              onPageChange={list.setPage}
            />
          )
        }
      />
    )
  }

  return (
    <div>
      <MatrixTabs active="results" />

      {arePeriodsLoaded && !hasPeriods && !isPeriodsError ? (
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
      ) : (
        <>
          {hasPeriods && (
            <MatrixFilterBar
              search={search}
              periods={periods}
              period={selectedPeriod}
              visibleKeys={visibleKeys}
              filteredKeys={filteredKeys}
              canClear={canClear}
              exportMenu={
                matrix?.initialized && (
                  <ExportMenu
                    generating={matrixExport.generating}
                    onExport={handleExport}
                  />
                )
              }
              onSearchChange={list.setSearch}
              onPeriodChange={onPeriodChange}
              onToggleColumn={toggleColumn}
              onShowAllColumns={showAllColumns}
              onClear={clearAll}
            />
          )}

          <ListFeedback
            message={feedback}
            onDismiss={() => setFeedback(null)}
          />

          {renderContent()}
        </>
      )}
    </div>
  )
}
