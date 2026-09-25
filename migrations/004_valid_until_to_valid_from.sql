-- 004_valid_until_to_valid_from.sql
--
-- Perubahan konsep: SOP tidak lagi punya "tanggal kedaluwarsa" yang
-- memaksa peninjauan ulang. Sebuah versi SOP yang sudah disahkan dianggap
-- tetap aktif selamanya selama belum ada versi yang lebih baru
-- menggantikannya. Kolom `valid_until` (tanggal berlaku SAMPAI) diganti
-- menjadi `valid_from` (tanggal berlaku MULAI / tanggal efektif).
--
-- SQLite/D1 mendukung RENAME COLUMN secara langsung (tidak perlu bongkar
-- tabel seperti migrasi 002). Jalankan satu per satu di D1 Console.

-- 1
ALTER TABLE sop RENAME COLUMN valid_until TO valid_from;
