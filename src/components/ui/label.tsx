import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '#/lib/utils'

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(225,230,232,0.78)]',
        className,
      )}
      {...props}
    />
  )
}
