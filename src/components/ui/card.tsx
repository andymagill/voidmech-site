import * as React from 'react'
import { cn } from '#/lib/utils'

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'vm-panel relative border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.92)] p-5',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mb-4 border-b border-[var(--vm-slate)] pb-3 font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--vm-cyan)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'm-0 font-mono text-lg uppercase tracking-[0.1em] text-[var(--vm-white)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4', className)} {...props} />
}
