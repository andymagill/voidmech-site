/** Request helpers: client identity and keyed hashing. */

/**
 * The caller's IP as reported by Cloudflare. Local dev has no such header, so
 * every local request shares one identity.
 */
export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'local'
}

const encoder = new TextEncoder()

/** Hex HMAC-SHA-256 of `value` under `secret`. Used to store identities without the raw value. */
export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toHex(signature)
}

/** Hex SHA-256 of `value`. */
export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Constant-time string comparison. Compares HMACs of both sides so inputs of
 * different lengths take the same time as equal-length ones.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([hmacHex('compare', a), hmacHex('compare', b)])
  let diff = 0
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
