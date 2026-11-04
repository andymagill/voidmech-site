import { useEffect, useRef, type RefObject } from 'react'

/**
 * Behaviour shared by every modal-like overlay (submission modals, screenshot
 * lightbox): one reference-counted page scroll lock and one focus trap.
 */

// --- Scroll lock -----------------------------------------------------------

const scrollLocks = new Set<symbol>()
let overflowBeforeLock = ''

/**
 * Locks page scroll and returns an idempotent release function. The page's
 * own `overflow` value is saved when the first lock is taken and restored only
 * when the last one is released, so overlapping overlays can open and close in
 * any order without leaving the page locked (or unlocked while one is open).
 */
export function lockScroll(): () => void {
  const token = Symbol('scroll-lock')
  if (scrollLocks.size === 0) {
    overflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks.add(token)

  return () => {
    if (!scrollLocks.delete(token)) return
    if (scrollLocks.size === 0) document.body.style.overflow = overflowBeforeLock
  }
}

export function useScrollLock(active: boolean) {
  useEffect(() => (active ? lockScroll() : undefined), [active])
}

// --- Focus trap ------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

/** Open traps, innermost last. Only the innermost handles keys, so Escape closes one overlay at a time. */
const trapStack: symbol[] = []

/** Focusable descendants that are in the tab order (`tabindex="-1"` and `aria-hidden` subtrees are skipped). */
function tabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest('[aria-hidden="true"]'),
  )
}

/**
 * While `active`: moves focus into `containerRef` (to `initialFocusRef` when
 * given, otherwise the container itself), keeps Tab and Shift+Tab inside it,
 * calls `onEscape` on Escape, and returns focus to the previously focused
 * element when deactivated. The container needs `tabIndex={-1}` to be
 * focusable itself.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    const container = containerRef.current
    if (!active || !container) return

    const id = Symbol('focus-trap')
    trapStack.push(id)
    const trigger = document.activeElement as HTMLElement | null
    ;(initialFocusRef?.current ?? container).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== id) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = tabbables(container)
      if (items.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!container.contains(current) || current === container) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      trapStack.splice(trapStack.indexOf(id), 1)
      if (trigger && trigger !== document.body && trigger.isConnected) trigger.focus()
    }
  }, [active, containerRef, initialFocusRef])
}
