import { useTranslations } from 'next-intl'
import type { MouseEvent } from 'react'
import { tv } from 'tailwind-variants'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'

const rowActionsMenu = tv({
  slots: {
    wrapper: 'flex items-center justify-end',
    trigger:
      'inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container-high group-hover:text-primary',
    icon: 'material-symbols-outlined',
    separator: 'my-1 border-0 border-t border-outline-variant/40',
    item: 'gap-2',
    itemIcon: 'material-symbols-outlined text-lg',
  },
  variants: {
    exit: {
      true: { item: 'text-error hover:bg-error/5' },
    },
  },
})

export interface RowAction {
  label: string
  onSelect: () => void
  /** Material Symbols icon name. */
  icon?: string
}

export interface RowActionsMenuProps {
  /** "Editar". Pass only actions allowed for the profile and the record. */
  edit?: RowAction[]
  /** Business actions of the entity, e.g. "Registrar Economia". */
  business?: RowAction[]
  /** Exit actions ("Inativar", "Remover"...), shown last in error color. */
  exit?: RowAction[]
}

function stopPropagation(event: MouseEvent) {
  // React events cross the menu portal up to the TableRow; never let a menu
  // click trigger the row click.
  event.stopPropagation()
}

/**
 * ⋮ menu of a list row. Renders nothing when no action applies.
 */
export function RowActionsMenu({
  edit = [],
  business = [],
  exit = [],
}: RowActionsMenuProps) {
  const t = useTranslations('common')
  const styles = rowActionsMenu()
  const primaryItems = [...edit, ...business]

  if (primaryItems.length === 0 && exit.length === 0) return null

  function renderItem(action: RowAction, isExit: boolean) {
    const itemStyles = rowActionsMenu({ exit: isExit })

    return (
      <DropdownMenuItem
        key={action.label}
        className={itemStyles.item()}
        onClick={stopPropagation}
        onSelect={action.onSelect}
      >
        {action.icon && (
          <span className={itemStyles.itemIcon()} aria-hidden>
            {action.icon}
          </span>
        )}
        {action.label}
      </DropdownMenuItem>
    )
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: only stops propagation to the row
    // biome-ignore lint/a11y/noStaticElementInteractions: only stops propagation to the row
    <div className={styles.wrapper()} onClick={stopPropagation}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('actions')}
          className={styles.trigger()}
        >
          <span className={styles.icon()} aria-hidden>
            more_vert
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {primaryItems.map((action) => renderItem(action, false))}
          {primaryItems.length > 0 && exit.length > 0 && (
            <hr className={styles.separator()} />
          )}
          {exit.map((action) => renderItem(action, true))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
