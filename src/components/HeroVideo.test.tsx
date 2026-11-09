// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import HeroVideo from './HeroVideo'

const media = {
  poster: { src: '/poster.jpg', alt: 'Poster alt', caption: 'Poster caption' },
  clips: [
    { src: '/clip-a.mp4', caption: 'Clip A' },
    { src: '/clip-b.mp4', caption: 'Clip B' },
    { src: '/clip-c.mp4', caption: 'Clip C' },
  ],
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
  }))
}

describe('HeroVideo', () => {
  let play: ReturnType<typeof vi.fn<() => Promise<void>>>

  beforeEach(() => {
    play = vi.fn<() => Promise<void>>(() => Promise.resolve())
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows only the poster when reduced motion is preferred', () => {
    stubReducedMotion(true)
    const { container } = render(<HeroVideo media={media} />)

    expect(screen.getByRole('img', { name: 'Poster alt' })).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()
    expect(play).not.toHaveBeenCalled()
    expect(screen.getByText('Poster caption')).toBeTruthy()
  })

  it('plays a random clip muted, looped and without controls', () => {
    stubReducedMotion(false)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // index 1 of 3
    const { container } = render(<HeroVideo media={media} />)

    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video!.getAttribute('src')).toBe('/clip-b.mp4')
    expect(video!.muted).toBe(true)
    expect(video!.loop).toBe(true)
    expect(video!.hasAttribute('playsinline')).toBe(true)
    expect(video!.hasAttribute('controls')).toBe(false)
    expect(play).toHaveBeenCalledTimes(1)

    // Hidden until the first frame plays, then the caption follows the clip.
    expect(video!.style.opacity).toBe('0')
    expect(screen.getByText('Poster caption')).toBeTruthy()
    act(() => {
      fireEvent.playing(video!)
    })
    expect(video!.style.opacity).toBe('1')
    expect(screen.getByText('Clip B')).toBeTruthy()
  })

  it('keeps the poster when autoplay is blocked', async () => {
    stubReducedMotion(false)
    play.mockImplementation(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')))
    const { container } = render(<HeroVideo media={media} />)
    await act(async () => {})

    expect(container.querySelector('video')!.style.opacity).toBe('0')
    expect(screen.getByRole('img', { name: 'Poster alt' })).toBeTruthy()
  })
})
