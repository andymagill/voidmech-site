import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--vm-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vm-space)]',
  {
    variants: {
      variant: {
        default:
          'border-[var(--vm-cyan)] bg-[rgba(34,224,240,0.12)] text-[var(--vm-cyan)] hover:bg-[rgba(34,224,240,0.18)]',
        secondary:
          'border-[var(--vm-slate)] bg-[var(--vm-space)] text-[var(--vm-white)] hover:border-[var(--vm-cyan)]',
        warning:
          'border-[var(--vm-orange)] bg-[rgba(245,138,31,0.12)] text-[var(--vm-orange)] hover:bg-[rgba(245,138,31,0.18)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
