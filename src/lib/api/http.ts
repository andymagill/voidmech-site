/**
 * HTTP primitives shared by every API endpoint: JSON responses, a typed error
 * that maps to a 4xx/5xx, and a size-capped JSON body reader.
 */

export type Payload = Record<string, unknown>

/**
 * An expected failure with a user-facing message. Anything thrown inside an
 * endpoint that is *not* an `ApiError` is logged and becomes a generic 500.
 */
export class ApiError extends Error {
  readonly status: number
  readonly extra: Record<string, unknown> | undefined
  readonly headers: Record<string, string> | undefined

  constructor(
    status: number,
    message: string,
    options: { extra?: Record<string, unknown>; headers?: Record<string, string> } = {},
  ) {
    super(message)
    this.status = status
    this.extra = options.extra
    this.headers = options.headers
  }
}

export function json(
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

export function errorResponse(error: ApiError) {
  return json({ ...error.extra, error: error.message }, error.status, error.headers)
}

/**
 * Reads the request body as a JSON object. Rejects non-JSON content types
 * (415), bodies over `maxBytes` bytes (413), invalid JSON and anything that is
 * not a plain object (400).
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<Payload> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'Content-Type must be application/json')
  }

  // Reject early when the client declares an oversized body...
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(413, 'Request body is too large')
  }

  // ...and check the real size, since Content-Length can be absent or wrong.
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > maxBytes) {
    throw new ApiError(413, 'Request body is too large')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }

  // `null`, arrays and primitives are valid JSON but would crash field access.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ApiError(400, 'Request body must be a JSON object')
  }

  return parsed as Payload
}
