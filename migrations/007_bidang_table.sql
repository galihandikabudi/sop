-- 007_bidang_table.sql
--
-- Sebelumnya daftar bidang (Kurikulum, Kesiswaan, dst.) ditulis tetap
-- ("hardcode") di kode. Sekarang disimpan di tabel `bidang`, supaya Kepala
-- Sekolah bisa menambah/mengubah nama/menghapus bidang sendiri lewat
-- halaman Pengaturan, tanpa perlu mengubah kode.
--
-- `code` = kode singkatan untuk nomor dokumen resmi (lihat lib/docNumber.js),
-- mis. "KUR" untuk Kurikulum. Kalau dikosongkan, sistem membuat singkatan
-- otomatis dari 3 huruf pertama nama bidang.
--
-- Data bidang yang sudah ada di sistem (dan kode singkatannya yang selama
-- ini dipakai untuk nomor dokumen) dipindahkan ke tabel ini supaya
-- penomoran tidak berubah untuk bidang yang sudah ada.
--
-- Jalankan satu per satu di D1 Console.

-- 1
CREATE TABLE IF NOT EXISTS bidang (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  code       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2
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
