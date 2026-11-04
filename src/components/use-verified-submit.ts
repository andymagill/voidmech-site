import { useCallback, useEffect, useRef, useState } from 'react'
import { useTurnstile, type TurnstileControl } from './Turnstile'

/** How long a submit waits for the Turnstile token before giving up (an interactive challenge can take a while). */
const VERIFY_TIMEOUT_MS = 45_000

/** Must match `TURNSTILE_FIELD` in `#/lib/api/guards` (not imported to keep server code out of the client bundle). */
export const TURNSTILE_FIELD = 'cf-turnstile-response'

export type Busy = 'verifying' | 'sending' | null

/** Button label for the current phase. */
export function submitLabel(idle: string, busy: Busy) {
  if (busy === 'verifying') return 'Verifying…'
  if (busy === 'sending') return 'Sending…'
  return idle
}

export type VerifiedSubmit = {
  turnstile: TurnstileControl
  busy: Busy
  error: string | null
  setError: (message: string | null) => void
  /** Starts the Turnstile challenge (first focus or input in the form). No-op once running. */
  start: () => void
  /** Call from the form's submit handler (after `preventDefault`). */
  submit: () => void
}

/**
 * The Turnstile-guarded submit flow shared by every form on the site.
 *
 * The challenge starts on the first focus or input (`start`). If the visitor
 * submits before a token exists, the flow waits for it and then sends. A token
 * is single-use, so it is discarded after every attempt and a new challenge
 * starts after a failure. Gives up with a message when the challenge errors,
 * expires or stalls for 45 s.
 *
 * `perform(token)` does the request and throws an `Error` carrying a
 * user-facing message to report a failure. `onSuccess` runs after it resolves.
 * The hook returns to the editing state on both outcomes, so a form that stays
 * mounted can be used again.
 */
export function useVerifiedSubmit(
  perform: (token: string | null) => Promise<void>,
  onSuccess?: () => void,
): VerifiedSubmit {
  const turnstile = useTurnstile()
  const { token: turnstileToken, status: turnstileStatus } = turnstile
  const { reset: resetTurnstile, start: startTurnstile } = turnstile
  const [phase, setPhase] = useState<'editing' | 'verifying' | 'sending'>('editing')
  const [error, setError] = useState<string | null>(null)

  // Callers pass inline functions; keep the latest without re-running the effects below.
  const performRef = useRef(perform)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    performRef.current = perform
    onSuccessRef.current = onSuccess
  })

  const send = useCallback(
    async (token: string | null) => {
      setPhase('sending')
      setError(null)
      try {
        await performRef.current(token)
        resetTurnstile()
        onSuccessRef.current?.()
        setPhase('editing')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Failed to send')
        setPhase('editing')
        // The token is spent either way; get a fresh one ready for the retry.
        resetTurnstile()
        startTurnstile()
      }
    },
    [resetTurnstile, startTurnstile],
  )

  // Submitted before the challenge finished: send as soon as the token arrives.
  useEffect(() => {
    if (phase !== 'verifying') return
    if (turnstileToken) {
      void send(turnstileToken)
    } else if (turnstileStatus === 'error' || turnstileStatus === 'idle') {
      setPhase('editing')
      setError(
        turnstileStatus === 'error'
          ? 'Verification failed. Disable content blockers for this site or check your connection, then try again.'
          : 'Verification timed out. Please try again.',
      )
      resetTurnstile()
    }
  }, [phase, turnstileToken, turnstileStatus, send, resetTurnstile])

  // Turnstile can stall without ever reporting success or an error (some automated or
  // locked-down browsers); don't leave the visitor waiting on a disabled button forever.
  useEffect(() => {
    if (phase !== 'verifying') return
    const timer = setTimeout(() => {
      setPhase('editing')
      setError('Verification is taking too long. Check your connection or content blockers, then try again.')
      resetTurnstile()
    }, VERIFY_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [phase, resetTurnstile])

  const submit = useCallback(() => {
    if (phase !== 'editing') return

    setError(null)
    if (!turnstile.enabled) {
      void send(null)
    } else if (turnstileToken) {
      void send(turnstileToken)
    } else {
      setPhase('verifying')
      startTurnstile()
    }
  }, [phase, turnstile.enabled, turnstileToken, send, startTurnstile])

  return {
    turnstile,
    busy: phase === 'editing' ? null : phase,
    error,
    setError,
    start: startTurnstile,
    submit,
  }
}
