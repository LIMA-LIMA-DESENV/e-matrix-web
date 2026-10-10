'use client'

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { tv } from 'tailwind-variants'

const dropdownMenu = tv({
  slots: {
    root: 'relative inline-block',
    content:
      'fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg',
    item: 'flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-50',
  },
})

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) {
    throw new Error(
      'DropdownMenu subcomponents must be used within <DropdownMenu>'
    )
  }
  return ctx
}

interface DropdownMenuProps {
  children: ReactNode
  className?: string
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const styles = dropdownMenu()

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider
      value={{ open, setOpen, triggerRef, contentRef }}
    >
      <div className={styles.root({ className })}>{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function DropdownMenuTrigger({
  children,
  className,
  'aria-label': ariaLabel,
}: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={() => setOpen(!open)}
      className={className}
    >
      {children}
    </button>
  )
}

type DropdownMenuContentProps = ComponentProps<'div'> & {
  align?: 'start' | 'end'
  sideOffset?: number
}

export function DropdownMenuContent({
  className,
  children,
  align = 'end',
  sideOffset = 4,
  style,
  ...props
}: DropdownMenuContentProps) {
  const { open, contentRef, triggerRef } = useDropdownMenuContext()
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const styles = dropdownMenu()

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const contentWidth = contentRef.current?.offsetWidth ?? 180

      const top = rect.bottom + sideOffset
      const left = align === 'end' ? rect.right - contentWidth : rect.left

      setPosition({ top, left })
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, align, sideOffset, triggerRef, contentRef])

  if (!open || !mounted) return null

  const content = (
    <div
      ref={contentRef}
      role="menu"
      className={styles.content({ className })}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? 'visible' : 'hidden',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )

  return createPortal(content, document.body)
}

interface DropdownMenuItemProps extends ComponentProps<'button'> {
  onSelect?: () => void
}

export function DropdownMenuItem({
  className,
  children,
  onClick,
  onSelect,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext()
  const styles = dropdownMenu()

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      onSelect?.()
      setOpen(false)
    },
    [onClick, onSelect, setOpen]
  )

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className={styles.item({ className })}
      {...props}
    >
      {children}
    </button>
  )
}
