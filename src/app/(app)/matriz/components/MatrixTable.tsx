import { useTranslations } from 'next-intl'
import { type MouseEvent, type ReactNode, useEffect, useState } from 'react'

import {
  HighlightText,
  type ListSort,
  SortableHeaderCell,
} from '@/components/list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { MatrixRow, MatrixValues } from '@/http/api'
import { cn } from '@/lib/utils'

import {
  getMatrixDisplayValue,
  type MatrixColumn,
  type MatrixColumnKey,
} from './columns'
import { type MatrixFilterKey, matrixFilterKey } from './listing'
import { MatrixCell } from './MatrixCell'
import { MatrixColumnFilter } from './MatrixColumnFilter'
import {
  type MatrixMenuPoint,
  MatrixRowProjectsMenu,
} from './MatrixRowProjectsMenu'
import { useMatrixValueLabels } from './use-matrix-labels'
import type { MatrixProjects } from './use-matrix-projects'

// The code column stays in place while the wide table scrolls sideways. A
// sticky cell needs a background of its own, and the row hover is repeated on
// it through `group`; the inset shadow marks its edge without a border, which
// would scroll away with the collapsed table borders.
const stickyCellClasses =
  'sticky left-0 z-[1] shadow-[inset_-1px_0_0_var(--color-outline-variant)]'
// The row menu stays in reach on the other side, the same way.
const stickyActionsClasses =
  'sticky right-0 z-[1] w-px px-2 shadow-[inset_1px_0_0_var(--color-outline-variant)]'

/**
 * Where the native context menu stays: editors and fields inside the row
 * (T-008) keep their own.
 */
const NATIVE_CONTEXT_MENU = 'input, textarea, select, [contenteditable="true"]'

interface OpenRowMenu {
  activityId: string
  point: MatrixMenuPoint | null
}

interface OpenEditor {
  activityId: string
  key: MatrixColumnKey
}

/** Translated headers of the given columns, also used by the skeleton. */
export function useMatrixColumnLabels(columns: readonly MatrixColumn[]) {
  const t = useTranslations('matrix.columns')

  return columns.map((column) => t(column.key))
}

interface MatrixTableProps {
  /** The rows of the current page. */
  rows: MatrixRow[]
  /** The visible columns, in the legacy order; the first is the code. */
  columns: readonly MatrixColumn[]
  search: string
  sort: ListSort<MatrixColumnKey>
  onSort: (key: MatrixColumnKey) => void
  /** The column filters in the URL, hidden columns included. */
  filters: Record<MatrixFilterKey, string>
  onFilterChange: (key: MatrixFilterKey, value: string) => void
  /** The RGP and RGA of the activities, for the row menus. */
  projects: MatrixProjects
  /** Users and admins edit the 21 fields in the cells (J5). */
  canEdit: boolean
  /** Writes one field; resolves to `null`, or to the translated error. */
  onSaveField: (
    activityId: string,
    field: keyof MatrixValues,
    value: string | null
  ) => Promise<string | null>
  /** Pagination, or the empty state when no row passes the filters. */
  footer?: ReactNode
}

/**
 * The Resultados table: every value as stored, the list values translated
 * (R-8, R-12). Each header sorts (R-9), carries the legacy help text, when the
 * column has one (R-7), and its filter (R-11). The header is kept with no row,
 * so a filter can still be changed. Each row has the menu of its projects, by
 * the ⋮ button or a right click on the row, one open at a time (J7). Who edits
 * changes the 21 fields in their cells, one editor open at a time, closed
 * without saving when its cell leaves the screen by a sort, a filter, a page
 * or the column picker (J5).
 */
