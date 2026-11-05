/**
 * Option lists for the bug-report form. Plain constants (no server imports) so
 * the client form and the server validator share one source of truth.
 */
export const BUG_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const

export type BugSeverity = (typeof BUG_SEVERITIES)[number]
