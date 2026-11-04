// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SubmissionModals } from './SubmissionModals'
import ScreenshotFigure from './ScreenshotFigure'

const image = { src: '/shot.png', alt: 'Shot alt', caption: 'Shot caption' }

function setHash(hash: string) {
  window.history.replaceState(window.history.state, '', `/${hash}`)
  act(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

describe('page scroll lock with overlapping overlays', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
    window.history.replaceState({}, '', '/')
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('unlocks when a modal and the lightbox close in the order they were opened', () => {
    render(
      <>
        <ScreenshotFigure image={image} />
        <SubmissionModals />
      </>,
    )

    setHash('#feedback')
    expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Expand screenshot/ }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    expect(document.body.style.overflow).toBe('hidden')

    // Modal closes first (e.g. browser Back), then the lightbox.
    setHash('')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Close screenshot' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })
})
