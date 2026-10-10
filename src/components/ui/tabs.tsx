import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '@/lib/utils'

type TabListProps = ComponentProps<'div'>

export function TabList({ className, ...props }: TabListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-surface-container-high p-1',
        className
      )}
      {...props}
    />
  )
}

const tabVariants = tv({
  base: 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer',
  variants: {
    active: {
      true: 'bg-surface-container-lowest text-on-surface shadow-sm',
      false: 'text-on-surface-variant hover:text-on-surface',
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
