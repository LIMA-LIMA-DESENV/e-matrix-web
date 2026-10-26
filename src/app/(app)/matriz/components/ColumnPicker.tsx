import { useTranslations } from 'next-intl'

import {
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui'

import { MATRIX_COLUMNS, type MatrixColumnKey } from './columns'

interface ColumnPickerProps {
  visibleKeys: ReadonlySet<MatrixColumnKey>
  /** Columns with an active filter, which keeps filtering while hidden. */
  filteredKeys: ReadonlySet<MatrixColumnKey>
  onToggle: (key: MatrixColumnKey) => void
  onShowAll: () => void
}

/**
 * Turns each of the 27 columns on and off (R-10), in the legacy order, with
 * the legacy help texts. A hidden column with an active filter keeps
 * filtering, so the picker marks it, and its trigger too.
 */
export function ColumnPicker({
  visibleKeys,
  filteredKeys,
  onToggle,
  onShowAll,
}: ColumnPickerProps) {
  const t = useTranslations('matrix')

  const hasHiddenFilter = [...filteredKeys].some((key) => !visibleKeys.has(key))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: 'outline',
          color: 'primary',
          size: 'lg',
          className: 'relative px-5',
        })}
      >
        <span className="material-symbols-outlined text-lg" aria-hidden>
          view_column
        </span>
        {t('columnPicker.label', {
          visible: visibleKeys.size,
          total: MATRIX_COLUMNS.length,
        })}
        {hasHiddenFilter && (
          <span
            role="img"
            title={t('columnPicker.hiddenFilterActive')}
            aria-label={t('columnPicker.hiddenFilterActive')}
            className="material-symbols-outlined text-lg text-amber-600"
          >
            filter_alt
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        role="group"
        aria-label={t('columnPicker.title')}
        className="max-h-[70vh] w-80 overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2 border-b border-outline-variant/30 px-4 py-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-outline">
            {t('columnPicker.title')}
          </span>
          <button
            type="button"
            onClick={onShowAll}
            disabled={visibleKeys.size === MATRIX_COLUMNS.length}
            className="cursor-pointer text-xs font-semibold text-primary hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline"
          >
            {t('columnPicker.showAll')}
          </button>
        </div>

        <ul className="py-1">
          {MATRIX_COLUMNS.map((column) => {
            const isVisible = visibleKeys.has(column.key)
            const isFiltered = filteredKeys.has(column.key)
            const filterHint = isVisible
              ? t('columnPicker.filterActive')
              : t('columnPicker.hiddenFilterActive')

            return (
              <li key={column.key}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-1.5 text-sm text-on-surface hover:bg-surface-container-low has-[:disabled]:cursor-default">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    // The table always keeps one column.
                    disabled={isVisible && visibleKeys.size === 1}
                    onChange={() => onToggle(column.key)}
                    className="size-4 cursor-pointer accent-primary disabled:cursor-default"
                  />
                  <span className="flex-1">{t(`columns.${column.key}`)}</span>
                  {column.help && (
                    <span
                      role="img"
                      title={t(`help.${column.help}`)}
                      aria-label={t(`help.${column.help}`)}
                      className="material-symbols-outlined text-sm text-outline"
                    >
                      info
                    </span>
                  )}
                  {isFiltered && (
                    <span
                      role="img"
                      title={filterHint}
                      aria-label={filterHint}
                      className={`material-symbols-outlined text-base ${
                        isVisible ? 'text-primary' : 'text-amber-600'
                      }`}
                    >
                      filter_alt
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
