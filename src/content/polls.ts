/**
 * Community polls. Pure data and helpers, shared by the Worker (which enforces
 * the rules) and the browser (which renders them), so nothing here may import
 * server code.
 *
 * To reset a poll, add a new one with a new `id` and give the old one a
 * `closesAt`: votes are keyed by poll id, so the new poll starts at zero and
 * the old one shows as a past result. Never reuse or rename an id, and never
 * change `VOTE_SALT` while a poll is open (every voter would be able to vote again).
 */

export type PollTint = 'orange' | 'cyan' | 'green'

export type PollOption = {
  /** Stable id stored with every vote. Never change it once votes exist. */
  id: string
  kicker: string
  title: string
  body: string
  tint: PollTint
}

export type Poll = {
  id: string
  question: string
  description: string
  /** ISO 8601 instant. Voting is rejected before this. */
  opensAt: string
  /** ISO 8601 instant, or null while the poll has no end date. */
  closesAt: string | null
  /** Hours before the same voter may vote again. Defaults to 24. */
  cooldownHours?: number
  options: ReadonlyArray<PollOption>
}

export type PollStatus = 'upcoming' | 'open' | 'closed'

export const DEFAULT_COOLDOWN_HOURS = 24

export const polls: ReadonlyArray<Poll> = [
  {
    id: 'next-feature-1',
    question: 'Vote on the next feature',
    description:
      'Community feedback is reviewed weekly and mapped into scoped work. Pick the feature you want prioritised next.',
    opensAt: '2026-11-04T00:00:00Z',
    closesAt: null,
    options: [
      {
        id: 'station-economy',
        kicker: 'Feature 1',
        title: 'Station economy layer',
        body: 'Add recipe costs, meaningful resource spending, and tighter economic decision pressure around mining returns.',
        tint: 'orange',
      },
      {
        id: 'fleet-ownership',
        kicker: 'Feature 2',
        title: 'Ship fabrication and fleet ownership',
        body: 'Own multiple ships, transfer between frames, and expand progression from one craft into fleet-level play.',
        tint: 'cyan',
      },
      {
        id: 'dock-in-place-editing',
        kicker: 'Feature 3',
        title: 'Dock-in-place editing',
        body: 'Open build mode around your current in-world ship, edit on-site, then return to action without full reset.',
        tint: 'green',
      },
    ],
  },
]

export function getPoll(id: string): Poll | undefined {
  return polls.find((poll) => poll.id === id)
}

export function pollStatus(poll: Poll, now: Date): PollStatus {
  const time = now.getTime()
  if (time < Date.parse(poll.opensAt)) return 'upcoming'
  if (poll.closesAt !== null && time >= Date.parse(poll.closesAt)) return 'closed'
  return 'open'
}

export function cooldownMs(poll: Poll): number {
  return (poll.cooldownHours ?? DEFAULT_COOLDOWN_HOURS) * 60 * 60 * 1000
}

/**
 * The poll to feature on the roadmap: the open one (latest first), else the next
 * to open, else the most recently closed.
 */
export function currentPoll(all: ReadonlyArray<Poll>, now: Date): Poll | undefined {
  const byStatus = (status: PollStatus) =>
    all.filter((poll) => pollStatus(poll, now) === status)
  const byOpens = (a: Poll, b: Poll) => Date.parse(b.opensAt) - Date.parse(a.opensAt)

  return (
    byStatus('open').sort(byOpens)[0] ??
    byStatus('upcoming').sort((a, b) => byOpens(b, a))[0] ??
    byStatus('closed').sort(byOpens)[0]
  )
}
