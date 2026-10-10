import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type TableProps = ComponentProps<'table'>

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

type TableHeadProps = ComponentProps<'thead'>

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <thead
      className={cn('border-b border-outline-variant', className)}
      {...props}
    />
  )
}

type TableBodyProps = ComponentProps<'tbody'>

export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
}

type TableRowProps = ComponentProps<'tr'>

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low',
        className
      )}
      {...props}
    />
  )
}

type TableHeaderCellProps = ComponentProps<'th'>

export function TableHeaderCell({ className, ...props }: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-label text-xs font-bold text-on-surface-variant',
        className
      )}
      {...props}
    />
  )
}

type TableCellProps = ComponentProps<'td'>

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />
}
