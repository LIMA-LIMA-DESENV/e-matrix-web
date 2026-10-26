'use client'

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type ModalOverlayProps = ComponentProps<'div'>

export function ModalOverlay({ className, ...props }: ModalOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-scrim/50 backdrop-blur-sm classic:backdrop-blur-none',
        className
      )}
      {...props}
    />
  )
}

type ModalContentProps = ComponentProps<'div'>

export function ModalContent({ className, ...props }: ModalContentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-xl [&>form]:flex [&>form]:min-h-0 [&>form]:flex-col',
          className
        )}
        {...props}
      />
    </div>
  )
}

type ModalHeaderProps = ComponentProps<'div'>

export function ModalHeader({ className, ...props }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between pb-4',
        className
      )}
      {...props}
    />
  )
}

type ModalTitleProps = ComponentProps<'h2'>

export function ModalTitle({ className, ...props }: ModalTitleProps) {
  return (
    <h2
      className={cn(
        'shrink-0 font-headline text-lg font-bold text-on-surface',
        className
      )}
      {...props}
    />
  )
}

type ModalBodyProps = ComponentProps<'div'>

export function ModalBody({ className, ...props }: ModalBodyProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain py-4',
        className
      )}
      {...props}
    />
  )
}

type ModalFooterProps = ComponentProps<'div'>

export function ModalFooter({ className, ...props }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end gap-3 pt-4',
        className
      )}
      {...props}
    />
  )
}
