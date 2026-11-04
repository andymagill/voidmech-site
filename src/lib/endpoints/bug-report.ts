import { defineEndpoint } from '#/lib/api/endpoint'
import { optionalEmail, optionalText, requiredText } from '#/lib/api/fields'
import { insertSubmission, webFormGuards, WEB_FORM_MAX_BYTES, type SubmissionRecord } from './shared'

/**
 * POST /api/submissions/bug-report:
 * `{ summary, details?, severity?, platform?, email?, source? }`.
 * `details` falls back to `summary` because `message` is required in D1.
 */
export const bugReport = defineEndpoint<SubmissionRecord>({
  name: 'bug-report',
  maxBytes: WEB_FORM_MAX_BYTES,
  guards: webFormGuards,
  parse: (payload) => {
    const summary = requiredText(payload.summary, 220, 'summary')

    return {
      kind: 'bug_report',
      email: optionalEmail(payload.email),
      subject: summary,
      message: optionalText(payload.details, 2000) ?? summary,
      metadata: {
        severity: optionalText(payload.severity, 40),
        platform: optionalText(payload.platform, 120),
        source: optionalText(payload.source, 80),
      },
    }
  },
  store: insertSubmission,
})
