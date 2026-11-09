import { describe, expect, it, vi } from 'vitest'
import { parseRange, serveMedia } from './media'

const KEY = 'clip-abc123.mp4'
const BYTES = new TextEncoder().encode('0123456789')

/** A minimal R2 stand-in holding one 10-byte object. */
function fakeBucket(objects: Record<string, Uint8Array> = { [KEY]: BYTES }) {
  const get = vi.fn(async (key: string, options?: { range?: { offset: number; length: number } }) => {
    const data = objects[key]
    if (!data) return null
    const { offset = 0, length = data.length } = options?.range ?? {}
    return { body: new Blob([data.slice(offset, offset + length)]).stream() }
  })
  const head = vi.fn(async (key: string) => {
    const data = objects[key]
    if (!data) return null
    return {
      size: data.length,
      httpEtag: '"etag-1"',
      writeHttpMetadata: (headers: Headers) => headers.set('content-type', 'video/mp4'),
    }
  })
  return { MEDIA: { get, head } as unknown as R2Bucket, get, head }
}

function request(headers: Record<string, string> = {}, method = 'GET') {
  return new Request(`https://voidmech.example/media/${KEY}`, { method, headers })
}

describe('parseRange', () => {
  it.each([
    [null, null],
    ['bytes=0-1', { start: 0, end: 1 }],
    ['bytes=4-', { start: 4, end: 9 }],
    ['bytes=-3', { start: 7, end: 9 }],
    ['bytes=-50', { start: 0, end: 9 }],
    ['bytes=8-500', { start: 8, end: 9 }],
    ['bytes=10-', 'unsatisfiable'],
    ['bytes=-0', 'unsatisfiable'],
    ['bytes=5-2', null],
    ['bytes=0-1,4-5', null],
    ['items=0-1', null],
    ['bytes=-', null],
  ] as const)('%s → %j', (header, expected) => {
    expect(parseRange(header, 10)).toEqual(expected)
  })
})

describe('serveMedia', () => {
  it('answers a range with 206 and only those bytes', async () => {
    const env = fakeBucket()
    const res = await serveMedia(request({ range: 'bytes=2-5' }), env, KEY)

    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(res.headers.get('content-length')).toBe('4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(await res.text()).toBe('2345')
    expect(env.get).toHaveBeenCalledWith(KEY, { range: { offset: 2, length: 4 } })
  })

  it('serves the whole object without a range, cached as immutable', async () => {
    const res = await serveMedia(request(), fakeBucket(), KEY)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-length')).toBe('10')
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(await res.text()).toBe('0123456789')
  })

  it('returns 416 for a range past the end', async () => {
    const res = await serveMedia(request({ range: 'bytes=20-' }), fakeBucket(), KEY)
    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBe('bytes */10')
  })

  it('returns 304 when the ETag matches, without reading the body', async () => {
    const env = fakeBucket()
    const res = await serveMedia(request({ 'if-none-match': '"etag-1"' }), env, KEY)
    expect(res.status).toBe(304)
    expect(env.get).not.toHaveBeenCalled()
  })

  it('answers HEAD with headers only', async () => {
    const env = fakeBucket()
    const res = await serveMedia(request({ range: 'bytes=0-1' }, 'HEAD'), env, KEY)
    expect(res.status).toBe(206)
    expect(res.headers.get('content-length')).toBe('2')
    expect(env.get).not.toHaveBeenCalled()
  })

  it('404s unknown objects and refuses keys outside the media pattern', async () => {
    const env = fakeBucket()
    expect((await serveMedia(request(), env, 'missing-1.mp4')).status).toBe(404)
    for (const key of ['../secret.mp4', 'notes.txt', 'UPPER.mp4', '.hidden.mp4']) {
      expect((await serveMedia(request(), env, key)).status).toBe(404)
    }
    expect(env.head).toHaveBeenCalledTimes(1)
  })

  it('returns a generic 500 when R2 fails', async () => {
    const env = fakeBucket()
    env.head.mockRejectedValueOnce(new Error('R2 internal detail'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await serveMedia(request(), env, KEY)
    expect(res.status).toBe(500)
    expect(await res.text()).not.toContain('internal detail')
  })
})
