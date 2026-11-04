import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import type { Poll, PollOption, PollTint } from '#/content/polls'
import { percentOf, type PollState } from '#/lib/votes'
import { Button } from './ui/button'
import { Turnstile } from './Turnstile'
import { TURNSTILE_FIELD, submitLabel, useVerifiedSubmit } from './use-verified-submit'

/**
 * One poll: the ballot, the voter's restrictions and the results.
 *
 * Everything the visitor may do comes from `GET /api/votes/:id` (the server
 * decides who has voted, from their network), so the first render is a
 * disabled ballot and the real state arrives after mount. A vote's response
 * carries the results, which are shown at once and cached in localStorage so
 * the next visit paints them before the request returns. The request always
 * runs and wins.
 */

const CACHE_PREFIX = 'vm-poll:'

type Cached = { state: PollState; savedAt: string }

function readCache(pollId: string): Cached | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + pollId)
    if (!raw) return null
    const cached = JSON.parse(raw) as Cached
    return cached?.state?.poll?.id === pollId && typeof cached.savedAt === 'string' ? cached : null
  } catch {
    return null
  }
}

function writeCache(state: PollState) {
  try {
    const cached: Cached = { state, savedAt: new Date().toISOString() }
    window.localStorage.setItem(CACHE_PREFIX + state.poll.id, JSON.stringify(cached))
  } catch {
    // Storage can be blocked or full; the cache is only a convenience.
  }
}

const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

function formatWhen(iso: string | null | undefined): string {
  const time = iso ? Date.parse(iso) : Number.NaN
  return Number.isNaN(time) ? 'later' : formatter.format(time)
}

function When({ iso }: { iso: string | null }) {
  return iso ? <time dateTime={iso}>{formatWhen(iso)}</time> : <>later</>
}

const TINT: Record<PollTint, string> = {
  orange: 'text-[var(--vm-orange)]',
  cyan: 'text-[var(--vm-cyan)]',
  green: 'text-[var(--vm-green)]',
}

type VoteResponse = Partial<PollState> & { error?: string; code?: string }

const COOLDOWN_NOTE =
  'If you share a connection with other people (home, school, office or a mobile network), one of them may have voted.'

type HeadingLevel = 3 | 4

/**
 * `headingLevel` is the level of the option titles and the results heading;
 * pass 4 when the poll sits under its own `h3`.
 */
