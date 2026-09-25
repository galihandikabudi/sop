-- schema.sql — full schema for a FRESH install.
-- If you already have a live database, do NOT re-run this file — instead
-- run migrations/002_tiered_approval_comments_audit.sql once (see README).

-- Daftar bidang bisa dikelola Kepala Sekolah lewat halaman Pengaturan
-- (tambah/ubah nama/hapus). `code` dipakai untuk kode singkatan di nomor
-- dokumen resmi (lib/docNumber.js) — kalau kosong, dibuat otomatis dari
-- 3 huruf pertama nama bidang.
CREATE TABLE IF NOT EXISTS bidang (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  code       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO bidang (name, code) VALUES
  ('Kurikulum', 'KUR'),
  ('Kesiswaan', 'KES'),
  ('Sarana & Prasarana', 'SARPRAS'),
  ('Kaprodi TKR/TO', 'OTO'),
  ('Kaprodi AKL', 'AKL'),
  ('BKK', 'BKK'),
  ('Tata Usaha', 'TU'),
  ('Bendahara Sekolah', 'BEN'),
  ('Publikasi', 'PUB');

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('kepala_sekolah', 'waka', 'staff')),
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
               CHECK (status IN ('draft', 'menunggu_review', 'menunggu_persetujuan', 'berlaku', 'ditolak', 'kedaluwarsa')),
  valid_from   TEXT,                -- ISO date; tanggal mulai berlaku, diisi saat disahkan.
                                     -- Tidak ada tanggal kedaluwarsa: sebuah versi tetap
                                     -- aktif selama belum digantikan versi yang lebih baru.
  doc_number   TEXT,                -- Nomor dokumen resmi, mis. "003/SOP-KUR/SMK.MUHADA/IX/2026".
                                     -- Dibuat sekali saat pertama disahkan, tidak berubah lagi
                                     -- walau direvisi (lihat lib/docNumber.js).
  review_reminder_date TEXT,        -- ISO date opsional; murni pengingat "tinjau lagi pada
                                     -- tanggal ini", tidak memengaruhi status/keaktifan SOP.
  created_by   INTEGER NOT NULL REFERENCES users(id),
  preparer_name TEXT,               -- Nama Penyusun (defaults to created_by's name if blank)
  checker_name  TEXT,               -- Nama Pemeriksa (teks, untuk ditampilkan di dokumen cetak)
  checker_user_id INTEGER REFERENCES users(id), -- akun yang dipilih sebagai pemeriksa;
                                     -- dipakai supaya SOP ini juga muncul di halaman
                                     -- Tinjauan Waka milik akun tsb.
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

CREATE TABLE IF NOT EXISTS sop_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id     INTEGER NOT NULL REFERENCES sop(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  comment    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id),
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,   -- create | update | submit | waka_approve | waka_reject | approve | reject | delete | comment | user_create
  entity_type TEXT NOT NULL,   -- sop | user
  entity_id   INTEGER,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Penghitung urut nomor dokumen, per bidang per tahun (lihat lib/docNumber.js).
CREATE TABLE IF NOT EXISTS doc_number_counters (
  bidang    TEXT NOT NULL,
  year      INTEGER NOT NULL,
  last_seq  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bidang, year)
);

CREATE INDEX IF NOT EXISTS idx_sop_status ON sop(status);
CREATE INDEX IF NOT EXISTS idx_sop_bidang ON sop(bidang);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_sop ON sop_comments(sop_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
