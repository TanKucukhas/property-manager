-- Seed admin user (password: admin123, bcrypt hash)
-- Generate a new hash for production!
INSERT OR IGNORE INTO admins (email, password_hash, name)
VALUES ('admin@local', '$2b$12$PruewCliitN90FRZWVK7ieQnFNGIC1oDW6/BFJTpTlmTA78IRxk6q', 'Admin');
