import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 font-label text-xs font-semibold',
  variants: {
    shape: {
      pill: 'rounded-full px-3 py-1',
      squared: 'rounded-md px-2.5 py-0.5',
    },
    color: {
      success: 'bg-emerald-100 text-emerald-700',
      neutral: 'bg-slate-100 text-slate-600',
      primary: 'bg-primary-container text-on-primary-container',
      warning: 'bg-amber-100 text-amber-700',
      dark: 'bg-inverse-surface text-inverse-on-surface',
      light: 'bg-surface-container-lowest text-on-surface',
      secondary: 'bg-secondary-fixed text-on-secondary-fixed',
      tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
      outline:
        'border border-outline-variant bg-transparent text-on-surface-variant',
    },
  },
  defaultVariants: {
    shape: 'pill',
    color: 'neutral',
  },
})

type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean
  }

export function Badge({
  className,
  shape,
  color,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={badgeVariants({ shape, color, className })} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export { badgeVariants }
