import { act } from '@testing-library/react'
import { vi } from 'vitest'

type FakeWidget = { id: string; options: Record<string, unknown>; executed: number; resets: number; removed: boolean }

/** Component tests only (needs jsdom). Stands in for Cloudflare's script: records calls and lets a test deliver tokens. */
export function installTurnstile() {
  const widgets: FakeWidget[] = []
  const api = {
    render: vi.fn((_container: HTMLElement, options: Record<string, unknown>) => {
      const id = `widget-${widgets.length + 1}`
      widgets.push({ id, options, executed: 0, resets: 0, removed: false })
      return id
    }),
    execute: vi.fn((id: string) => {
      widgets.find((w) => w.id === id)!.executed++
    }),
    reset: vi.fn((id: string) => {
      widgets.find((w) => w.id === id)!.resets++
    }),
    remove: vi.fn((id: string) => {
      widgets.find((w) => w.id === id)!.removed = true
    }),
  }
  window.turnstile = api
  const current = () => widgets[widgets.length - 1]
  return {
    api,
    widgets,
    current,
    solve: (token: string) => act(() => (current().options.callback as (t: string) => void)(token)),
    expire: () => act(() => (current().options['expired-callback'] as () => void)()),
    fail: () => act(() => (current().options['error-callback'] as () => void)()),
  }
}
