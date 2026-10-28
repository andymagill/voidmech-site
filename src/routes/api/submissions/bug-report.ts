import { createFileRoute } from '@tanstack/react-router'
import { handleSubmissionRequest } from '#/lib/submissions'

/** POST /api/submissions/bug-report: validation and storage live in `#/lib/submissions`. */
export const Route = createFileRoute('/api/submissions/bug-report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleSubmissionRequest({
          kind: 'bug_report',
          request,
        })
      },
    },
  },
})
