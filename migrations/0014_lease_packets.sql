-- E-signature lease packets. A packet is one lease plus its addenda for one
-- tenancy. While "draft" the admin edits `data` (JSON of template variables).
-- "Send" freezes the rendered document into `snapshot_html` and hashes it, so
-- every signer signs exactly the same text.
CREATE TABLE IF NOT EXISTS lease_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER REFERENCES properties(id),
  tenant_id INTEGER REFERENCES tenants(id),
  prescreening_id INTEGER REFERENCES prescreenings(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | completed | void
  data TEXT NOT NULL,
  documents TEXT NOT NULL,
  snapshot_html TEXT,
  content_hash TEXT,
  sent_at TEXT,
  completed_at TEXT,
  voided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lease_packets_status ON lease_packets(status, created_at);

-- One row per person who signs a packet. `token` is the private signing link.
CREATE TABLE IF NOT EXISTS lease_signers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id INTEGER NOT NULL REFERENCES lease_packets(id),
  role TEXT NOT NULL,          -- tenant | landlord
  slot TEXT NOT NULL,          -- tenant1, tenant2, landlord — matches template placeholders
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | signed
  viewed_at TEXT,
  consent_at TEXT,
  signed_at TEXT,
  signature_image TEXT,
  typed_name TEXT,
  initials TEXT,
  responses TEXT,
  ip TEXT,
  user_agent TEXT,
  signed_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lease_signers_packet ON lease_signers(packet_id);

-- Audit trail: created, sent, emailed, viewed, signed, completed, voided.
CREATE TABLE IF NOT EXISTS lease_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id INTEGER NOT NULL REFERENCES lease_packets(id),
  signer_id INTEGER,
  event TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lease_events_packet ON lease_events(packet_id, created_at);
