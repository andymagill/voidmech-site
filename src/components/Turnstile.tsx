import { useEffect, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile widget, rendered explicitly so it works inside modals
 * that mount after page load. Inside a `<form>` it adds a hidden
 * `cf-turnstile-response` input, so `FormData` picks the token up with the
 * other fields and the server's `turnstile` guard verifies it.
 *
 * Tokens are single-use: bump `resetKey` after every failed submission to get
 * a fresh one.
 */

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
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
const SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY

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

export function Turnstile({ resetKey = 0 }: { resetKey?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!SITE_KEY) {
      console.warn('VITE_TURNSTILE_SITE_KEY is not set; submissions will be rejected.')
      return
    }

    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          size: 'flexible',
          callback: () => setFailed(false),
          'error-callback': () => setFailed(true),
        })
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey && widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current)
  }, [resetKey])

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p className="m-0 mt-2 text-xs text-[var(--vm-orange)]">
          The verification check could not load. Disable content blockers for this site or try
          again.
        </p>
      )}
    </div>
  )
}
