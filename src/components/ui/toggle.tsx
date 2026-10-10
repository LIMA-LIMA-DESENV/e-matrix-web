import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type ToggleProps = Omit<ComponentProps<'input'>, 'type'> & {
  label?: string
}

export function Toggle({ className, label, id, ...props }: ToggleProps) {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2, 9)}`

  return (
    <label
      htmlFor={toggleId}
      className={cn('inline-flex cursor-pointer items-center gap-2', className)}
    >
      <input
        id={toggleId}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span className="relative h-6 w-10 rounded-full bg-outline-variant transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50" />
      {label && (
        <span className="text-sm text-on-surface-variant">{label}</span>
      )}
    </label>
  )
}
