-- Listing rounds: each time a property goes on the market it gets a new row.
-- Prescreenings point at the round they were submitted in.
CREATE TABLE IF NOT EXISTS property_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  label TEXT,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  placed_prescreening_id INTEGER,
  tenant_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_property_listings_property ON property_listings(property_id);

ALTER TABLE prescreenings ADD COLUMN listing_id INTEGER REFERENCES property_listings(id);
CREATE INDEX IF NOT EXISTS idx_prescreenings_listing ON prescreenings(listing_id);
