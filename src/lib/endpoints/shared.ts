import { json } from '#/lib/api/http'
import type { EndpointContext } from '#/lib/api/guards'

/** Size cap for browser forms: far above the largest legitimate form (~4 KB). */
export const WEB_FORM_MAX_BYTES = 16 * 1024

/** A row in the `submissions` table (messages from people). */
export type SubmissionRecord = {
  kind: 'newsletter' | 'feedback' | 'bug_report'
  email: string | null
  subject: string | null
  message: string
  metadata: Record<string, string | null>
}

/**
 * Inserts into `submissions` and responds `201 { ok, kind, createdAt }`.
 * With `ignoreDuplicateNewsletter`, a repeat newsletter address is a silent
 * no-op that still returns 201, so the response never reveals whether an
 * address is already subscribed.
 */
export async function insertSubmission(
  db: D1Database,
  record: SubmissionRecord,
  ctx: EndpointContext,
  { ignoreDuplicateNewsletter = false } = {},
) {
  const createdAt = ctx.now.toISOString()
  const conflict = ignoreDuplicateNewsletter
    ? ` ON CONFLICT(email) WHERE kind = 'newsletter' DO NOTHING`
    : ''

  await db
    .prepare(
      `INSERT INTO submissions (kind, email, subject, message, metadata_json, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)${conflict}`,
    )
    .bind(
      record.kind,
      record.email,
      record.subject,
      record.message,
      JSON.stringify(record.metadata),
      createdAt,
    )
    .run()

  return json({ ok: true, kind: record.kind, createdAt }, 201)
}
