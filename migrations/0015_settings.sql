-- Small key/value store for app-wide settings. "house_defaults" holds the
-- default lease terms every new property starts with (JSON; edited at
-- /admin/leases/defaults). Missing row = built-in defaults in code.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
