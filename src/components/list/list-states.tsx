import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'

import { ClearFiltersButton } from './clear-filters-button'

const containerClasses =
  'overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm'

type ListEmptyStateProps =
  | {
      variant: 'no-records'
      title: string
      description?: string
      /** Material Symbols icon name. */
      icon?: string
      /** e.g. the "Novo" button, when the profile allows it. */
      action?: ReactNode
    }
  | {
      variant: 'no-results'
      title?: string
      description?: string
      icon?: string
      onClearFilters: () => void
    }

/**
 * Empty list: `no-records` (nothing registered yet) or `no-results` (nothing
 * matches the search/filters, with the clear-filters button).
 */
export function ListEmptyState(props: ListEmptyStateProps) {
  const t = useTranslations('list')
  const isNoResults = props.variant === 'no-results'
  const icon = props.icon ?? (isNoResults ? 'search_off' : 'inventory_2')
  const title = props.title ?? t('noResultsTitle')
  const description =
    props.description ?? (isNoResults ? t('noResultsDescription') : undefined)

  return (
    <div className={`${containerClasses} px-6 py-16`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="material-symbols-outlined text-4xl text-outline/40"
          aria-hidden
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-on-surface-variant">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-xs text-outline">{description}</p>
          )}
        </div>
        {props.variant === 'no-results' ? (
          <ClearFiltersButton onClick={props.onClearFilters} />
        ) : (
          props.action
        )}
      </div>
    </div>
  )
}

interface ListErrorStateProps {
  title: string
  description?: string
  onRetry: () => void
}

export function ListErrorState({
  title,
  description,
  onRetry,
}: ListErrorStateProps) {
  const t = useTranslations()

  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Card className="max-w-xl border border-outline-variant/20 p-8 text-center shadow-[0_24px_40px_rgba(0,0,0,0.05)]">
        <span
          className="material-symbols-outlined text-[48px] text-error"
          aria-hidden
        >
          error
        </span>
        <h2 className="mt-2 font-headline text-xl font-bold text-on-surface">
          {title}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {description ?? t('list.errorDescription')}
        </p>
        <Button type="button" onClick={onRetry} className="mt-6">
          {t('common.retry')}
        </Button>
      </Card>
    </div>
  )
}

const headerCellClasses =
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider'

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high ${className ?? ''}`}
    />
  )
}

interface ListTableSkeletonProps {
  /** Unique column headers; their count defines the number of columns. */
  columns: string[]
  rows?: number
}

export function ListTableSkeleton({
  columns,
  rows = 5,
}: ListTableSkeletonProps) {
  return (
    <div className={containerClasses} aria-busy="true">
      <Table className="text-left">
        <TableHead className="border-none bg-surface-container-low/50">
          <TableRow className="border-none hover:bg-transparent">
            {columns.map((column) => (
              <TableHeaderCell key={column} className={headerCellClasses}>
                {column}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-outline-variant/10">
          {Array.from({ length: rows }, (_, row) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
            <TableRow key={row} className="border-none hover:bg-transparent">
              {columns.map((column, index) => (
                <TableCell key={column} className="px-6 py-5">
                  <SkeletonBlock
                    className={index === 0 ? 'h-4 w-48' : 'h-4 w-20'}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
