-- 2026-11-23: 1635 6th Street rent and deposit are $1,050 (were entered as $1,150).
-- Guarded by the old value so re-running is a no-op. Only touches the draft packet.
UPDATE properties SET monthly_rent = 1050, security_deposit = 1050, updated_at = datetime('now')
  WHERE id = 2 AND monthly_rent = 1150;
UPDATE lease_terms SET monthly_rent = 1050, security_deposit = 1050, updated_at = datetime('now')
  WHERE property_id = 2 AND monthly_rent = 1150;
UPDATE lease_packets
  SET data = json_set(data, '$.monthlyRent', 1050, '$.securityDeposit', 1050), updated_at = datetime('now')
  WHERE id = 1 AND status = 'draft' AND json_extract(data, '$.monthlyRent') = 1150;
