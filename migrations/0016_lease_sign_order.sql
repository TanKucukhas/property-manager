-- Who signs first and how the tenant gets the document.
-- sign_order: landlord_first | tenant_first
-- tenant_delivery: email (link emailed) | in_person (manager opens the link on a device with the tenant)
ALTER TABLE lease_packets ADD COLUMN sign_order TEXT NOT NULL DEFAULT 'tenant_first';
ALTER TABLE lease_packets ADD COLUMN tenant_delivery TEXT NOT NULL DEFAULT 'email';
