// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SubmissionModals } from './SubmissionModals'
import { installTurnstile } from '#/test/turnstile'

function setHash(hash: string) {
  window.history.replaceState(window.history.state, '', `/${hash}`)
  act(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentPayload(fetchMock: ReturnType<typeof respondWith>, call = 0) {
  const [url, init] = fetchMock.mock.calls[call] as unknown as [string, RequestInit]
  return { url, payload: JSON.parse(init.body as string) as Record<string, string> }
}

/** Opens the feedback modal and waits for its Turnstile widget to render. */
async function openFeedback(turnstile: ReturnType<typeof installTurnstile>) {
  setHash('#feedback')
  await screen.findByRole('dialog', { name: 'Feedback' })
  await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())
}

describe('SubmissionModals', () => {
  let turnstile: ReturnType<typeof installTurnstile>

  beforeEach(() => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    document.body.style.overflow = ''
    window.history.replaceState({ __TSR_key: 'router-key' }, '', '/')
    turnstile = installTurnstile()
  })

  afterEach(() => {
    cleanup()
    delete window.turnstile
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('Turnstile timing', () => {
    it('renders the widget as interaction-only and does not run the challenge until the form is used', async () => {
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      expect(turnstile.current().options).toMatchObject({
        sitekey: 'test-site-key',
        appearance: 'interaction-only',
        execution: 'execute',
      })
      expect(turnstile.api.execute).not.toHaveBeenCalled()
    })

    it('starts the challenge once, on first focus of a field', async () => {
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.focus(screen.getByLabelText('Topic'))
      expect(turnstile.api.execute).toHaveBeenCalledTimes(1)

      fireEvent.focus(screen.getByLabelText('Message'))
      fireEvent.input(screen.getByLabelText('Message'), { target: { value: 'hi' } })
      expect(turnstile.api.execute).toHaveBeenCalledTimes(1)
    })

    it('removes the widget when the modal closes', async () => {
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      setHash('')
      expect(turnstile.current().removed).toBe(true)
    })
  })

  describe('submitting', () => {
    it('posts the fields, source and token to the endpoint, then shows a confirmation', async () => {
      const fetchMock = respondWith(201, { ok: true })
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Great game' } })
      fireEvent.focus(screen.getByLabelText('Message'))
      turnstile.solve('token-1')
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

      await screen.findByText('Feedback received')
      const { url, payload } = sentPayload(fetchMock)
      expect(url).toBe('/api/submissions/feedback')
      expect(payload).toMatchObject({
        source: 'site_modal',
        message: 'Great game',
        'cf-turnstile-response': 'token-1',
      })
      expect(turnstile.current().resets).toBe(1) // spent token discarded
    })

    it('moves focus into the confirmation and closes from its Close button', async () => {
      respondWith(201, { ok: true })
      render(
        <>
          <a href="#feedback">Open feedback</a>
          <SubmissionModals />
        </>,
      )
      const trigger = screen.getByRole('link', { name: 'Open feedback' })
      trigger.focus()
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
      turnstile.solve('t')
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

      const heading = await screen.findByRole('heading', { name: 'Feedback received' })
      expect(document.activeElement).toBe(heading)
      expect(screen.queryByRole('button', { name: 'Send Feedback' })).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(window.location.hash).toBe('')
      expect(document.body.style.overflow).toBe('')
      expect(document.activeElement).toBe(trigger)
    })

    it('waits for the token when submitted before the challenge finished', async () => {
      const fetchMock = respondWith(201, { ok: true })
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'fast typist' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

      const button = await screen.findByRole('button', { name: 'Verifying…' })
      expect((button as HTMLButtonElement).disabled).toBe(true)
      expect(turnstile.api.execute).toHaveBeenCalledTimes(1)
      expect(fetchMock).not.toHaveBeenCalled()

      turnstile.solve('late-token')
      await screen.findByText('Feedback received')
      expect(sentPayload(fetchMock).payload['cf-turnstile-response']).toBe('late-token')
    })

    it('ignores a second submit while the first is in flight', async () => {
      let release!: () => void
      const fetchMock = vi.fn(
        () => new Promise<Response>((resolve) => (release = () => resolve(new Response('{}', { status: 201 })))),
      )
      vi.stubGlobal('fetch', fetchMock)
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
      turnstile.solve('t')
      const form = screen.getByLabelText('Message').closest('form')!
      fireEvent.submit(form)
      await screen.findByRole('button', { name: 'Sending…' })
      fireEvent.submit(form)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      release()
      await screen.findByText('Feedback received')
    })

    it('shows the API error, keeps the input, and gets a fresh token for the retry', async () => {
      const fetchMock = respondWith(400, { error: 'Message is too long' })
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'keep me' } })
      turnstile.solve('spent-token')
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

      expect((await screen.findByRole('alert')).textContent).toBe('Message is too long')
      expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('keep me')
      expect(turnstile.current().resets).toBe(1)
      expect(turnstile.api.execute).toHaveBeenCalledTimes(1) // fresh challenge started for the retry

      // The retry waits for, and then uses, the new token (not the spent one).
      fetchMock.mockResolvedValueOnce(new Response('{}', { status: 201 }))
      turnstile.solve('fresh-token')
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))
      await screen.findByText('Feedback received')
      expect(sentPayload(fetchMock, 1).payload['cf-turnstile-response']).toBe('fresh-token')
    })

    it('shows a generic message when the network request fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
      turnstile.solve('t')
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

      expect((await screen.findByRole('alert')).textContent).toMatch(/Network error/)
    })

    it('does not reuse an expired token: the submit starts a new challenge and waits', async () => {
      const fetchMock = respondWith(201, { ok: true })
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
      fireEvent.focus(screen.getByLabelText('Message'))
      turnstile.solve('old-token')
      turnstile.expire()
      expect(turnstile.api.execute).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))
      await screen.findByRole('button', { name: 'Verifying…' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(turnstile.api.execute).toHaveBeenCalledTimes(2)

      turnstile.solve('new-token')
      await screen.findByText('Feedback received')
      expect(sentPayload(fetchMock).payload['cf-turnstile-response']).toBe('new-token')
    })

    it('stops waiting after 45 s if the challenge never answers, and starts a clean retry', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const fetchMock = respondWith(201, { ok: true })
        render(<SubmissionModals />)
        await openFeedback(turnstile)

        fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
        fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))
        await screen.findByRole('button', { name: 'Verifying…' })

        await act(async () => {
          vi.advanceTimersByTime(45_000)
        })

        expect((await screen.findByRole('alert')).textContent).toMatch(/taking too long/)
        expect((screen.getByRole('button', { name: 'Send Feedback' }) as HTMLButtonElement).disabled).toBe(false)
        expect(fetchMock).not.toHaveBeenCalled()
        expect(turnstile.current().resets).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('stops waiting and explains when the challenge fails', async () => {
      const fetchMock = respondWith(201, { ok: true })
      render(<SubmissionModals />)
      await openFeedback(turnstile)

      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))
      await screen.findByRole('button', { name: 'Verifying…' })

      turnstile.fail()
      expect((await screen.findByRole('alert')).textContent).toMatch(/Verification failed/)
      expect((screen.getByRole('button', { name: 'Send Feedback' }) as HTMLButtonElement).disabled).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('opening, closing and focus', () => {
    it('locks scroll while open and unlocks on Close, Escape and backdrop click', async () => {
      const { container } = render(<SubmissionModals />)

      for (const dismiss of [
        () => fireEvent.click(screen.getByRole('button', { name: 'Close form' })),
        () => fireEvent.keyDown(document, { key: 'Escape' }),
        () => fireEvent.click(container.ownerDocument.querySelector('[aria-hidden="true"].absolute.inset-0')!),
      ]) {
        setHash('#feedback')
        await screen.findByRole('dialog')
        expect(document.body.style.overflow).toBe('hidden')
        dismiss()
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(window.location.hash).toBe('')
        expect(document.body.style.overflow).toBe('')
      }
    })

    it('switches between #feedback and #bug-report without leaving the page locked', async () => {
      render(<SubmissionModals />)

      setHash('#feedback')
      await screen.findByRole('dialog', { name: 'Feedback' })
      setHash('#bug-report')
      await screen.findByRole('dialog', { name: 'Bug report' })
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(document.body.style.overflow).toBe('hidden')

      setHash('#feedback')
      await screen.findByRole('dialog', { name: 'Feedback' })
      fireEvent.click(screen.getByRole('button', { name: 'Close form' }))
      expect(document.body.style.overflow).toBe('')
    })

    it('keeps the router history state when closing (wiping it makes the router scroll to top)', async () => {
      render(<SubmissionModals />)
      setHash('#feedback')
      await screen.findByRole('dialog')

      fireEvent.click(screen.getByRole('button', { name: 'Close form' }))
      expect(window.history.state).toEqual({ __TSR_key: 'router-key' })
    })

    it('keeps Tab and Shift+Tab inside the dialog', async () => {
      render(<SubmissionModals />)
      setHash('#feedback')
      await screen.findByRole('dialog')

      const close = screen.getByRole('button', { name: 'Close form' })
      const submit = screen.getByRole('button', { name: 'Send Feedback' })

      submit.focus()
      fireEvent.keyDown(submit, { key: 'Tab' })
      expect(document.activeElement).toBe(close)

      fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(submit)
    })
  })

  describe('bug report form', () => {
    async function openBugReport() {
      setHash('#bug-report')
      await screen.findByRole('dialog', { name: 'Bug report' })
      await waitFor(() => expect(turnstile.api.render).toHaveBeenCalled())
    }

    it('offers severity as an optional select of the four levels, and no platform field', async () => {
      render(<SubmissionModals />)
      await openBugReport()

      const severity = screen.getByRole('combobox', { name: 'Severity' }) as unknown as HTMLSelectElement
      expect(Array.from(severity.options).map((option) => option.textContent)).toEqual([
        'Not sure',
        'Low',
        'Medium',
        'High',
        'Critical',
      ])
      expect(severity.value).toBe('')
      expect(screen.queryByLabelText('Platform')).toBeNull()
    })

    async function submitReport(severity?: string) {
      const fetchMock = respondWith(201, { ok: true })
      render(<SubmissionModals />)
      await openBugReport()

      fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Crash on dock' } })
      if (severity) fireEvent.change(screen.getByLabelText('Severity'), { target: { value: severity } })
      fireEvent.focus(screen.getByLabelText('Summary'))
      turnstile.solve('token-1')
      fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

      await screen.findByText('Report received')
      return sentPayload(fetchMock)
    }

    it('posts the chosen severity', async () => {
      const { url, payload } = await submitReport('High')
      expect(url).toBe('/api/submissions/bug-report')
      expect(payload).toMatchObject({ summary: 'Crash on dock', severity: 'High' })
      expect(payload).not.toHaveProperty('platform')
    })

    it('posts an empty severity when none is chosen (the server treats it as absent)', async () => {
      const { payload } = await submitReport()
      expect(payload.severity).toBe('')
    })
  })
})