export function MatrixTable({
  rows,
  columns,
  search,
  sort,
  onSort,
  filters,
  onFilterChange,
  projects,
  canEdit,
  onSaveField,
  footer,
}: MatrixTableProps) {
  const t = useTranslations('matrix')
  const tCommon = useTranslations('common')
  const labels = useMatrixValueLabels()
  const [openMenu, setOpenMenu] = useState<OpenRowMenu | null>(null)
  const [openEditor, setOpenEditor] = useState<OpenEditor | null>(null)

  const isEditorShown =
    openEditor !== null &&
    rows.some(({ activity }) => activity.id === openEditor.activityId) &&
    columns.some(({ key }) => key === openEditor.key)

  // Forgotten, not kept for when the cell comes back.
  useEffect(() => {
    if (openEditor && !isEditorShown) setOpenEditor(null)
  }, [openEditor, isEditorShown])

  function handleRowContextMenu(
    event: MouseEvent<HTMLTableRowElement>,
    activityId: string
  ) {
    const target = event.target as Element

    // React events also arrive from the menu portal, which is not in the row.
    if (
      !event.currentTarget.contains(target) ||
      target.closest(NATIVE_CONTEXT_MENU)
    ) {
      return
    }

    event.preventDefault()
    setOpenMenu({ activityId, point: { x: event.clientX, y: event.clientY } })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low">
          <TableRow className="border-none hover:bg-transparent">
            {columns.map((column, index) => (
              <SortableHeaderCell
                key={column.key}
                sortKey={column.key}
                sort={sort}
                onSort={onSort}
                className={cn(
                  'whitespace-nowrap',
                  index === 0 && `${stickyCellClasses} bg-surface-container-low`
                )}
              >
                {t(`columns.${column.key}`)}
                {column.help && (
                  <span
                    role="img"
                    title={t(`help.${column.help}`)}
                    aria-label={t(`help.${column.help}`)}
                    className="material-symbols-outlined text-sm normal-case text-outline"
                  >
                    info
                  </span>
                )}
              </SortableHeaderCell>
            ))}
            <TableHeaderCell
              className={`${stickyActionsClasses} bg-surface-container-low`}
            >
              <span className="sr-only">{tCommon('actions')}</span>
            </TableHeaderCell>
          </TableRow>
          <TableRow className="border-none hover:bg-transparent">
            {columns.map((column, index) => {
              const key = matrixFilterKey(column.key)

              return (
                <TableHeaderCell
                  key={column.key}
                  className={cn(
                    'h-auto px-6 pb-3 pt-0 align-top',
                    index === 0 &&
                      `${stickyCellClasses} bg-surface-container-low`
                  )}
                >
                  <MatrixColumnFilter
                    column={column}
                    value={filters[key]}
                    onChange={(value) => onFilterChange(key, value)}
                  />
                </TableHeaderCell>
              )
            })}
            <TableHeaderCell
              aria-hidden
              className={`${stickyActionsClasses} h-auto bg-surface-container-low`}
            />
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {rows.map((row) => (
            <TableRow
              key={row.activity.id}
              className="group border-none"
              onContextMenu={(event) =>
                handleRowContextMenu(event, row.activity.id)
              }
            >
              {columns.map((column, index) => {
                if (index === 0) {
                  const value = getMatrixDisplayValue(row, column, labels)

                  return (
                    <TableCell
                      key={column.key}
                      className={`${stickyCellClasses} whitespace-nowrap bg-surface-container-lowest px-6 py-4 font-bold text-on-surface transition-colors group-hover:bg-surface-container-low`}
                    >
                      <HighlightText text={value} search={search} />
                    </TableCell>
                  )
                }

                const isEditing =
                  openEditor?.activityId === row.activity.id &&
                  openEditor.key === column.key

                return (
                  <MatrixCell
                    key={column.key}
                    row={row}
                    column={column}
                    search={search}
                    canEdit={canEdit}
                    isEditing={isEditing}
                    onOpen={() =>
                      setOpenEditor({
                        activityId: row.activity.id,
                        key: column.key,
                      })
                    }
                    onClose={() =>
                      setOpenEditor((current) => (isEditing ? null : current))
                    }
                    onSave={(value) =>
                      onSaveField(
                        row.activity.id,
                        column.key as keyof MatrixValues,
                        value
                      )
                    }
                  />
                )
              })}
              <TableCell
                className={`${stickyActionsClasses} bg-surface-container-lowest py-4 align-top transition-colors group-hover:bg-surface-container-low`}
              >
                <MatrixRowProjectsMenu
                  activityCode={row.activity.code}
                  projects={projects.byActivity.get(row.activity.id) ?? []}
                  isLoading={projects.isLoading}
                  isError={projects.isError}
                  onRetry={() => void projects.refetch()}
                  open={openMenu?.activityId === row.activity.id}
                  anchorPoint={
                    openMenu?.activityId === row.activity.id
                      ? openMenu.point
                      : null
                  }
                  onOpenChange={(open) =>
                    setOpenMenu((current) =>
                      open
                        ? { activityId: row.activity.id, point: null }
                        : current?.activityId === row.activity.id
                          ? null
                          : current
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {footer}
    </div>
  )
}
