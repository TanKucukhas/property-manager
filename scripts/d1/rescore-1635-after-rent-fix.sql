-- 2026-11-23: re-score 1635 applications after rent correction $1,150 → $1,050 (rent-affected rows only).
UPDATE prescreenings SET score = 37, updated_at = datetime('now') WHERE id = 4 AND score = 27;
UPDATE prescreenings SET score = 45, updated_at = datetime('now') WHERE id = 12 AND score = 40;
UPDATE prescreenings SET score = 55, updated_at = datetime('now') WHERE id = 19 AND score = 50;
UPDATE prescreenings SET score = 37, updated_at = datetime('now') WHERE id = 20 AND score = 27;
UPDATE prescreenings SET score = 50, updated_at = datetime('now') WHERE id = 21 AND score = 40;
UPDATE prescreenings SET score = 50, updated_at = datetime('now') WHERE id = 23 AND score = 40;
UPDATE prescreenings SET score = 45, updated_at = datetime('now') WHERE id = 29 AND score = 35;
UPDATE prescreenings SET score = 45, updated_at = datetime('now') WHERE id = 41 AND score = 40;
UPDATE prescreenings SET score = 40, updated_at = datetime('now') WHERE id = 42 AND score = 30;
UPDATE prescreenings SET score = 43, updated_at = datetime('now') WHERE id = 56 AND score = 38;
