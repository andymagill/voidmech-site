-- Crash report triage and de-duplication (docs/integrations/crash-reports.md).
-- Additive: the live Worker keeps working while this applies.

-- 1 when the reported version has no file in content/releases (a modded,
-- pirated or fabricated build, or a release not published yet). Stored anyway;
-- triage filters on it.
ALTER TABLE crash_reports ADD COLUMN unknown_version INTEGER NOT NULL DEFAULT 0;

-- Per-install de-duplication: "has this install already reported this crash in
-- the last 24 hours?" is answered from this index without scanning the table.
CREATE INDEX IF NOT EXISTS idx_crash_reports_install_fingerprint
ON crash_reports(install_hash, fingerprint, created_at DESC);
