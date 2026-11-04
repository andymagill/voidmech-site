import { expect } from 'vitest'

/**
 * The few DOM matchers component tests need, so the project doesn't take a
 * dependency on jest-dom. Import once per test file (jsdom only).
 * `toBeDisabled` follows `:disabled`, which includes inputs inside a disabled fieldset.
 */

function asElement(value: unknown): HTMLElement {
  if (!(value instanceof HTMLElement)) throw new TypeError('Expected an HTMLElement')
  return value
}

expect.extend({
  toBeInTheDocument(received: unknown) {
    const pass = received instanceof HTMLElement && received.ownerDocument.contains(received)
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to be in the document` }
  },
  toBeDisabled(received: unknown) {
    const pass = asElement(received).matches(':disabled')
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to be disabled` }
  },
  toBeEnabled(received: unknown) {
    const pass = !asElement(received).matches(':disabled')
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to be enabled` }
  },
  toBeChecked(received: unknown) {
    const pass = (asElement(received) as HTMLInputElement).checked
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to be checked` }
  },
  toHaveFocus(received: unknown) {
    const element = asElement(received)
    const pass = element.ownerDocument.activeElement === element
    return { pass, message: () => `expected element ${pass ? 'not ' : ''}to have focus` }
  },
  toHaveAttribute(received: unknown, name: string, value?: string) {
    const element = asElement(received)
    const pass = value === undefined ? element.hasAttribute(name) : element.getAttribute(name) === value
    return {
      pass,
      message: () =>
        `expected ${name}="${element.getAttribute(name)}" ${pass ? 'not ' : ''}to match ${value ?? '(present)'}`,
    }
  },
  toHaveTextContent(received: unknown, expected: string | RegExp) {
    const text = (asElement(received).textContent ?? '').replace(/\s+/g, ' ').trim()
    const pass = typeof expected === 'string' ? text.includes(expected) : expected.test(text)
    return { pass, message: () => `expected text "${text}" ${pass ? 'not ' : ''}to match ${expected}` }
  },
})

declare module 'vitest' {
  // The parameters must match vitest's own declaration for the merge to apply.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toBeInTheDocument(): R
    toBeDisabled(): R
    toBeEnabled(): R
    toBeChecked(): R
    toHaveFocus(): R
    toHaveAttribute(name: string, value?: string): R
    toHaveTextContent(expected: string | RegExp): R
  }
}
