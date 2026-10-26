import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '@/lib/utils'

type TabListProps = ComponentProps<'div'>

export function TabList({ className, ...props }: TabListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-surface-container-high p-1 classic:gap-0 classic:rounded-none classic:bg-transparent classic:p-0 classic:shadow-[inset_0_-1px_0_#ddd]',
        className
      )}
      {...props}
    />
  )
}

const tabVariants = tv({
  base: 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer classic:rounded-none',
  // Classic: the Paper nav-tabs underline. Important on the active tab
  // because the classic override of shadow-sm in globals.css comes later.
  variants: {
    active: {
      true: 'bg-surface-container-lowest text-on-surface shadow-sm classic:bg-transparent classic:text-primary classic:shadow-[inset_0_-2px_0_var(--color-primary)]!',
      false:
        'text-on-surface-variant hover:text-on-surface classic:hover:text-primary classic:hover:shadow-[inset_0_-2px_0_var(--color-primary)]',
    },
  },
  defaultVariants: {
    active: false,
  },
})

type TabProps = ComponentProps<'button'> & VariantProps<typeof tabVariants>

export function Tab({ className, active, ...props }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={active || false}
      className={tabVariants({ active, className })}
      {...props}
    />
  )
}

export { tabVariants }
