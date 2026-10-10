import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 rounded-lg font-label font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
  variants: {
    variant: {
      solid: '',
      outline: 'border bg-transparent',
      ghost: 'bg-transparent',
    },
    color: {
      primary: '',
      secondary: '',
      error: '',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-7 text-base',
    },
  },
  compoundVariants: [
    // solid
    {
      variant: 'solid',
      color: 'primary',
      className: 'bg-primary text-on-primary hover:bg-primary/90',
    },
    {
      variant: 'solid',
      color: 'secondary',
      className: 'bg-secondary text-on-secondary hover:bg-secondary/90',
    },
    {
      variant: 'solid',
      color: 'error',
      className: 'bg-error text-on-error hover:bg-error/90',
    },
    // outline
    {
      variant: 'outline',
      color: 'primary',
      className:
        'border-primary text-primary hover:bg-primary hover:text-on-primary',
    },
    {
      variant: 'outline',
      color: 'secondary',
      className:
        'border-secondary text-secondary hover:bg-secondary hover:text-on-secondary',
    },
    {
      variant: 'outline',
      color: 'error',
      className: 'border-error text-error hover:bg-error hover:text-on-error',
    },
    // ghost
    {
      variant: 'ghost',
      color: 'primary',
      className: 'text-primary hover:bg-primary/10',
    },
    {
      variant: 'ghost',
      color: 'secondary',
      className: 'text-secondary hover:bg-secondary/10',
    },
    {
      variant: 'ghost',
      color: 'error',
      className: 'text-error hover:bg-error/10',
    },
  ],
  defaultVariants: {
    variant: 'solid',
    color: 'primary',
    size: 'md',
  },
})

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

export function Button({
  className,
  variant,
  color,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, color, size, className })}
      {...props}
    />
  )
}

export { buttonVariants }
