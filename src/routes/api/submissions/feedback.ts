import { createFileRoute } from '@tanstack/react-router'
import { handleSubmissionRequest } from '#/lib/submissions'

/** POST /api/submissions/feedback: validation and storage live in `#/lib/submissions`. */
export const Route = createFileRoute('/api/submissions/feedback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleSubmissionRequest({
          kind: 'feedback',
          request,
        })
      },
    },
  },
})
