import { defineConfig } from 'vitest/config'

/**
 * Unit tests run in plain Node, without the Cloudflare/TanStack Vite plugins.
 * Code under test takes `env` as a parameter instead of importing
 * `cloudflare:workers`, so no Workers runtime is needed.
 *
 * Component tests (`*.test.tsx`) opt into jsdom with a
 * `// @vitest-environment jsdom` comment at the top of the file.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
