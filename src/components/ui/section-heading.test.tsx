// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '#/test/dom-matchers'
import { SectionHeading } from './section-heading'

afterEach(cleanup)

describe('SectionHeading', () => {
  it('renders an h2 by default', () => {
    render(<SectionHeading eyebrow="Kicker" title="Section title" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Section title' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('renders the page title as an h1 with the same look', () => {
    const { rerender } = render(<SectionHeading eyebrow="Kicker" title="Title" />)
    const h2Class = screen.getByRole('heading', { name: 'Title' }).className

    rerender(<SectionHeading level={1} eyebrow="Kicker" title="Title" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Title' })
    expect(h1.tagName).toBe('H1')
    expect(h1.className).toBe(h2Class)
  })

  it('puts the id on the heading so a section can be labelled by it', () => {
    render(<SectionHeading level={1} eyebrow="Kicker" title="Named" id="named" />)
    expect(screen.getByRole('heading', { name: 'Named' })).toHaveAttribute('id', 'named')
  })
})
