-- AI analysis queue. The admin panel queues a job; a runner on our own
-- machine (Claude Code / Codex CLI with subscription login) claims it,
-- runs the prompt and posts the JSON result back.
CREATE TABLE IF NOT EXISTS ai_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescreening_id INTEGER NOT NULL REFERENCES prescreenings(id),
  provider TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  result TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_prescreening ON ai_jobs(prescreening_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status, requested_at);

-- Last time a runner polled, so the admin panel can show whether it is online.
CREATE TABLE IF NOT EXISTS ai_runner_heartbeat (
  id INTEGER PRIMARY KEY,
  last_seen_at TEXT NOT NULL,
  providers TEXT,
  info TEXT
);
