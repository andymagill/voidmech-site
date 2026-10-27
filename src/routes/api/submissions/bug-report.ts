import { createFileRoute } from '@tanstack/react-router'
import { handleSubmissionRequest } from '#/lib/submissions'

export const Route = createFileRoute('/api/submissions/bug-report')({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        return handleSubmissionRequest({
          kind: 'bug_report',
          request,
          context,
        })
      },
    },
  },
})
