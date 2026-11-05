// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Button, buttonVariants } from './button'

afterEach(cleanup)

const TYPE = ['font-mono', 'uppercase', 'tracking-[0.2em]']

describe('Button', () => {
  it('defaults to the primary design at the default size', () => {
    render(<Button>Go</Button>)
    const { className } = screen.getByRole('button', { name: 'Go' })
    expect(className).toContain('text-[var(--vm-cyan)]')
    expect(className).toContain('h-10')
  })

  it('has a secondary design', () => {
    render(<Button variant="secondary">Go</Button>)
    const { className } = screen.getByRole('button', { name: 'Go' })
    expect(className).toContain('text-[var(--vm-white)]')
    expect(className).not.toContain('text-[var(--vm-cyan)]')
  })

  it.each([
    ['primary', 'default'],
    ['secondary', 'sm'],
    ['secondary', 'icon'],
  ] as const)('carries the shared type treatment itself (%s, %s)', (variant, size) => {
    render(
      <Button variant={variant} size={size}>
        Go
      </Button>,
    )
    const { className } = screen.getByRole('button', { name: 'Go' })
    for (const token of TYPE) expect(className.split(' ')).toContain(token)
  })

  it('offers only primary and secondary (a third design is a type error)', () => {
    // @ts-expect-error `warning` was removed; every button is primary or secondary
    expect(buttonVariants({ variant: 'warning' })).toBeTypeOf('string')
  })

  it('styles a link the same as a button, without nesting a button in it', () => {
    render(
      <a href="/x" className={buttonVariants({ variant: 'secondary' })}>
        Link
      </a>,
    )
    const link = screen.getByRole('link', { name: 'Link' })
    render(<Button variant="secondary">Btn</Button>)
    expect(link.className).toBe(screen.getByRole('button', { name: 'Btn' }).className)
    expect(link.querySelector('button')).toBeNull()
  })
})
