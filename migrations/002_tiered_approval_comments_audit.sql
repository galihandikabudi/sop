-- migrations/002_tiered_approval_comments_audit.sql
-- Run this ONCE in the D1 Console (dashboard) against your EXISTING
-- database — it preserves all current users and SOPs. Run each numbered
-- block separately in the Console (paste one block, Execute, then the
-- next), the same way you ran the original schema.sql.

-- Block 1: recreate "users" with the new "waka" role allowed.
CREATE TABLE users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('kepala_sekolah', 'waka', 'staff')),
  bidang        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Block 2: recreate "sop" with the new "menunggu_review" (Waka stage) status allowed.
CREATE TABLE sop_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  bidang       TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  version      TEXT NOT NULL DEFAULT '1.0',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'menunggu_review', 'menunggu_persetujuan', 'berlaku', 'ditolak', 'kedaluwarsa')),
  valid_until  TEXT,
  created_by   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO sop_new SELECT * FROM sop;
DROP TABLE sop;
ALTER TABLE sop_new RENAME TO sop;

-- Block 3: re-create indexes that were dropped along with the old tables.
CREATE INDEX IF NOT EXISTS idx_sop_status ON sop(status);
CREATE INDEX IF NOT EXISTS idx_sop_bidang ON sop(bidang);

-- Block 4: new table for the comments/discussion feature.
CREATE TABLE IF NOT EXISTS sop_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id     INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  comment    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_sop ON sop_comments(sop_id);

-- Block 5: new table for the activity log feature.
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
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
