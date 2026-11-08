'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef } from 'react'
import {
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  get,
  type Path,
  type UseFormRegister,
  useFieldArray,
  useFormState,
} from 'react-hook-form'

import { Button, inputVariants } from '@/components/ui'

import { textareaClasses } from './form-parts'

/** One column of a table of rows: the key of its cell and its label. */
export interface EvaluationRowsColumn {
  key: string
  label: string
}

/** The default limit of rows, the API's (`MAX_EVALUATION_ROWS`, FR-022). */
const DEFAULT_MAX_ROWS = 30

interface EvaluationRowsFieldProps<
  TFieldValues extends FieldValues,
  TName extends ArrayPath<TFieldValues>,
> {
  /** The `control` of the form's react-hook-form instance. */
  control: Control<TFieldValues, unknown, unknown>
  register: UseFormRegister<TFieldValues>
  /** The path of the rows, a list of objects with one string per column. */
  name: TName
  /** The table's title, its caption and the prefix of its ids. */
  title: string
  columns: readonly EvaluationRowsColumn[]
  /** The view (J2): no "Adicionar linha" nor "Remover linha". */
  readOnly?: boolean
  maxRows?: number
}

/**
 * A table of repeatable rows of an evaluation answer (`rows`, FR-023): one
 * `<tr>` per row, with a multiline text area per column labelled "<column>,
 * linha <n>" and "Remover linha <n>". "Adicionar linha" appends an empty
 * row at the end, up to `maxRows`; removing takes exactly the chosen row and
 * keeps the order of the others; the only row left cannot be removed, so
 * the form always shows at least one (R-17). The focus follows NFR-009.
 * Only the table scrolls sideways on a narrow screen, never the page
 * (AC-027). The cells are registered in the form, so the rows are kept by
 * an invalid submit or an error of the API (R-18).
 */
export function EvaluationRowsField<
  TFieldValues extends FieldValues,
  TName extends ArrayPath<TFieldValues>,
>({
  control,
  register,
  name,
  title,
  columns,
  readOnly = false,
  maxRows = DEFAULT_MAX_ROWS,
}: EvaluationRowsFieldProps<TFieldValues, TName>) {
  const t = useTranslations('evaluations.rowsField')
  const baseId = useId()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // The cell to focus once the rows render again: the first one of a row
  // just added, or of the row before a removed one (NFR-009).
  const pendingFocusRef = useRef<number | 'add' | null>(null)
  const { fields, append, remove, replace } = useFieldArray({ control, name })
  const { errors } = useFormState({ control, name: name as Path<TFieldValues> })

  const emptyRow = () =>
    Object.fromEntries(columns.map((column) => [column.key, ''])) as FieldArray<
      TFieldValues,
      TName
    >

  // The form always has at least one row (R-17), even when the values came
  // without any.
  const isEmpty = fields.length === 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the count matters; `emptyRow` is rebuilt every render from the same columns.
  useEffect(() => {
    if (isEmpty) replace([emptyRow()])
  }, [isEmpty, replace])

  const cellId = (index: number, column: string) =>
    `${baseId}-${index}-${column}`

  useEffect(() => {
    const target = pendingFocusRef.current
    if (target === null) return
    pendingFocusRef.current = null

    if (target === 'add') {
      addButtonRef.current?.focus()
      return
    }

    const first = columns[0]
    if (first) document.getElementById(cellId(target, first.key))?.focus()
  })

  function handleAdd() {
    if (fields.length >= maxRows) return
    pendingFocusRef.current = fields.length
    append(emptyRow(), { shouldFocus: false })
  }

  function handleRemove(index: number) {
    if (fields.length <= 1) return
    pendingFocusRef.current = index > 0 ? index - 1 : 'add'
    remove(index)
  }

  const canAdd = fields.length < maxRows
  const canRemove = fields.length > 1
  const tableError = get(errors, name) as
    | { message?: string; root?: { message?: string } }
    | undefined
  const tableMessage = tableError?.message ?? tableError?.root?.message

  return (
    <div className="space-y-3">
      {/* Only this box scrolls sideways; the page never does (AC-027). It is
          positioned so the `sr-only` texts, absolute, stay inside it. */}
      <div className="relative max-w-full overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-surface-container-low text-left">
            <tr>
              <th
                scope="col"
                className="w-12 px-3 py-2 text-xs font-bold text-on-surface-variant"
              >
                {t('rowNumber')}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="min-w-56 px-3 py-2 text-xs font-bold text-on-surface-variant"
                >
                  {column.label}
                </th>
              ))}
              {!readOnly && (
                <th scope="col" className="w-12 px-3 py-2">
                  <span className="sr-only">{t('actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const row = index + 1

              return (
                <tr
                  key={field.id}
                  className="border-t border-outline-variant/30 align-top"
                >
                  <th
                    scope="row"
                    className="px-3 py-3 text-xs font-bold text-on-surface-variant"
                  >
                    {row}
                  </th>
                  {columns.map((column) => {
                    const path = `${name}.${index}.${column.key}`
                    const error = (
                      get(errors, path) as { message?: string } | undefined
                    )?.message
                    const id = cellId(index, column.key)

                    return (
                      <td key={column.key} className="px-2 py-2">
                        <textarea
                          id={id}
                          rows={2}
                          aria-label={t('cellLabel', {
                            column: column.label,
                            row,
                          })}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? `${id}-error` : undefined}
                          className={inputVariants({
                            className: `${textareaClasses} w-full`,
                          })}
                          {...register(path as Path<TFieldValues>)}
                        />
                        {error && (
                          <p
                            id={`${id}-error`}
                            className="mt-1 text-xs font-medium text-error"
                          >
                            {error}
                          </p>
                        )}
                      </td>
                    )
                  })}
                  {!readOnly && (
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        color="error"
                        onClick={() => handleRemove(index)}
                        disabled={!canRemove}
                        aria-label={t('removeRow', { row })}
                        title={t('removeRow', { row })}
                      >
                        <span
                          className="material-symbols-outlined text-lg"
                          aria-hidden
                        >
                          delete
                        </span>
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {tableMessage && (
        <p role="alert" className="text-xs font-medium text-error">
          {tableMessage}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            ref={addButtonRef}
            type="button"
            size="sm"
            variant="outline"
            color="primary"
            onClick={handleAdd}
            disabled={!canAdd}
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              add
            </span>
            {t('addRow')}
          </Button>
          <p className="text-xs text-on-surface-variant">
            {t('limit', { max: maxRows })}
          </p>
        </div>
      )}
    </div>
  )
}
