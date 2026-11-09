-- Optional admin feedback for a re-analysis ("rent is negotiable", "income was corrected", …).
ALTER TABLE ai_jobs ADD COLUMN instructions TEXT;
