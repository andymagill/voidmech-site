import { env } from 'cloudflare:workers'

/**
 * Server-side handling for the public submission forms (newsletter, feedback,
 * bug report). Every form posts JSON to a thin route under
 * `src/routes/api/submissions/` which delegates to `handleSubmissionRequest`.
 *
 * All three kinds land in the single `submissions` D1 table
 * (see `migrations/0001_initial_submissions.sql`); kind-specific extras go in
 * `metadata_json`.
 */

export type SubmissionKind = 'newsletter' | 'feedback' | 'bug_report'

type ApiPayload = Record<string, unknown>

type SubmissionRecord = {
  kind: SubmissionKind
  email: string | null
  subject: string | null
  message: string
  metadata: Record<string, string | null>
}

/**
 * A validation failure. Builders throw this instead of returning a `Response`
 * so the happy path stays typed as a plain record.
 */
class SubmissionError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LENGTH = 254 // RFC 5321 limit for a forwardable address
const MAX_BODY_CHARS = 16 * 1024 // far above the largest legitimate form (~4 KB)

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

/** Trim and truncate; returns null for non-strings and blank strings. */
function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function requiredText(value: unknown, maxLength: number, field: string) {
  const text = optionalText(value, maxLength)
  if (!text) {
    throw new SubmissionError(`${field} is required`)
  }

  return text
}

/**
 * Returns a lowercased, validated email, or null when the field is blank.
 * Throws when a value is present but invalid. Length is checked *before*
 * truncation is possible, so an over-long address is rejected rather than
 * silently cut into a different (possibly valid-looking) address.
 */
function optionalEmail(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const email = value.trim().toLowerCase()
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    throw new SubmissionError('Email must be a valid address')
  }

  return email
}

function buildSubmissionRecord(
  kind: SubmissionKind,
  payload: ApiPayload,
): SubmissionRecord {
  const source = optionalText(payload.source, 80)

  switch (kind) {
    case 'newsletter': {
      const email = optionalEmail(payload.email)
      if (!email) {
        throw new SubmissionError('A valid email is required')
      }

      return {
        kind,
        email,
        subject: 'newsletter_opt_in',
        message: 'Newsletter opt-in captured',
        metadata: { source },
      }
    }

    case 'feedback':
      return {
        kind,
        email: optionalEmail(payload.email),
        subject: optionalText(payload.topic, 120),
        message: requiredText(payload.message, 1500, 'message'),
        metadata: { source },
      }

    case 'bug_report': {
      const summary = requiredText(payload.summary, 220, 'summary')

      return {
        kind,
        email: optionalEmail(payload.email),
        subject: summary,
        message: optionalText(payload.details, 2000) ?? summary,
        metadata: {
          severity: optionalText(payload.severity, 40),
          platform: optionalText(payload.platform, 120),
          source,
        },
      }
    }
  }
}

/** Parses the request body, enforcing a size cap and a JSON-object shape. */
async function readPayload(request: Request): Promise<ApiPayload> {
  const raw = await request.text()
  if (raw.length > MAX_BODY_CHARS) {
    throw new SubmissionError('Request body is too large', 413)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SubmissionError('Request body must be valid JSON')
  }

  // `null`, arrays and primitives are valid JSON but would crash field access.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SubmissionError('Request body must be a JSON object')
  }

  return parsed as ApiPayload
}

/**
 * Validates a submission and stores it in D1.
 *
 * Responds 201 with `{ ok, kind, createdAt }` on success, 4xx with
 * `{ error }` for invalid input, and 500 when the binding is missing or the
 * insert fails. Internal failure details are logged, never returned.
 */
export async function handleSubmissionRequest({
  kind,
  request,
}: {
  kind: SubmissionKind
  request: Request
}) {
  // Bindings come from `cloudflare:workers`, not the TanStack Start handler
  // context: that context is an empty object under @cloudflare/vite-plugin, so
  // looking `DB` up there silently 500'd every submission.
  const db = env.DB
  if (!db) {
    console.error(
      'D1 binding `DB` is unavailable; check wrangler.jsonc d1_databases.',
    )
    return json({ error: 'Submissions are temporarily unavailable' }, 500)
  }

  let record: SubmissionRecord
  try {
    record = buildSubmissionRecord(kind, await readPayload(request))
  } catch (error) {
    if (error instanceof SubmissionError) {
      return json({ error: error.message }, error.status)
    }
    throw error
  }

  const createdAt = new Date().toISOString()
  try {
    await db
      .prepare(
        `INSERT INTO submissions (kind, email, subject, message, metadata_json, created_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
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
  } catch (error) {
    console.error('Failed to store submission', error)
    return json({ error: 'Could not save your submission. Try again later.' }, 500)
  }

  return json({ ok: true, kind: record.kind, createdAt }, 201)
}
