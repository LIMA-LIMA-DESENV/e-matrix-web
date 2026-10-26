import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

const inputVariants = tv({
  // Classic: the underlined Paper field (also the selects and textareas that
  // reuse these classes); the 2px primary underline is the focus indicator.
  base: [
    'w-full rounded-lg border border-outline-variant bg-surface-container-high px-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary',
    'classic:rounded-none classic:border-0 classic:bg-transparent classic:shadow-[inset_0_-1px_0_#ddd] classic:focus:shadow-[inset_0_-2px_0_var(--color-primary)] classic:focus:ring-0',
  ],
  variants: {
    size: {
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
      lg: 'h-12 text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

type InputProps = Omit<ComponentProps<'input'>, 'size'> &
  VariantProps<typeof inputVariants>

export function Input({ className, size, ...props }: InputProps) {
  return <input className={inputVariants({ size, className })} {...props} />
}

export { inputVariants }
