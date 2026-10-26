import { useTranslations } from 'next-intl'
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { HighlightText } from '@/components/list'
import { Button, TableCell } from '@/components/ui'
import type {
  MatrixProjectStatus,
  MatrixRiskLevel,
  MatrixRow,
  MatrixValues,
} from '@/http/api'
import { cn } from '@/lib/utils'

import { getMatrixDisplayValue, type MatrixColumn } from './columns'
import { MATRIX_LIST_VALUES } from './listing'
import { useMatrixValueLabels } from './use-matrix-labels'

const cellClasses =
  'min-w-36 max-w-sm px-6 py-4 align-top text-on-surface-variant'

/** The editor floats over the cell at least this wide, whatever the column. */
const EDITOR_MIN_WIDTH = 320
const VIEWPORT_GAP = 8

interface MatrixCellProps {
  row: MatrixRow
  /** Any column but the code, which the table renders itself. */
  column: MatrixColumn
  search: string
  /** Users and admins edit the 21 fields; the activity is read-only (R-7). */
  canEdit: boolean
  /** This cell's editor is the one open in the table. */
  isEditing: boolean
  onOpen: () => void
  onClose: () => void
  /** Writes the value; resolves to `null`, or to the translated error. */
  onSave: (value: string | null) => Promise<string | null>
}

/**
 * One cell of the Resultados table. For the viewer, and in the columns of the
 * activity, it is text (R-15). For who edits, a field is a button that opens
 * its editor by a click or Enter (J5): a list that saves on choosing, or a
 * text area saved by "Salvar" or Ctrl/Cmd+Enter. Esc, "Cancelar" and a click
 * outside close it without saving, and so does losing the focus (H-3).
 * While saving, the cell shows it and takes no other edit; the value changes
 * only when the API answers, and a failure keeps the previous value with the
 * translated reason (R-13, R-14).
 */
export function MatrixCell({
  row,
  column,
  search,
  canEdit,
  isEditing,
  onOpen,
  onClose,
  onSave,
}: MatrixCellProps) {
  const t = useTranslations('matrix')
  const labels = useMatrixValueLabels()
  const cellRef = useRef<HTMLTableCellElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayValue = getMatrixDisplayValue(row, column, labels)
  const content =
    displayValue === null ? (
      <span className="text-outline/60" aria-hidden>
        —
      </span>
    ) : (
      <div
        title={displayValue}
        className="line-clamp-4 whitespace-pre-line break-words"
      >
        <HighlightText text={displayValue} search={search} />
      </div>
    )

  if (!canEdit || column.source === 'activity') {
    return <TableCell className={cellClasses}>{content}</TableCell>
  }

  const field = column.key as keyof MatrixValues
  const rawValue = row.values[field]
  const columnLabel = t(`columns.${column.key}`)

  function open() {
    if (isSaving) return

    setError(null)
    onOpen()
  }

  function close() {
    onClose()
    buttonRef.current?.focus()
  }

  async function save(value: string | null) {
    close()
    if (value === rawValue) return

    setError(null)
    setIsSaving(true)
    const message = await onSave(value)
    setIsSaving(false)
    setError(message)
  }

  return (
    <TableCell ref={cellRef} className={cn(cellClasses, 'p-0')}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('edit.label', {
          column: columnLabel,
          code: row.activity.code,
        })}
        aria-haspopup="dialog"
        aria-expanded={isEditing}
        aria-disabled={isSaving}
        aria-busy={isSaving}
        onClick={open}
        className={cn(
          'group/cell relative flex min-h-full w-full cursor-pointer items-start gap-2 px-6 py-4 text-left outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          isEditing && 'bg-primary/5 ring-2 ring-inset ring-primary',
          isSaving && 'cursor-progress'
        )}
      >
        <span className={cn('min-w-0 flex-1', isSaving && 'opacity-50')}>
          {content}
        </span>
        <span
          className={cn(
            'material-symbols-outlined text-base text-outline',
            isSaving
              ? 'animate-spin'
              : 'opacity-0 group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100'
          )}
          aria-hidden
        >
          {isSaving ? 'progress_activity' : 'edit'}
        </span>
      </button>

      {isSaving && (
        <span role="status" className="sr-only">
          {t('edit.saving')}
        </span>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-1 px-6 pb-3 text-xs font-medium text-error"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden>
            error
          </span>
          {error}
        </p>
      )}

      {isEditing && (
        <MatrixCellEditor
          anchorRef={cellRef}
          label={t('edit.title', {
            column: columnLabel,
            code: row.activity.code,
          })}
          column={column}
          value={rawValue}
          onCancel={close}
          onDismiss={onClose}
          onSave={(value) => void save(value)}
        />
      )}
    </TableCell>
  )
}

