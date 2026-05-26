ALTER TABLE properties ADD COLUMN income_multiplier REAL NOT NULL DEFAULT 2.75;
ALTER TABLE properties ADD COLUMN min_credit_score INTEGER;
ALTER TABLE properties ADD COLUMN pets_policy TEXT NOT NULL DEFAULT 'case_by_case';
ALTER TABLE properties ADD COLUMN smoking_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN sublease_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN airbnb_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN custom_requirements TEXT;
