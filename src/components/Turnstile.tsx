import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Cloudflare Turnstile, rendered explicitly (no npm dependency) so it works
 * inside modals that mount after page load.
 *
 * The challenge does not run when the widget renders. `useTurnstile` renders it
 * with `execution: 'execute'` and `appearance: 'interaction-only'`: nothing is
 * visible, and nothing runs, until the form calls `start()` (on first focus or
 * input, or on submit as a fallback). The widget only becomes visible if
 * Cloudflare decides the visitor must interact.
 *
 * Tokens are single-use and expire after 300 s, so the hook exposes the token
 * as state and the form calls `reset()` after every attempt that used it.
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
 */

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  execute: (widgetId: string) => void
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Public site key, baked in at build time from `.env.development` / `.env.production`. */
function getSiteKey(): string | undefined {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY
}

let loader: Promise<TurnstileApi> | null = null

/** Loads the Turnstile script once per page; retries on the next call if it failed. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)

  loader ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing'))
    script.onerror = () => {
      script.remove()
      loader = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })

  return loader
}

/**
 * - `idle`: no token and no challenge running (not started, expired, or reset)
 * - `verifying`: the challenge is running (or waiting for the visitor)
 * - `ready`: `token` holds a fresh token
 * - `error`: the script or the challenge failed; `reset()` then `start()` to retry
 */
export type TurnstileStatus = 'idle' | 'verifying' | 'ready' | 'error'

export type TurnstileControl = {
  containerRef: RefObject<HTMLDivElement | null>
  /** False when no site key is configured; the form then submits without a token and the server rejects it. */
  enabled: boolean
  status: TurnstileStatus
  token: string | null
  /** Runs the challenge. No-op unless the status is `idle`. */
  start: () => void
  /** Discards the current token/challenge and returns to `idle`. Call after every attempt that used a token. */
  reset: () => void
}

export function useTurnstile(): TurnstileControl {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<{ api: TurnstileApi; id: string } | null>(null)
  const statusRef = useRef<TurnstileStatus>('idle')
  /** `start()` was called before the widget finished rendering. */
  const startQueuedRef = useRef(false)
  const [state, setState] = useState<{ status: TurnstileStatus; token: string | null }>({
    status: 'idle',
    token: null,
  })

  const update = useCallback((status: TurnstileStatus, token: string | null = null) => {
    statusRef.current = status
    setState({ status, token })
  }, [])

  useEffect(() => {
    const siteKey = getSiteKey()
    if (!siteKey) {
      console.warn('VITE_TURNSTILE_SITE_KEY is not set; submissions will be rejected.')
      return
    }

    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        const id = api.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'flexible',
          appearance: 'interaction-only',
          execution: 'execute',
          // Expiry is handled below: a token that expired while the form sat open
          // is replaced on demand, not by re-running a challenge nobody asked for.
          'refresh-expired': 'never',
          callback: (token: string) => update('ready', token),
          'expired-callback': () => update('idle'),
          'timeout-callback': () => update('idle'),
          'error-callback': () => update('error'),
          'unsupported-callback': () => update('error'),
        })
        widgetRef.current = { api, id }
        if (startQueuedRef.current) {
          startQueuedRef.current = false
          api.execute(id)
        }
      })
      .catch(() => {
        if (!cancelled) update('error')
      })

    return () => {
      cancelled = true
      startQueuedRef.current = false
      if (widgetRef.current) {
        widgetRef.current.api.remove(widgetRef.current.id)
        widgetRef.current = null
      }
    }
  }, [update])

  const start = useCallback(() => {
    if (!getSiteKey() || statusRef.current !== 'idle') return
    update('verifying')
    const widget = widgetRef.current
    if (widget) widget.api.execute(widget.id)
    else startQueuedRef.current = true // runs once the script has loaded and the widget is rendered
  }, [update])

  const reset = useCallback(() => {
    startQueuedRef.current = false
    const widget = widgetRef.current
    if (widget) widget.api.reset(widget.id)
    // A script that failed to load stays failed until the form is reopened.
    update(statusRef.current === 'error' && !widget ? 'error' : 'idle')
  }, [update])

  return {
    containerRef,
    enabled: Boolean(getSiteKey()),
    status: state.status,
    token: state.token,
    start,
    reset,
  }
}

/** Mount point for the widget; shows a message if the check could not load or run. */
export function Turnstile({ control }: { control: TurnstileControl }) {
  return (
    <div>
      <div ref={control.containerRef} />
      {control.status === 'error' && (
        <p className="m-0 mt-2 text-xs text-[var(--vm-orange)]">
          The verification check could not load. Disable content blockers for this site or try
          again.
        </p>
      )}
    </div>
  )
}
