-- Pre-production schema. Squashed until the production database holds data
-- worth keeping (see README "Database migrations"); after that, add 0002_*.

-- Messages from people: newsletter opt-ins, feedback, bug reports.
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('newsletter', 'feedback', 'bug_report')),
  email TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_kind_created_at
ON submissions(kind, created_at DESC);

-- One newsletter row per address. Inserts use
-- `ON CONFLICT(email) WHERE kind = 'newsletter' DO NOTHING`.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_newsletter_email
ON submissions(email) WHERE kind = 'newsletter';

-- Automated crash reports sent by the game client.
CREATE TABLE IF NOT EXISTS crash_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  version TEXT NOT NULL,
  build TEXT,
  platform TEXT NOT NULL,
  os TEXT,
  gpu TEXT,
  exception TEXT NOT NULL,
  stack TEXT,
  log_tail TEXT,
  install_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crash_reports_fingerprint_created_at
ON crash_reports(fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crash_reports_version_created_at
ON crash_reports(version, created_at DESC);

-- Roadmap votes. Polls and options are defined in src/content/polls.ts;
-- voter_hash is an HMAC of the voter's IP and the poll id, never the raw IP.
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_votes_poll_option
ON votes(poll_id, option_id);

CREATE INDEX IF NOT EXISTS idx_votes_poll_voter_created_at
ON votes(poll_id, voter_hash, created_at DESC);
