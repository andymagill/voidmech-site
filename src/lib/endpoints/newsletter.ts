import { defineEndpoint } from '#/lib/api/endpoint'
import { optionalEmail, optionalText } from '#/lib/api/fields'
import { ApiError } from '#/lib/api/http'
import { browserGuards } from '#/lib/api/guards'
import { insertSubmission, WEB_FORM_MAX_BYTES, type SubmissionRecord } from './shared'

/** POST /api/submissions/newsletter: `{ email, source? }`. One row per address. */
export const newsletter = defineEndpoint<SubmissionRecord>({
  name: 'newsletter',
  maxBytes: WEB_FORM_MAX_BYTES,
  guards: browserGuards,
  parse: (payload) => {
    const email = optionalEmail(payload.email)
    if (!email) {
      throw new ApiError(400, 'A valid email is required')
    }

    return {
      kind: 'newsletter',
      email,
      subject: 'newsletter_opt_in',
      message: 'Newsletter opt-in captured',
      metadata: { source: optionalText(payload.source, 80) },
    }
  },
  store: (db, record, ctx) =>
    insertSubmission(db, record, ctx, { ignoreDuplicateNewsletter: true }),
})
