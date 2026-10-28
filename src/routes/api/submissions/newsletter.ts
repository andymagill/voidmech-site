import { createFileRoute } from '@tanstack/react-router'
import { handleSubmissionRequest } from '#/lib/submissions'

/** POST /api/submissions/newsletter: validation and storage live in `#/lib/submissions`. */
export const Route = createFileRoute('/api/submissions/newsletter')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleSubmissionRequest({
          kind: 'newsletter',
          request,
        })
      },
    },
  },
})
