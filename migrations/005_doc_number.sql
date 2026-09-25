-- 005_doc_number.sql
--
-- Nomor dokumen resmi (format: 003/SOP-KUR/SMK.MUHADA/IX/2026), dibuat
-- otomatis saat SOP PERTAMA KALI disahkan (bukan saat draf dibuat), supaya
-- urutannya tidak bolong akibat draf yang ditolak/dihapus. Nomor ini
-- disimpan permanen di kolom `doc_number` dan tidak berubah lagi walau SOP
-- direvisi ke versi berikutnya.
--
-- `doc_number_counters` menyimpan penghitung urut per bidang per tahun
-- (di-reset otomatis tiap tahun baru karena kuncinya ikut menyertakan
-- tahun).
--
-- Jalankan satu per satu di D1 Console.

-- 1
ALTER TABLE sop ADD COLUMN doc_number TEXT;

-- 2
CREATE TABLE IF NOT EXISTS doc_number_counters (
  bidang    TEXT NOT NULL,
  year      INTEGER NOT NULL,
  last_seq  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bidang, year)
);
