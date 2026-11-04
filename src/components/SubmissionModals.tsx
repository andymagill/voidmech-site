import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Turnstile, useTurnstile } from './Turnstile'
import { useFocusTrap, useScrollLock } from './dialog-behavior'
import { closeHash } from '#/lib/modal-hash'

/** Must match `HONEYPOT_FIELD` in `#/lib/api/guards` (not imported to keep server code out of the client bundle). */
const HONEYPOT_FIELD = 'website'
/** Must match `TURNSTILE_FIELD` in `#/lib/api/guards`. */
const TURNSTILE_FIELD = 'cf-turnstile-response'
/** How long a submit waits for the Turnstile token before giving up (an interactive challenge can take a while). */
const VERIFY_TIMEOUT_MS = 45_000

type ModalKey = 'newsletter' | 'feedback' | 'bug-report'

/**
 * Modals are driven by the URL hash (`#feedback`, ...) so any page can open one
 * with a plain `<a href="#feedback">` and they work without route changes.
 */
function useModalState(id: ModalKey) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === `#${id}`)

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [id])

  return { open, close: closeHash }
}

/** POSTs a form to a submission endpoint; throws an Error with a user-facing message. */
async function postJson(path: string, payload: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }

  let data: { error?: string } = {}
  try {
    data = (await response.json()) as { error?: string }
  } catch {
    // Non-JSON error body (e.g. a gateway page); fall through to the generic message.
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'Submission failed')
  }
}

function ModalShell({
  id,
  title,
  description,
  children,
}: {
  id: ModalKey
  title: string
  description: string
  children: ReactNode
}) {
  const { open, close } = useModalState(id)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = `${id}-modal-title`

  useScrollLock(open)
  useFocusTrap(panelRef, open, close)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(7,16,24,0.82)] p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="vm-panel relative z-10 max-h-full w-full max-w-xl overflow-y-auto p-5 outline-none md:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--vm-cyan)]">
              Transmission
            </p>
            <h3
              id={titleId}
              className="mt-2 font-mono text-2xl tracking-[0.04em] text-[var(--vm-white)]"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={close}
            className="border border-[var(--vm-slate)] bg-[var(--vm-space)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--vm-white)] hover:text-[var(--vm-cyan)]"
          >
            Close
          </button>
        </div>
        <p className="mb-5 text-sm leading-7 text-[rgba(225,230,232,0.75)]">
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}

type Busy = 'verifying' | 'sending' | null

/** Submit button label for the current phase. */
function submitLabel(idle: string, busy: Busy) {
  if (busy === 'verifying') return 'Verifying…'
  if (busy === 'sending') return 'Sending…'
  return idle
}

/** Replaces the form after a successful submit; takes focus so keyboard and screen reader users land on it. */
function Confirmation({ title, message }: { title: string; message: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="space-y-4">
      <h4
        ref={headingRef}
        tabIndex={-1}
        className="m-0 font-mono text-lg tracking-[0.04em] text-[var(--vm-cyan)] outline-none"
      >
        {title}
      </h4>
      <p className="m-0 text-sm leading-7 text-[rgba(225,230,232,0.75)]">{message}</p>
      <Button type="button" onClick={closeHash} className="uppercase tracking-[0.2em]">
        Close
      </Button>
    </div>
  )
}

/**
 * A form that posts to a submission endpoint and, on success, swaps itself for
 * a confirmation. The component unmounts with its modal, so state resets each
 * time the modal reopens.
 */
function SubmissionForm({
  endpoint,
  successTitle,
  successMessage,
  children,
  footer,
}: {
  endpoint: string
  successTitle: string
  successMessage: string
  children: ReactNode
  footer: (busy: Busy) => ReactNode
}) {
  const [done, setDone] = useState(false)
  const onSuccess = useCallback(() => setDone(true), [])

  return done ? (
    <Confirmation title={successTitle} message={successMessage} />
  ) : (
    <FormBody endpoint={endpoint} footer={footer} onSuccess={onSuccess}>
      {children}
    </FormBody>
  )
}

/**
 * Posts every named field of the form to `endpoint` as JSON (field `name`s
 * match the API payload keys) plus the Turnstile token.
 *
 * The Turnstile challenge starts on the first focus or input in the form. If
 * the visitor submits before a token exists, the form waits for it and then
 * sends. A token is single-use, so it is discarded after every attempt and a
 * new challenge starts after a failure. Lives in its own component so the
 * widget is removed as soon as the confirmation replaces the form.
 */