export function PollVote({ poll, headingLevel = 3 }: { poll: Poll; headingLevel?: HeadingLevel }) {
  const [state, setState] = useState<PollState | null>(null)
  /** Set while `state` came from localStorage and the server has not confirmed it yet. */
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [justVoted, setJustVoted] = useState<PollOption | null>(null)
  const [focusResults, setFocusResults] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/votes/${poll.id}`, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(String(response.status))
      const fresh = (await response.json()) as PollState
      setState(fresh)
      setSavedAt(null)
      setLoadFailed(false)
      writeCache(fresh)
    } catch {
      setLoadFailed(true)
    }
  }, [poll.id])

  useEffect(() => {
    const cached = readCache(poll.id)
    if (cached) {
      setState(cached.state)
      setSavedAt(cached.savedAt)
    }
    setNow(Date.now())
    void load()
  }, [poll.id, load])

  // Re-enable the ballot the moment the cooldown ends, without a reload.
  const nextVoteAt = state?.voter.nextVoteAt ?? null
  useEffect(() => {
    if (!nextVoteAt) return
    const wait = Date.parse(nextVoteAt) - Date.now()
    if (wait <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(wait + 500, 2_147_000_000))
    return () => clearTimeout(timer)
  }, [nextVoteAt])

  // After a vote, move focus to the results so keyboard and screen reader users land on them.
  useEffect(() => {
    if (focusResults && resultsRef.current) {
      resultsRef.current.focus()
      setFocusResults(false)
    }
  }, [focusResults, state])

  const accept = useCallback((next: PollState) => {
    setState(next)
    setSavedAt(null)
    setLoadFailed(false)
    setNow(Date.now())
    writeCache(next)
  }, [])

  const { turnstile, busy, error, setError, start, submit } = useVerifiedSubmit(async (token) => {
    let response: Response
    try {
      response = await fetch(`/api/votes/${poll.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ option_id: selected, ...(token ? { [TURNSTILE_FIELD]: token } : {}) }),
      })
    } catch {
      throw new Error('Network error. Check your connection and try again.')
    }

    let data: VoteResponse = {}
    try {
      data = (await response.json()) as VoteResponse
    } catch {
      // A non-JSON error body (a gateway page) falls through to the generic messages.
    }

    if (response.ok && data.poll && data.voter) {
      accept(data as PollState)
      setJustVoted(poll.options.find((option) => option.id === selected) ?? null)
      setFocusResults(true)
      return
    }

    if (response.status === 429 && data.code === 'cooldown' && data.poll && data.voter) {
      accept(data as PollState)
      setFocusResults(true)
      throw new Error(
        `You have already voted in this poll recently. You can vote again after ${formatWhen(data.voter.nextVoteAt)}. ${COOLDOWN_NOTE}`,
      )
    }
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after'))
      throw new Error(
        `Too many attempts. Wait ${wait > 0 ? `${wait} seconds` : 'a minute'} and try again.`,
      )
    }
    if (response.status === 409) {
      void load() // The poll opened or closed since this page loaded.
    }
    throw new Error(data.error ?? 'Your vote could not be counted. Try again.')
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) {
      setError('Pick an option first.')
      fieldsetRef.current?.querySelector('input')?.focus()
      return
    }
    setJustVoted(null)
    submit()
  }

  const status = state?.poll.status
  const voted = state?.voter.hasVoted ?? false
  const canVote =
    status === 'open' && (nextVoteAt === null || Date.parse(nextVoteAt) <= now) && state !== null
  const showForm = state === null || status === 'upcoming' || canVote
  const results = state?.results ?? null
  const loading = state === null && !loadFailed
  const ballotLocked = !canVote || busy !== null

  return (
    <div aria-busy={loading || busy !== null}>
      <div aria-live="polite">
        {loading && (
          <p role="status" className="m-0 mb-4 text-sm text-[rgba(225,230,232,0.75)]">
            Checking your ballot…
          </p>
        )}
        {status === 'upcoming' && (
          <p className="m-0 mb-4 text-sm text-[var(--vm-orange)]">
            Voting opens <When iso={state?.poll.opensAt ?? null} />.
          </p>
        )}
        {status === 'closed' && (
          <p className="m-0 mb-4 text-sm text-[var(--vm-orange)]">
            Voting closed <When iso={state?.poll.closesAt ?? null} />. Final results below.
          </p>
        )}
        {justVoted && (
          <p className="m-0 mb-4 text-sm text-[var(--vm-green)]">
            Vote counted for “{justVoted.title}”.
            {state?.voter.nextVoteAt && (
              <> You can vote again after <When iso={state.voter.nextVoteAt} />.</>
            )}
          </p>
        )}
        {!justVoted && voted && status === 'open' && !canVote && (
          <p className="m-0 mb-4 text-sm text-[rgba(225,230,232,0.85)]">
            You voted from this network. You can vote again after <When iso={nextVoteAt} />.
          </p>
        )}
        {loadFailed && (
          <p className="m-0 mb-4 text-sm text-[var(--vm-red)]">
            {state
              ? `Could not refresh this poll. Showing results saved ${formatWhen(savedAt)}.`
              : 'Could not load this poll.'}{' '}
            <button type="button" onClick={() => void load()} className="underline">
              Try again
            </button>
          </p>
        )}
        {savedAt && !loadFailed && (
          <p className="m-0 mb-4 text-xs text-[rgba(225,230,232,0.6)]">
            Showing results saved {formatWhen(savedAt)}. Refreshing…
          </p>
        )}
      </div>

      {showForm && (
        <form onSubmit={onSubmit} onFocus={start} onInput={start}>
          <fieldset ref={fieldsetRef} disabled={ballotLocked} className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{poll.question}</legend>
            <div className="grid gap-4 md:grid-cols-3">
              {poll.options.map((option) => (
                <OptionCard
                  key={option.id}
                  poll={poll}
                  option={option}
                  level={headingLevel}
                  checked={selected === option.id}
                  onSelect={() => {
                    setSelected(option.id)
                    setError(null)
                  }}
                />
              ))}
            </div>
          </fieldset>

          {busy === 'verifying' && (
            <p role="status" className="m-0 mt-4 text-center text-xs text-[rgba(225,230,232,0.75)]">
              Running a quick human check…
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <Button
              type="submit"
              disabled={ballotLocked}
              className="uppercase tracking-[0.2em]"
            >
              {submitLabel('Cast vote', busy)}
            </Button>
          </div>
        </form>
      )}

      {/* Always mounted: the widget needs its container to exist when the page loads. */}
      <Turnstile control={turnstile} />

      {error && (
        <p role="alert" className="m-0 mt-4 text-center text-sm text-[var(--vm-red)]">
          {error}
        </p>
      )}

      {results && (
        <Results
          poll={poll}
          results={results}
          votedOptionId={state?.voter.optionId ?? null}
          headingRef={resultsRef}
          level={headingLevel}
          spaced={showForm}
        />
      )}
    </div>
  )
}

function OptionCard({
  poll,
  option,
  level,
  checked,
  onSelect,
}: {
  poll: Poll
  option: PollOption
  level: HeadingLevel
  checked: boolean
  onSelect: () => void
}) {
  const Heading = `h${level}` as const

  return (
    <label
      className={`block cursor-pointer border p-5 transition has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70 ${
        checked
          ? 'border-[var(--vm-cyan)] bg-[rgba(34,224,240,0.08)]'
          : 'border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] hover:border-[var(--vm-cyan)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name={`${poll.id}-vote`}
          value={option.id}
          checked={checked}
          onChange={onSelect}
          className="mt-1 h-4 w-4 accent-[var(--vm-cyan)]"
        />
        <div className="flex-1">
          <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TINT[option.tint]}`}>
            {option.kicker}
          </p>
          <Heading className="mt-3 font-mono text-xl tracking-[0.04em] text-[var(--vm-white)]">
            {option.title}
          </Heading>
          <p className="mt-3 text-sm leading-7 text-[rgba(225,230,232,0.8)]">{option.body}</p>
        </div>
      </div>
    </label>
  )
}

function Results({
  poll,
  results,
  votedOptionId,
  headingRef,
  level,
  spaced,
}: {
  poll: Poll
  results: NonNullable<PollState['results']>
  votedOptionId: string | null
  headingRef: RefObject<HTMLHeadingElement | null>
  level: HeadingLevel
  spaced: boolean
}) {
  const Heading = `h${level}` as const

  return (
    <section aria-labelledby={`${poll.id}-results`} className={spaced ? 'mt-8' : 'mt-2'}>
      <Heading
        id={`${poll.id}-results`}
        ref={headingRef}
        tabIndex={-1}
        className="m-0 font-mono text-lg tracking-[0.04em] text-[var(--vm-cyan)] outline-none"
      >
        Results
      </Heading>
      <p className="m-0 mt-1 text-xs text-[rgba(225,230,232,0.6)]">
        {results.total} {results.total === 1 ? 'vote' : 'votes'} in total
      </p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0">
        {poll.options.map((option) => {
          const count = results.counts[option.id] ?? 0
          const percent = percentOf(count, results.total)
          return (
            <li key={option.id} className="border border-[var(--vm-slate)] bg-[rgba(10,20,32,0.8)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm text-[var(--vm-white)]">
                  {option.title}
                  {option.id === votedOptionId && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-[var(--vm-green)]">
                      Your vote
                    </span>
                  )}
                </span>
                <span className="text-sm text-[rgba(225,230,232,0.8)]">
                  {count} {count === 1 ? 'vote' : 'votes'} · {percent}%
                </span>
              </div>
              <div aria-hidden="true" className="mt-3 h-2 bg-[var(--vm-slate)]">
                <div
                  className="h-2 bg-[var(--vm-cyan)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
