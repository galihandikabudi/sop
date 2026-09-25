-- migrations/003_add_preparer_checker_names.sql
-- Much simpler than migration 002 — SQLite supports ADD COLUMN directly,
-- no table rebuild needed. Run each line separately in the D1 Console.

ALTER TABLE sop ADD COLUMN preparer_name TEXT;

ALTER TABLE sop ADD COLUMN checker_name TEXT;
