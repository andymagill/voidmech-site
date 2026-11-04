import type { Endpoint } from '#/lib/api/endpoint'
import { bugReport } from './bug-report'
import { crashReport } from './crash-report'
import { feedback } from './feedback'
import { newsletter } from './newsletter'

/**
 * Every POST /api/submissions/<kind> endpoint. Adding a kind means adding a
 * definition file and an entry here; the route needs no changes.
 */
const submissionEndpoints: Record<string, Endpoint> = {
  newsletter,
  feedback,
  'bug-report': bugReport,
  'crash-report': crashReport,
}

/** Looks up an endpoint by URL segment, ignoring inherited keys like `constructor`. */
export function getSubmissionEndpoint(kind: string): Endpoint | undefined {
  return Object.hasOwn(submissionEndpoints, kind) ? submissionEndpoints[kind] : undefined
}
