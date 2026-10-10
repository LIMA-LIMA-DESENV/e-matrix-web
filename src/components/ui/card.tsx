import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type CardProps = ComponentProps<'div'>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl bg-surface-container-lowest p-8', className)}
      {...props}
    />
  )
}
