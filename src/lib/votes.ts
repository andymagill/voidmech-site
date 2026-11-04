import type { PollStatus } from '#/content/polls'

/**
 * The shape of every vote API response, shared by the Worker and the browser.
 * Pure types and helpers only: this file ends up in the client bundle.
 */

export type PollState = {
  poll: {
    id: string
    status: PollStatus
    opensAt: string
    closesAt: string | null
  }
  voter: {
    hasVoted: boolean
    /** Option of the voter's most recent vote. */
    optionId: string | null
    votedAt: string | null
    /** When this voter may vote again; null if they never voted. May be in the past. */
    nextVoteAt: string | null
    /** True when the poll is open and the cooldown has elapsed. */
    canVote: boolean
  }
  /** Null for people who have not voted in a poll that is still open (or not yet open). */
  results: PollResults | null
}

export type PollResults = {
  total: number
  counts: Record<string, number>
}

/** Whole-number percentage of `count` in `total`; 0 when there are no votes. */
export function percentOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

/** Tallies keyed by every option id, with zeros filled in for options nobody picked. */
export function normalizeCounts(
  optionIds: ReadonlyArray<string>,
  rows: ReadonlyArray<{ option_id: string; votes: number }>,
): PollResults {
  const counts: Record<string, number> = Object.fromEntries(optionIds.map((id) => [id, 0]))
  let total = 0
  for (const row of rows) {
    // A row for an option removed from the config is ignored rather than shown.
    if (!(row.option_id in counts)) continue
    counts[row.option_id] = row.votes
    total += row.votes
  }
  return { total, counts }
}
