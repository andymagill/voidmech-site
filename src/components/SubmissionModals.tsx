import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

type ModalKey = 'newsletter' | 'feedback' | 'bug-report'

function closeHash() {
  if (typeof window === 'undefined') return

  const nextUrl = new URL(window.location.href)
  nextUrl.hash = ''
  window.history.replaceState({}, '', nextUrl)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function useModalState(id: ModalKey) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const sync = () => {
      setOpen(window.location.hash === `#${id}`)
    }

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [id])

  const close = () => {
    setOpen(false)
    closeHash()
  }

  return { open, close }
}

async function postJson(path: string, payload: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })

  let data: { error?: string } = {}
  try {
    data = (await response.json()) as { error?: string }
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'Submission failed')
  }

  return data
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

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(7,16,24,0.82)] p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={close}
        aria-hidden="true"
      />
      <div className="vm-panel relative z-10 w-full max-w-xl p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--vm-cyan)]">
              Transmission
            </p>
            <h3 className="mt-2 font-mono text-2xl tracking-[0.04em] text-[var(--vm-white)]">
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

export function SubmissionModals() {
  return (
    <>
      <ModalShell
        id="newsletter"
        title="Newsletter"
        description="Get launch alerts, patch notes, and alpha access updates for the next VoidMech build."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)
            const email = String(formData.get('email') ?? '')

            try {
              await postJson('/api/submissions/newsletter', {
                email,
                source: 'site_modal',
              })
              form.reset()
              closeHash()
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to send'
              window.alert(message)
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="newsletter-email">Email</Label>
            <Input id="newsletter-email" name="email" type="email" placeholder="pilot@voidmech.com" required />
          </div>
          <Button type="submit" className="w-full uppercase tracking-[0.2em]">
            Join the list
          </Button>
        </form>
      </ModalShell>

      <ModalShell
        id="feedback"
        title="Feedback"
        description="Tell us what feels good, what needs tuning, and what flow drags down your run."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)

            try {
              await postJson('/api/submissions/feedback', {
                topic: String(formData.get('topic') ?? ''),
                message: String(formData.get('message') ?? ''),
                email: String(formData.get('email') ?? ''),
                source: 'site_modal',
              })
              form.reset()
              closeHash()
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to send'
              window.alert(message)
            }
          }}
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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a href="#bug-report" className="nav-link">
              Report a bug
            </a>
            <Button type="submit" className="uppercase tracking-[0.2em]">
              Send signal
            </Button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        id="bug-report"
        title="Bug report"
        description="Flag crashes, blockers, or mission-breakers with enough detail for the team to reproduce."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)

            try {
              await postJson('/api/submissions/bug-report', {
                summary: String(formData.get('summary') ?? ''),
                details: String(formData.get('details') ?? ''),
                platform: String(formData.get('platform') ?? ''),
                severity: String(formData.get('severity') ?? ''),
                email: String(formData.get('email') ?? ''),
                source: 'site_modal',
              })
              form.reset()
              closeHash()
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to send'
              window.alert(message)
            }
          }}
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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a href="#feedback" className="nav-link">
              Send
            </a>
            <Button type="submit" variant="warning" className="uppercase tracking-[0.2em]">
              Submit report
            </Button>
          </div>
        </form>
      </ModalShell>
    </>
  )
}
