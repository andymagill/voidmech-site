// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeHash, shouldRestoreScroll } from './modal-hash'

const at = (pathname: string, hash = '') => ({ location: { pathname, hash } })

describe('modal hash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({ __TSR_key: 'k' }, '', '/download#feedback')
  })
  afterEach(() => vi.useRealTimers())

  it('clears the hash, keeps history.state, and notifies modals', () => {
    const onHashChange = vi.fn()
    window.addEventListener('hashchange', onHashChange)

    closeHash()

    expect(window.location.pathname + window.location.hash).toBe('/download')
    expect(window.history.state).toEqual({ __TSR_key: 'k' })
    expect(onHashChange).toHaveBeenCalledTimes(1)
    window.removeEventListener('hashchange', onHashChange)
  })

  it('skips router scroll handling only for the update a close causes', () => {
    closeHash()

    expect(shouldRestoreScroll(at('/download'))).toBe(false)
    // A different page, or a navigation that carries a hash, scrolls as usual.
    expect(shouldRestoreScroll(at('/roadmap'))).toBe(true)
    expect(shouldRestoreScroll(at('/download', '#feedback'))).toBe(true)

    vi.advanceTimersByTime(2000)
    expect(shouldRestoreScroll(at('/download'))).toBe(true)
  })
})