function FormBody({
  endpoint,
  children,
  footer,
  onSuccess,
}: {
  endpoint: string
  children: ReactNode
  footer: (busy: Busy) => ReactNode
  onSuccess: () => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const turnstile = useTurnstile()
  const { token: turnstileToken, status: turnstileStatus } = turnstile
  const { reset: resetTurnstile, start: startTurnstile } = turnstile
  const [phase, setPhase] = useState<'editing' | 'verifying' | 'sending'>('editing')
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(
    async (token: string | null) => {
      const form = formRef.current
      if (!form) return

      const payload: Record<string, string> = { source: 'site_modal' }
      for (const [key, value] of new FormData(form)) {
        if (typeof value === 'string') payload[key] = value
      }
      if (token) payload[TURNSTILE_FIELD] = token

      setPhase('sending')
      setError(null)
      try {
        await postJson(endpoint, payload)
        resetTurnstile()
        onSuccess()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Failed to send')
        setPhase('editing')
        // The token is spent either way; get a fresh one ready for the retry.
        resetTurnstile()
        startTurnstile()
      }
    },
    [endpoint, onSuccess, resetTurnstile, startTurnstile],
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
  }

  const busy: Busy = phase === 'editing' ? null : phase

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={onSubmit}
      // `focus` bubbles in React, so this fires for any field; `start` is a no-op once running.
      onFocus={startTurnstile}
      onInput={startTurnstile}
    >
      {children}
      {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped server-side. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile control={turnstile} />
      {busy === 'verifying' && (
        <p role="status" className="m-0 text-xs text-[rgba(225,230,232,0.75)]">
          Running a quick human check…
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-[var(--vm-red)]">
          {error}
        </p>
      )}
      {footer(busy)}
    </form>
  )
}

export function SubmissionModals() {
  return (
    <>
      <ModalShell
        id="newsletter"
        title="Newsletter"
        description="Get launch alerts, patch notes, and alpha access updates for the next VoidMech build."
      >
        <SubmissionForm
          endpoint="/api/submissions/newsletter"
          successTitle="You're on the list"
          successMessage="Launch alerts, patch notes and alpha access updates will go to that address."
          footer={(busy) => (
            <Button type="submit" disabled={busy !== null} className="w-full uppercase tracking-[0.2em]">
              {submitLabel('Join the list', busy)}
            </Button>
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="newsletter-email">Email</Label>
            <Input id="newsletter-email" name="email" type="email" placeholder="pilot@voidmech.com" required />
          </div>
        </SubmissionForm>
      </ModalShell>

      <ModalShell
        id="feedback"
        title="Feedback"
        description="Tell us what feels good, what needs tuning, and what flow drags down your run."
      >
        <SubmissionForm
          endpoint="/api/submissions/feedback"
          successTitle="Feedback received"
          successMessage="Thanks for helping tune VoidMech."
          footer={(busy) => (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a href="#bug-report" className="nav-link">
                Report a bug
              </a>
              <Button type="submit" disabled={busy !== null} className="uppercase tracking-[0.2em]">
                {submitLabel('Send Feedback', busy)}
              </Button>
            </div>
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="feedback-topic">Topic</Label>
            <Input id="feedback-topic" name="topic" placeholder="Controls, pacing, build flow" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea id="feedback-message" name="message" placeholder="What should we improve?" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-email">Email (optional)</Label>
            <Input id="feedback-email" name="email" type="email" placeholder="pilot@voidmech.com" />
          </div>
        </SubmissionForm>
      </ModalShell>

      <ModalShell
        id="bug-report"
        title="Bug report"
        description="Flag crashes, blockers, or mission-breakers with enough detail for the team to reproduce."
      >
        <SubmissionForm
          endpoint="/api/submissions/bug-report"
          successTitle="Report received"
          successMessage="Thanks. The team will use it to reproduce and fix the problem."
          footer={(busy) => (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a href="#feedback" className="nav-link">
                Give Feedback
              </a>
              <Button type="submit" variant="warning" disabled={busy !== null} className="uppercase tracking-[0.2em]">
                {submitLabel('Submit report', busy)}
              </Button>
            </div>
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="bug-summary">Summary</Label>
            <Input id="bug-summary" name="summary" placeholder="Crash during deployment sequence" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bug-details">Details</Label>
            <Textarea id="bug-details" name="details" placeholder="Steps to reproduce, expected vs actual behavior" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bug-platform">Platform</Label>
              <Input id="bug-platform" name="platform" placeholder="Windows 11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-severity">Severity</Label>
              <Input id="bug-severity" name="severity" placeholder="High" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bug-email">Email (optional)</Label>
            <Input id="bug-email" name="email" type="email" placeholder="pilot@voidmech.com" />
          </div>
        </SubmissionForm>
      </ModalShell>
    </>
  )
}
