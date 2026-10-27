import { createFileRoute } from '@tanstack/react-router'
import { handleSubmissionRequest } from '#/lib/submissions'

export const Route = createFileRoute('/api/submissions/newsletter')({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        return handleSubmissionRequest({
          kind: 'newsletter',
          request,
          context,
        })
      },
    },
  },
})
