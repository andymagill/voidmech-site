import * as React from 'react'
import { cn } from '#/lib/utils'

/** Native `<select>` styled like `Input`; keeps the platform picker, keyboard behaviour and a11y for free. */
export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full border border-[var(--vm-slate)] bg-[var(--vm-space)] px-3 py-2 font-mono text-sm text-[var(--vm-white)] outline-none transition focus:border-[var(--vm-cyan)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
