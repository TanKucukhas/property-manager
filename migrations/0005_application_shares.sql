CREATE TABLE IF NOT EXISTS application_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_token TEXT NOT NULL UNIQUE,
  share_type TEXT NOT NULL DEFAULT 'direct',
  property_id INTEGER REFERENCES properties(id),
  recipient_name TEXT,
  lead_source TEXT,
  source_profile TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_application_shares_token ON application_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_application_shares_property ON application_shares(property_id);

ALTER TABLE prescreenings ADD COLUMN share_id INTEGER REFERENCES application_shares(id);
CREATE INDEX IF NOT EXISTS idx_prescreenings_share ON prescreenings(share_id);
