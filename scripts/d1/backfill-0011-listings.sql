-- One-time backfill for migration 0011 (property_listings).
-- Lives outside migrations/ on purpose: it writes to existing rows, which
-- cf:d1:migrate blocks. Run once, after a backup and after 0011 is applied:
--
--   npm run cf:d1:backup
--   npx wrangler d1 execute property-manager-db --remote --file=scripts/d1/backfill-0011-listings.sql
--
-- Safe to re-run: listings are only inserted when missing and only
-- prescreenings with listing_id IS NULL are touched.
--
-- Data as of 2026-11-08 (property 2, "1635"):
--   Round 1: opened 2026-04-01 (property created), applications #1-#38,
--            last activity 2026-05-31, placed applicant #37 (Calla Dotson, approved).
--   Round 2: property set back to "available" 2026-11-06T15:16:36Z,
--            applications from #39 on.

-- Round 1 (closed)
INSERT INTO property_listings (property_id, label, opened_at, closed_at, placed_prescreening_id, notes, created_at, updated_at)
SELECT 2, 'Apr 2026', '2026-04-01T17:00:43.281Z', '2026-05-31T01:34:35.998Z', 37,
       'Backfilled from existing applications', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM property_listings WHERE property_id = 2 AND opened_at = '2026-04-01T17:00:43.281Z');

-- Round 2 (open)
INSERT INTO property_listings (property_id, label, opened_at, closed_at, notes, created_at, updated_at)
SELECT 2, 'Nov 2026', '2026-11-06T15:16:36.727Z', NULL,
       'Backfilled from existing applications', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM property_listings WHERE property_id = 2 AND opened_at = '2026-11-06T15:16:36.727Z');

-- Attach each prescreening to the round whose window contains its submit time.
UPDATE prescreenings
SET listing_id = (
  SELECT l.id FROM property_listings l
  WHERE l.property_id = prescreenings.property_id
    AND l.opened_at <= prescreenings.created_at
    AND (l.closed_at IS NULL OR prescreenings.created_at < l.closed_at)
  ORDER BY l.opened_at DESC
  LIMIT 1
)
WHERE listing_id IS NULL AND property_id IS NOT NULL;

-- Verification: expect 33 rows on 'Apr 2026', the rest on 'Nov 2026', 0 unassigned.
SELECT COALESCE(l.label, '(unassigned)') AS listing, COUNT(*) AS applications
FROM prescreenings p LEFT JOIN property_listings l ON l.id = p.listing_id
GROUP BY l.label;
