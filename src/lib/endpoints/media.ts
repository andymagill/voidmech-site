/**
 * `GET`/`HEAD /media/:file`: public media (hero video clips) from the `MEDIA`
 * R2 bucket, with byte-range support.
 *
 * Why not static assets: Workers static assets answer `Range` requests with a
 * full `200`, and Safari/iOS refuse to play video unless the server returns
 * `206 Partial Content`. Keys carry a content hash (see
 * content/marketing-assets/web/README.md), so responses are cached as
 * immutable.
 */

/** Only plain, hashed media filenames; nothing else in the bucket is reachable. */
const MEDIA_KEY = /^[a-z0-9][a-z0-9-]*\.(mp4|webm|jpg|webp)$/

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  webp: 'image/webp',
}

export type ByteRange = { start: number; end: number }

/**
 * Parses a single `bytes=` range against an object of `size` bytes. Returns
 * `null` when the header is absent or not something we honour (multi-range,
 * malformed), meaning "serve the whole object", as RFC 9110 allows, and
 * `'unsatisfiable'` when it starts past the end.
 */
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return null

  if (match[1] === '') {
    const suffix = Number(match[2])
    if (suffix === 0 || size === 0) return 'unsatisfiable'
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }

  const start = Number(match[1])
  if (start >= size) return 'unsatisfiable'
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  return end < start ? null : { start, end }
}

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })
}

export async function serveMedia(
  request: Request,
  env: Pick<Env, 'MEDIA'>,
  key: string,
): Promise<Response> {
  if (!MEDIA_KEY.test(key)) return notFound()
  if (!env.MEDIA) {
    console.error('R2 binding `MEDIA` is unavailable; check wrangler.jsonc r2_buckets.')
    return new Response('Media unavailable', { status: 503 })
  }

  try {
    const head = await env.MEDIA.head(key)
    if (!head) return notFound()

    const headers = new Headers()
    head.writeHttpMetadata(headers)
    if (!headers.has('content-type')) {
      headers.set('content-type', CONTENT_TYPES[key.split('.').pop()!] ?? 'application/octet-stream')
    }
    headers.set('etag', head.httpEtag)
    headers.set('accept-ranges', 'bytes')
    headers.set('cache-control', 'public, max-age=31536000, immutable')
    headers.set('x-content-type-options', 'nosniff')

    if (request.headers.get('if-none-match') === head.httpEtag) {
      return new Response(null, { status: 304, headers })
    }

    const range = parseRange(request.headers.get('range'), head.size)
    if (range === 'unsatisfiable') {
      headers.set('content-range', `bytes */${head.size}`)
      return new Response(null, { status: 416, headers })
    }

    const status = range ? 206 : 200
    const length = range ? range.end - range.start + 1 : head.size
    headers.set('content-length', String(length))
    if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${head.size}`)

    if (request.method === 'HEAD') return new Response(null, { status, headers })

    const object = await env.MEDIA.get(
      key,
      range ? { range: { offset: range.start, length } } : undefined,
    )
    if (!object) return notFound()
    return new Response(object.body, { status, headers })
  } catch (error) {
    console.error(`[media] failed to serve ${key}`, error)
    return new Response('Media unavailable', { status: 500 })
  }
}
