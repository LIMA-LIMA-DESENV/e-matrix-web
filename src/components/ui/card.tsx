import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type CardProps = ComponentProps<'div'>

// Classic: the Paper panel shadow, important over the classic override of
// the shadow-* that pages pass.
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface-container-lowest p-8 classic:shadow-[0_1px_4px_rgba(0,0,0,.3)]! classic:shadow-black/30!',
        className
      )}
      {...props}
    />
  )
}
