-- schema.sql
-- Run once against your Cloudflare D1 database:
--   wrangler d1 execute sop-muhada-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('kepala_sekolah', 'staff')),
  bidang        TEXT,               -- NULL for kepala_sekolah (sees semua bidang)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sop (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  bidang       TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  version      TEXT NOT NULL DEFAULT '1.0',
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'menunggu_persetujuan', 'berlaku', 'ditolak', 'kedaluwarsa')),
  valid_until  TEXT,                -- ISO date; NULL until disahkan
  created_by   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sop_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id     INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  version    TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT NOT NULL,
  note       TEXT,
  actor_id   INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS read_confirmations (
  sop_id        INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (sop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_status ON sop(status);
CREATE INDEX IF NOT EXISTS idx_sop_bidang ON sop(bidang);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
