import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import { TableHeaderCell } from '@/components/ui'

import type { ListSort } from './list-utils'

const sortableHeader = tv({
  slots: {
    cell: 'px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider',
    button:
      'inline-flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary',
    icon: 'material-symbols-outlined text-base',
  },
  variants: {
    active: {
      true: { icon: 'text-primary' },
      false: { icon: 'text-outline/50' },
    },
  },
})

interface SortableHeaderCellProps<K extends string> {
  sortKey: K
  sort: ListSort<K>
  onSort: (key: K) => void
  children: ReactNode
  className?: string
}

/**
 * Column header that toggles asc/desc. Never use it for the "Ações" column.
 */
export function SortableHeaderCell<K extends string>({
  sortKey,
  sort,
  onSort,
  children,
  className,
}: SortableHeaderCellProps<K>) {
  const active = sort.key === sortKey
  const styles = sortableHeader({ active })
  const ariaSort = active
    ? sort.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  const icon = active
    ? sort.dir === 'asc'
      ? 'expand_less'
      : 'expand_more'
    : 'unfold_more'

  return (
    <TableHeaderCell
      aria-sort={ariaSort}
      className={styles.cell({ className })}
    >
      <button
        type="button"
        className={styles.button()}
        onClick={() => onSort(sortKey)}
      >
        {children}
        <span className={styles.icon()} aria-hidden>
          {icon}
        </span>
      </button>
    </TableHeaderCell>
  )
}
