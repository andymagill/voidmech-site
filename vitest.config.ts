import { defineConfig } from 'vitest/config'

/**
 * Unit tests run in plain Node, without the Cloudflare/TanStack Vite plugins.
 * Code under test takes `env` as a parameter instead of importing
 * `cloudflare:workers`, so no Workers runtime is needed.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
