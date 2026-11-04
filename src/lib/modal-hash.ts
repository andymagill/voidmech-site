/**
 * Modals are driven by the URL hash (`#feedback`, ...), so closing one means
 * clearing the hash. TanStack Router sees that as a navigation and, with
 * `scrollRestoration` on, scrolls a location without a hash to the top, which
 * would throw the visitor to the top of the page every time they close a modal.
 * `closeHash` records the close and `shouldRestoreScroll` (the router's
 * `scrollRestoration` option) skips the router's scroll handling for exactly
 * that update.
 */

/** How long after a close the router's resulting scroll handling is skipped. */
const SKIP_WINDOW_MS = 1500

let lastClose: { pathname: string; at: number } | null = null

/**
 * Clears the URL hash (which closes every modal) without adding a history entry.
 * Keeps `history.state`: it holds the router's location key, and wiping it makes
 * the router treat the change as a new page.
 */
export function closeHash() {
  const nextUrl = new URL(window.location.href)
  nextUrl.hash = ''
  lastClose = { pathname: nextUrl.pathname, at: Date.now() }
  window.history.replaceState(window.history.state, '', nextUrl)
  // `replaceState` does not fire `hashchange`, so notify the modals ourselves.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Router `scrollRestoration` option: false only for the update caused by `closeHash`. */
export function shouldRestoreScroll({ location }: { location: { pathname: string; hash: string } }) {
  const closing =
    lastClose !== null &&
    location.pathname === lastClose.pathname &&
    !location.hash &&
    Date.now() - lastClose.at < SKIP_WINDOW_MS
  return !closing
}