interface MatrixCellEditorProps {
  anchorRef: RefObject<HTMLTableCellElement | null>
  label: string
  column: MatrixColumn
  value: string | null
  /** Esc or "Cancelar": closes, back to the cell. */
  onCancel: () => void
  /** A click outside: closes, leaving the focus where it went. */
  onDismiss: () => void
  onSave: (value: string | null) => void
}

/**
 * The editor of a cell, in a portal over it so the column keeps its width and
 * the scrolling table does not clip it. It follows the cell while the page or
 * the table scrolls, and stays inside the viewport.
 */
function MatrixCellEditor({
  anchorRef,
  label,
  column,
  value,
  onCancel,
  onDismiss,
  onSave,
}: MatrixCellEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current
      const editor = editorRef.current
      if (!anchor || !editor) return

      const rect = anchor.getBoundingClientRect()
      const width = Math.min(
        Math.max(rect.width, EDITOR_MIN_WIDTH),
        window.innerWidth - 2 * VIEWPORT_GAP
      )
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_GAP),
        window.innerWidth - width - VIEWPORT_GAP
      )
      const top = Math.max(
        VIEWPORT_GAP,
        Math.min(
          rect.top,
          window.innerHeight - editor.offsetHeight - VIEWPORT_GAP
        )
      )

      setPosition({ top, left, width })
    }

    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        editorRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return
      }
      onDismiss()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [anchorRef, onDismiss])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return

    event.stopPropagation()
    onCancel()
  }

  return createPortal(
    <div
      ref={editorRef}
      role="dialog"
      aria-label={label}
      onKeyDown={handleKeyDown}
      // Transparent, not hidden, until placed: its first control takes the
      // focus on mount, and a hidden element cannot.
      style={
        position
          ? { top: position.top, left: position.left, width: position.width }
          : { top: 0, left: 0, opacity: 0 }
      }
      className="fixed z-50 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-lg"
    >
      {column.type === 'text' ? (
        <MatrixTextEditor value={value} onCancel={onCancel} onSave={onSave} />
      ) : (
        <MatrixListEditor column={column} value={value} onSave={onSave} />
      )}
    </div>,
    document.body
  )
}

function MatrixTextEditor({
  value,
  onCancel,
  onSave,
}: {
  value: string | null
  onCancel: () => void
  onSave: (value: string | null) => void
}) {
  const t = useTranslations()
  const [draft, setDraft] = useState(value ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [])

  // Blank is empty; the rest goes as typed, and the API trims it (FR-010).
  function submit() {
    onSave(draft.trim() ? draft : null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={draft}
        rows={6}
        aria-label={t('matrix.edit.textLabel')}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-y rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-outline">{t('matrix.edit.hint')}</p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            color="secondary"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={submit}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Alto/Médio/Baixo or Aberto/Fechado, and "vazio"; choosing one saves it. */
function MatrixListEditor({
  column,
  value,
  onSave,
}: {
  column: MatrixColumn
  value: string | null
  onSave: (value: string | null) => void
}) {
  const t = useTranslations('matrix.edit')
  const labels = useMatrixValueLabels()
  const listRef = useRef<HTMLFieldSetElement>(null)

  const options: { value: string | null; label: string }[] = [
    ...(column.type === 'risk_level'
      ? MATRIX_LIST_VALUES.risk_level.map((option) => ({
          value: option,
          label: labels.riskLevel(option as MatrixRiskLevel),
        }))
      : MATRIX_LIST_VALUES.project_status.map((option) => ({
          value: option,
          label: labels.projectStatus(option as MatrixProjectStatus),
        }))),
    { value: null, label: t('emptyOption') },
  ]

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus()
  }, [])

  // ↑/↓ move between the options, as in a list.
  function handleKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const buttons = Array.from(
      listRef.current?.querySelectorAll('button') ?? []
    )
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    buttons[(index + step + buttons.length) % buttons.length]?.focus()
  }

  return (
    <fieldset
      ref={listRef}
      aria-label={t('listLabel')}
      onKeyDown={handleKeyDown}
      className="m-0 flex min-w-0 flex-col border-0 p-0"
    >
      {options.map((option) => {
        const isCurrent = option.value === value

        return (
          <button
            key={option.value ?? ''}
            type="button"
            aria-pressed={isCurrent}
            onClick={() => onSave(option.value)}
            className={cn(
              'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm text-on-surface outline-none transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary',
              option.value === null && 'italic text-on-surface-variant'
            )}
          >
            {option.label}
            {isCurrent && (
              <span
                className="material-symbols-outlined text-base text-primary"
                aria-hidden
              >
                check
              </span>
            )}
          </button>
        )
      })}
    </fieldset>
  )
}
