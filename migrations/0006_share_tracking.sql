CREATE TABLE IF NOT EXISTS share_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id INTEGER NOT NULL REFERENCES application_shares(id),
  visitor_id TEXT NOT NULL,
  furthest_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  first_opened_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  completed_at TEXT,
  submitted_prescreening_id INTEGER REFERENCES prescreenings(id),
  UNIQUE(share_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_share_visits_share ON share_visits(share_id);

ALTER TABLE application_shares ADD COLUMN archived_at TEXT;
