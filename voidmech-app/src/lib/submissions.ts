type SubmissionKind = 'newsletter' | 'feedback' | 'bug_report'

type ApiPayload = {
  email?: string
  message?: string
  topic?: string
  summary?: string
  details?: string
  source?: string
  severity?: string
  platform?: string
}

type SubmissionRecord = {
  kind: SubmissionKind
  email: string | null
  subject: string | null
  message: string
  metadata: Record<string, string | boolean | null>
}

type D1Binding = {
  DB: D1Database
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, maxLength)
}

function requireText(
  value: unknown,
  maxLength: number,
  field: string,
): string | Response {
  if (typeof value !== 'string') {
    return json({ error: `${field} is required` }, 400)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return json({ error: `${field} is required` }, 400)
  }

  return trimmed.slice(0, maxLength)
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const email = value.trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) {
    return null
  }

  return email
}

function getD1Binding(context: unknown): D1Binding | null {
  if (typeof context !== 'object' || context === null) {
    return null
  }

  const record = context as Record<string, unknown>
  const directBinding = record.DB
  if (isD1Database(directBinding)) {
    return { DB: directBinding }
  }

  const envBinding = record.env
  if (typeof envBinding === 'object' && envBinding !== null) {
    const db = (envBinding as Record<string, unknown>).DB
    if (isD1Database(db)) {
      return { DB: db }
    }
  }

  const cloudflare = record.cloudflare
  if (typeof cloudflare === 'object' && cloudflare !== null) {
    const cfEnv = (cloudflare as Record<string, unknown>).env
    if (typeof cfEnv === 'object' && cfEnv !== null) {
      const db = (cfEnv as Record<string, unknown>).DB
      if (isD1Database(db)) {
        return { DB: db }
      }
    }
  }

  return null
}

function isD1Database(value: unknown): value is D1Database {
  return (
    typeof value === 'object' &&
    value !== null &&
    'prepare' in value &&
    typeof (value as { prepare: unknown }).prepare === 'function'
  )
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function buildSubmissionRecord(
  kind: SubmissionKind,
  payload: ApiPayload,
): SubmissionRecord | Response {
  if (kind === 'newsletter') {
    const email = normalizeEmail(payload.email)
    if (!email) {
      return json({ error: 'A valid email is required' }, 400)
    }

    return {
      kind,
      email,
      subject: 'newsletter_opt_in',
      message: 'Newsletter opt-in captured',
      metadata: {
        source: normalizeOptionalText(payload.source, 80),
      },
    }
  }

  if (kind === 'feedback') {
    const message = requireText(payload.message, 1500, 'message')
    if (message instanceof Response) {
      return message
    }

    const emailInput = normalizeOptionalText(payload.email, 120)
    const email = emailInput ? normalizeEmail(emailInput) : null
    if (emailInput && !email) {
      return json({ error: 'Email must be valid when provided' }, 400)
    }

    return {
      kind,
      email,
      subject: normalizeOptionalText(payload.topic, 120),
      message,
      metadata: {
        source: normalizeOptionalText(payload.source, 80),
      },
    }
  }

  const summary = requireText(payload.summary, 220, 'summary')
  if (summary instanceof Response) {
    return summary
  }

  const detailsText = normalizeOptionalText(payload.details, 2000)
  const emailInput = normalizeOptionalText(payload.email, 120)
  const email = emailInput ? normalizeEmail(emailInput) : null
  if (emailInput && !email) {
    return json({ error: 'Email must be valid when provided' }, 400)
  }

  return {
    kind,
    email,
    subject: summary,
    message: detailsText ?? summary,
    metadata: {
      severity: normalizeOptionalText(payload.severity, 40),
      platform: normalizeOptionalText(payload.platform, 120),
      source: normalizeOptionalText(payload.source, 80),
    },
  }
}

export async function handleSubmissionRequest({
  kind,
  request,
  context,
}: {
  kind: SubmissionKind
  request: Request
  context: unknown
}) {
  const d1Binding = getD1Binding(context)
  if (!d1Binding) {
    return json(
      {
        error:
          'D1 binding is unavailable. Confirm wrangler.jsonc d1_databases binding `DB` is configured.',
      },
      500,
    )
  }

  let body: ApiPayload
  try {
    body = (await request.json()) as ApiPayload
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400)
  }

  const record = buildSubmissionRecord(kind, body)
  if (record instanceof Response) {
    return record
  }

  const now = new Date().toISOString()
  await d1Binding.DB.prepare(
    `INSERT INTO submissions (kind, email, subject, message, metadata_json, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(
      record.kind,
      record.email,
      record.subject,
      record.message,
      JSON.stringify(record.metadata),
      now,
    )
    .run()

  return json(
    {
      ok: true,
      kind: record.kind,
      createdAt: now,
    },
    201,
  )
}
