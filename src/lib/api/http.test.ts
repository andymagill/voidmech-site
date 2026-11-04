import { describe, expect, it } from 'vitest'
import { readJsonBody } from './http'

function post(
  body: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  return new Request('https://x.test/api', { method: 'POST', headers, body })
}

describe('readJsonBody', () => {
  it('parses a JSON object', async () => {
    await expect(readJsonBody(post('{"a":1}'), 100)).resolves.toEqual({ a: 1 })
  })

  it('accepts a charset suffix on the content type', async () => {
    const request = post('{}', { 'content-type': 'application/json; charset=utf-8' })
    await expect(readJsonBody(request, 100)).resolves.toEqual({})
  })

  it('rejects non-JSON content types with 415', async () => {
    const request = post('{}', { 'content-type': 'text/plain' })
    await expect(readJsonBody(request, 100)).rejects.toMatchObject({ status: 415 })
  })

  it.each(['', 'not json', 'null', '[1,2]', '42', '"text"'])(
    'rejects body %j with 400',
    async (body) => {
      await expect(readJsonBody(post(body), 100)).rejects.toMatchObject({ status: 400 })
    },
  )

  it('caps by bytes, not characters', async () => {
    // Each "é" is one character but two UTF-8 bytes.
    const body = JSON.stringify({ t: 'é'.repeat(10) })
    await expect(readJsonBody(post(body), body.length)).rejects.toMatchObject({ status: 413 })
    await expect(readJsonBody(post(body), 100)).resolves.toEqual({ t: 'é'.repeat(10) })
  })

  it('rejects a declared Content-Length over the cap before reading', async () => {
    const request = post('{}', {
      'content-type': 'application/json',
      'content-length': '999999',
    })
    await expect(readJsonBody(request, 100)).rejects.toMatchObject({ status: 413 })
  })
})
