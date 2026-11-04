// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ScreenshotFigure from './ScreenshotFigure'

const image = { src: '/shot.png', alt: 'Shot alt', caption: 'Shot caption' }

describe('ScreenshotFigure lightbox', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(cleanup)

  function openLightbox() {
    render(<ScreenshotFigure image={image} />)
    const thumbnail = screen.getByRole('button', { name: /Expand screenshot/ })
    thumbnail.focus()
    fireEvent.click(thumbnail)
    return thumbnail
  }

  it('opens with the close button focused and the page locked', () => {
    openLightbox()

    expect(screen.getByRole('dialog', { name: 'Shot caption' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close screenshot' }))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('closes on Escape and on Close, returning focus and unlocking scroll', () => {
    const thumbnail = openLightbox()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(thumbnail)
    expect(document.body.style.overflow).toBe('')

    fireEvent.click(thumbnail)
    fireEvent.click(screen.getByRole('button', { name: 'Close screenshot' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(thumbnail)
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps Tab on the close button, its only control', () => {
    openLightbox()
    const close = screen.getByRole('button', { name: 'Close screenshot' })
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
  })
})
