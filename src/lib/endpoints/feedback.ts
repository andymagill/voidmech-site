import { defineEndpoint } from '#/lib/api/endpoint'
import { optionalEmail, optionalText, requiredText } from '#/lib/api/fields'
import { browserGuards } from '#/lib/api/guards'
import { insertSubmission, WEB_FORM_MAX_BYTES, type SubmissionRecord } from './shared'

/** POST /api/submissions/feedback: `{ message, topic?, email?, source? }`. */
export const feedback = defineEndpoint<SubmissionRecord>({
  name: 'feedback',
  maxBytes: WEB_FORM_MAX_BYTES,
  guards: browserGuards,
  parse: (payload) => ({
    kind: 'feedback',
    email: optionalEmail(payload.email),
    subject: optionalText(payload.topic, 120),
    message: requiredText(payload.message, 1500, 'message'),
    metadata: { source: optionalText(payload.source, 80) },
  }),
  store: insertSubmission,
})
