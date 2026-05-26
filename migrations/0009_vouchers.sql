ALTER TABLE properties ADD COLUMN accepts_vouchers INTEGER NOT NULL DEFAULT 0;

ALTER TABLE prescreenings ADD COLUMN using_voucher TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_agency TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_bedroom_size TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_expiration TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_approved_rent REAL;
ALTER TABLE prescreenings ADD COLUMN voucher_tenant_portion REAL;
ALTER TABLE prescreenings ADD COLUMN voucher_caseworker_name TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_caseworker_phone TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_caseworker_email TEXT;
ALTER TABLE prescreenings ADD COLUMN voucher_has_rfta TEXT;
