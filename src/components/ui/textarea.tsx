import * as React from 'react'
import { cn } from '#/lib/utils'

export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full border border-[var(--vm-slate)] bg-[var(--vm-space)] px-3 py-2 font-mono text-sm text-[var(--vm-white)] placeholder:text-[rgba(225,230,232,0.55)] outline-none transition focus:border-[var(--vm-cyan)]',
        className,
      )}
      {...props}
    />
  )
}
