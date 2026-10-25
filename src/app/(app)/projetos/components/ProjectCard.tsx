import type { ReactNode } from 'react'

import { Card } from '@/components/ui'

interface ProjectCardProps {
  icon: string
  title: string
  description: string
  /** Extra line under the description, such as the count of the slice. */
  meta?: ReactNode
  /** The card's buttons; a card may have none yet. */
  children?: ReactNode
}

/**
 * One of the legacy cards above the table of a tab (J2, J3): a record type or
 * a static form, with its downloads and, for who may edit, "Novo".
 */
export function ProjectCard({
  icon,
  title,
  description,
  meta,
  children,
}: ProjectCardProps) {
  return (
    <Card className="flex flex-col gap-4 border border-outline-variant/30 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span
          className="material-symbols-outlined rounded-lg bg-primary-container p-2 text-2xl text-on-primary-container"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            {title}
          </h2>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            {description}
          </p>
          {meta && <p className="mt-3 text-sm text-outline">{meta}</p>}
        </div>
      </div>

      {children && (
        <div className="mt-auto flex flex-wrap items-center gap-3">
          {children}
        </div>
      )}
    </Card>
  )
}
