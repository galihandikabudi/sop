-- migrations/002_tiered_approval_comments_audit.sql
-- Run this ONCE in the D1 Console (dashboard) against your EXISTING
-- database. Run each numbered statement separately (paste one, Execute,
-- then the next) — do NOT run them all at once, and do not skip ahead if
-- one fails; stop and check the error first.
--
-- D1 enforces foreign keys, so "users" and "sop" can't simply be dropped
-- while sessions/sop_versions/read_confirmations still reference them.
-- This migration backs up the dependent tables' data, drops everything in
-- the right order, rebuilds the schema with the new "waka" role and
-- "menunggu_review" status, and restores the data.

-- 1. New "sop" table with the "menunggu_review" status added.
CREATE TABLE sop_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  bidang       TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  version      TEXT NOT NULL DEFAULT '1.0',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'menunggu_review', 'menunggu_persetujuan', 'berlaku', 'ditolak', 'kedaluwarsa')),
  valid_until  TEXT,
  created_by   INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2.
INSERT INTO sop_new SELECT * FROM sop;

-- 3. New "users" table with the "waka" role added.
CREATE TABLE users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('kepala_sekolah', 'waka', 'staff')),
  bidang        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4.
INSERT INTO users_new SELECT * FROM users;

-- 5. Back up the tables that reference sop/users before dropping anything.
CREATE TABLE sop_versions_backup AS SELECT * FROM sop_versions;

-- 6.
CREATE TABLE read_confirmations_backup AS SELECT * FROM read_confirmations;

-- 7. Drop dependent tables first (foreign keys point at users/sop).
DROP TABLE sessions;

-- 8.
DROP TABLE sop_versions;

-- 9.
DROP TABLE read_confirmations;

-- 10. Now sop/users are no longer referenced — safe to drop.
DROP TABLE sop;

-- 11.
DROP TABLE users;

-- 12. Rename the new tables into place.
ALTER TABLE users_new RENAME TO users;

-- 13.
ALTER TABLE sop_new RENAME TO sop;

-- 14. Rebuild sessions (empty is fine — everyone just logs in again once).
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- 15. Rebuild sop_versions and restore its data.
CREATE TABLE sop_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id     INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  version    TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT NOT NULL,
  note       TEXT,
  actor_id   INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16.
INSERT INTO sop_versions SELECT * FROM sop_versions_backup;

-- 17. Rebuild read_confirmations and restore its data.
CREATE TABLE read_confirmations (
  sop_id        INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (sop_id, user_id)
);

-- 18.
INSERT INTO read_confirmations SELECT * FROM read_confirmations_backup;

-- 19. Clean up the temporary backup tables.
DROP TABLE sop_versions_backup;

-- 20.
DROP TABLE read_confirmations_backup;

-- 21. Recreate indexes.
CREATE INDEX IF NOT EXISTS idx_sop_status ON sop(status);

-- 22.
CREATE INDEX IF NOT EXISTS idx_sop_bidang ON sop(bidang);

-- 23.
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 24. New table for the comments/discussion feature.
CREATE TABLE IF NOT EXISTS sop_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id     INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  comment    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 25.
CREATE INDEX IF NOT EXISTS idx_comments_sop ON sop_comments(sop_id);

-- 26. New table for the activity log feature.
CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id),
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 27.
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);

-- 28.
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
