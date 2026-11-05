import { defineEndpoint } from '#/lib/api/endpoint'
import { optionalEmail, optionalOneOf, optionalText, requiredText } from '#/lib/api/fields'
import { browserGuards } from '#/lib/api/guards'
import { BUG_SEVERITIES } from '#/lib/bug-report-options'
import { insertSubmission, WEB_FORM_MAX_BYTES, type SubmissionRecord } from './shared'

/**
 * POST /api/submissions/bug-report:
 * `{ summary, details?, severity?, platform?, email?, source? }`.
 * `details` falls back to `summary` because `message` is required in D1.
 * `severity` must be one of `BUG_SEVERITIES` (case-insensitive, stored canonical)
 * or blank; anything else is a 400. `platform` is free text (the form doesn't send it while the game is Windows-only).
 */
export const bugReport = defineEndpoint<SubmissionRecord>({
  name: 'bug-report',
  maxBytes: WEB_FORM_MAX_BYTES,
  guards: browserGuards,
  parse: (payload) => {
    const summary = requiredText(payload.summary, 220, 'summary')

    return {
      kind: 'bug_report',
      email: optionalEmail(payload.email),
      subject: summary,
      message: optionalText(payload.details, 2000) ?? summary,
      metadata: {
        severity: optionalOneOf(payload.severity, BUG_SEVERITIES, 'severity'),
        platform: optionalText(payload.platform, 120),
        source: optionalText(payload.source, 80),
      },
    }
  },
  store: insertSubmission,
})
