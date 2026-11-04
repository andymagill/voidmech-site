import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { shouldRestoreScroll } from '#/lib/modal-hash'

/**
 * Router factory called by TanStack Start once per request on the server and
 * once on the client, so each SSR request gets its own router instance
 * (no state leaks between visitors).
 */
export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    // Restores scroll on navigation, except for the update caused by closing a hash modal.
    scrollRestoration: shouldRestoreScroll,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
