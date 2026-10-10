import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type LabelProps = ComponentProps<'label'>

export function Label({ className, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable component — htmlFor is provided at usage time
    <label
      className={cn('text-xs font-bold text-on-surface-variant', className)}
      {...props}
    />
  )
}
