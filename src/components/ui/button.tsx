import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#/lib/utils'

/**
 * The only button look on the site. Two designs: `primary` (the main action in
 * a group) and `secondary` (everything else). Type (mono, uppercase, tracked)
 * is part of the base, so call sites pass no typography. Sizes: `default` (h-10),
 * `sm` (h-8, dismiss/retry controls) and `icon` (square, for icon-only buttons).
 *
 * To make a link look like a button, put `buttonVariants(...)` on the `<a>` or
 * router `<Link>` rather than nesting a `<Button>` inside it.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border font-mono text-sm font-medium uppercase tracking-[0.2em] no-underline transition disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--vm-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vm-space)]',
  {
    variants: {
      variant: {
        primary:
          'border-[var(--vm-cyan)] bg-[rgba(34,224,240,0.12)] text-[var(--vm-cyan)] hover:bg-[rgba(34,224,240,0.18)]',
        secondary:
          'border-[var(--vm-slate)] bg-[var(--vm-space)] text-[var(--vm-white)] hover:border-[var(--vm-cyan)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
