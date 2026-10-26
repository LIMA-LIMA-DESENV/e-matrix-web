import type { ReactNode } from 'react'

interface ShellContentProps {
  /** Classes of the `<main>` and of its inner wrapper, set by the shell. */
  classNames: { main: string; inner: string }
  /** Rendered after the page, inside the `<main>` (the classic footer). */
  footer?: ReactNode
  children: ReactNode
}

/**
 * Content area of the authenticated pages. `(app)/layout.tsx` renders it as a
 * sibling of the shell, never inside it, so swapping the shell keeps the page
 * mounted (only the classes and the footer change).
 */
export function ShellContent({
  classNames,
  footer,
  children,
}: ShellContentProps) {
  return (
    <main className={classNames.main}>
      <div className={classNames.inner}>{children}</div>
      {footer}
    </main>
  )
}
