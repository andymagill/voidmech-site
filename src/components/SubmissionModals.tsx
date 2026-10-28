import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

type ModalKey = 'newsletter' | 'feedback' | 'bug-report'

/** Clears the URL hash (which closes every modal) without adding a history entry. */
function closeHash() {
  const nextUrl = new URL(window.location.href)
  nextUrl.hash = ''
  window.history.replaceState({}, '', nextUrl)
  // `replaceState` does not fire `hashchange`, so notify the modals ourselves.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

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

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

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

/**
 * Posts every named field of the form to `endpoint` as JSON (field `name`s
 * match the API payload keys), then closes the modal. The form unmounts with
 * its modal, so the error state resets each time the modal reopens.
 */
function SubmissionForm({
  endpoint,
  children,
  footer,
}: {
  endpoint: string
  children: ReactNode
  footer: (submitting: boolean) => ReactNode
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const form = event.currentTarget
    const payload: Record<string, string> = { source: 'site_modal' }
    for (const [key, value] of new FormData(form)) {
      if (typeof value === 'string') payload[key] = value
    }

    setSubmitting(true)
    setError(null)
    try {
      await postJson(endpoint, payload)
      form.reset()
      closeHash()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to send')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {children}
      {error && (
        <p role="alert" className="m-0 text-sm text-[var(--vm-red)]">
          {error}
        </p>
      )}
      {footer(submitting)}
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
          footer={(submitting) => (
            <Button type="submit" disabled={submitting} className="w-full uppercase tracking-[0.2em]">
              Join the list
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
          footer={(submitting) => (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a href="#bug-report" className="nav-link">
                Report a bug
              </a>
              <Button type="submit" disabled={submitting} className="uppercase tracking-[0.2em]">
                Send Feedback
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
          footer={(submitting) => (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a href="#feedback" className="nav-link">
                Give Feedback
              </a>
              <Button type="submit" variant="warning" disabled={submitting} className="uppercase tracking-[0.2em]">
                Submit report
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
