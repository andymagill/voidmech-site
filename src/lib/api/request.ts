/** Request helpers: client identity and keyed hashing. */

/**
 * The caller's IP as reported by Cloudflare. Local dev has no such header, so
 * every local request shares one identity.
 */
export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'local'
}

/**
 * The part of an IP that identifies one household or device for rate and vote
 * limits. IPv4 is used whole. An IPv6 customer owns at least a whole /64 and can
 * rotate addresses inside it freely, so only its first 64 bits count. Anything
 * unparseable is returned unchanged (such as `local` in dev).
 */
export function voterNetwork(ip: string): string {
  if (!ip.includes(':')) return ip

  // `::ffff:1.2.3.4` is an IPv4 client reaching us over IPv6.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (mapped) return mapped[1]

  const [head, tail, extra] = ip.toLowerCase().split('::')
  if (extra !== undefined || ip.includes('.')) return ip
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  // Without `::` the address must already be 8 groups; with it, the gap is zeros.
  if (tail === undefined && left.length !== 8) return ip
  const gap = tail === undefined ? 0 : 8 - left.length - right.length
  if (gap < 0 || (tail !== undefined && gap < 1)) return ip

  const groups = [...left, ...Array<string>(gap).fill('0'), ...right]
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return ip

  return `${groups
    .slice(0, 4)
    .map((group) => group.padStart(4, '0'))
    .join(':')}::/64`
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
