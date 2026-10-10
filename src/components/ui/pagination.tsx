import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '@/lib/utils'

type PaginationProps = ComponentProps<'nav'>

export function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between py-4', className)}
      {...props}
    />
  )
}

type PaginationInfoProps = ComponentProps<'p'>

export function PaginationInfo({ className, ...props }: PaginationInfoProps) {
  return (
    <p
      className={cn('text-sm text-on-surface-variant', className)}
      {...props}
    />
  )
}

type PaginationControlsProps = ComponentProps<'div'>

export function PaginationControls({
  className,
  ...props
}: PaginationControlsProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  )
}

const paginationButtonVariants = tv({
  base: 'inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
  variants: {
    active: {
      true: 'bg-primary text-on-primary',
      false: 'text-on-surface-variant hover:bg-surface-container-high',
    },
  },
  defaultVariants: {
    active: false,
  },
})

type PaginationButtonProps = ComponentProps<'button'> &
  VariantProps<typeof paginationButtonVariants>

export function PaginationButton({
  className,
  active,
  ...props
}: PaginationButtonProps) {
  return (
    <button
      className={paginationButtonVariants({ active, className })}
      {...props}
    />
  )
}

export { paginationButtonVariants }
