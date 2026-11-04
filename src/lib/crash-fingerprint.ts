import { sha256Hex } from '#/lib/api/request'

/**
 * Groups crash reports that are the same bug. Computed on the server from the
 * exception and the top of the stack, never taken from the client, and made
 * stable across installs and versions by dropping what varies: directory
 * names, addresses, and every number (line numbers, ids, counts).
 */

const FRAMES_USED = 12
const LINE_MAX = 200

/** Reduces one exception/stack line to its stable shape. */
export function normalizeLine(line: string): string {
  return line
    .trim()
    // Directories go, the file name stays: C:\Users\x\game\Ship.cs -> Ship.cs
    .replace(/\b[A-Za-z]:[\\/](?:[^\\/\s:()]+[\\/])*/g, '')
    .replace(/(?<![\w.])(?:\/[^/\s:()]+)+\//g, '')
    // Addresses become a word (not digits), so the number rule below leaves them alone.
    .replace(/0x[0-9a-f]+/gi, 'ADDR')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, LINE_MAX)
}

/** 32 hex characters (128 bits) identifying the crash. */
export async function crashFingerprint(exception: string, stack: string | null): Promise<string> {
  const headline = normalizeLine(exception.split('\n')[0] ?? '')
  const frames = (stack ?? '')
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)
    .slice(0, FRAMES_USED)

  return (await sha256Hex([headline, ...frames].join('\n'))).slice(0, 32)
}
