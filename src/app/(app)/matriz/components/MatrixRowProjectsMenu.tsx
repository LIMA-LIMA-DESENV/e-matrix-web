import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type KeyboardEvent, useEffect, useId, useRef } from 'react'

import { rowActionsMenu } from '@/components/list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'

import type { MatrixProjectLink } from './use-matrix-projects'

export interface MatrixMenuPoint {
  x: number
  y: number
}

interface MatrixRowProjectsMenuProps {
  activityCode: string
  /** The RGP and RGA of the activity, already in order. */
  projects: readonly MatrixProjectLink[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  open: boolean
  /** Where the row was right-clicked; null opens below the ⋮ button. */
  anchorPoint: MatrixMenuPoint | null
  onOpenChange: (open: boolean) => void
}

const FOCUSABLE = '[role="menuitem"]:not(:disabled)'

/**
 * The ⋮ menu of a Matrix row, also opened by a right click on the row (J7,
 * FR-026): the RGP and RGA of the activity by code, each opening its tab of
 * Projetos with the code searched. Every role uses it. The focus moves into
 * the menu when it opens; the arrows move between the items, and Esc or Tab
 * closes it back on the ⋮ button.
 */
export function MatrixRowProjectsMenu({
  activityCode,
  projects,
  isLoading,
  isError,
  onRetry,
  open,
  anchorPoint,
  onOpenChange,
}: MatrixRowProjectsMenuProps) {
  const t = useTranslations('matrix.projectsMenu')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const styles = rowActionsMenu()
  const contentId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const label = t('label', { code: activityCode })

  // The content is positioned, and so made visible, after it mounts.
  useEffect(() => {
    if (!open) return

    const frame = requestAnimationFrame(() => {
      const content = document.getElementById(contentId)
      const first = content?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? content)?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [open, contentId])

  function focusTrigger() {
    wrapperRef.current?.querySelector('button')?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      // The menu itself closes on Esc; only the focus is given back here.
      focusTrigger()
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      onOpenChange(false)
      focusTrigger()
      return
    }

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)
    )
    if (items.length === 0) return

    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key]

    if (next === undefined) return

    event.preventDefault()
    items[next]?.focus()
  }

  function renderItems() {
    if (isLoading) {
      return (
        <p
          role="status"
          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant"
        >
          <span
            className="material-symbols-outlined animate-spin text-lg"
            aria-hidden
          >
            progress_activity
          </span>
          {t('loading')}
        </p>
      )
    }

    if (isError) {
      return (
        <>
          <p role="alert" className="px-4 py-2 text-sm text-error">
            {t('error')}
          </p>
          {/* Not a DropdownMenuItem: retrying keeps the menu open. */}
          <button
            type="button"
            role="menuitem"
            onClick={onRetry}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low"
          >
            <span className={styles.itemIcon()} aria-hidden>
              refresh
            </span>
            {tCommon('retry')}
          </button>
        </>
      )
    }

    if (projects.length === 0) {
      return (
        <p className="px-4 py-2 text-sm text-on-surface-variant">
          {t('empty')}
        </p>
      )
    }

    return projects.map((project) => (
      <DropdownMenuItem
        key={project.id}
        className={styles.item()}
        onSelect={() => router.push(project.href)}
      >
        <span className={styles.itemIcon()} aria-hidden>
          open_in_new
        </span>
        {project.code}
      </DropdownMenuItem>
    ))
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper()}>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger aria-label={label} className={styles.trigger()}>
          <span className={styles.icon()} aria-hidden>
            more_vert
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          id={contentId}
          aria-label={label}
          tabIndex={-1}
          anchorPoint={anchorPoint}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-outline">
            {t('title')}
          </p>
          {renderItems()}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
