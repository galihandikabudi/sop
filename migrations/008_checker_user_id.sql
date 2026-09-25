-- 008_checker_user_id.sql
--
-- "Nama Pemeriksa" sekarang dipilih dari akun terdaftar (Waka bidang
-- terkait, atau Kepala Sekolah) lewat dropdown, bukan ketik bebas.
-- Kolom baru `checker_user_id` menyimpan akun yang dipilih itu, supaya
-- SOP yang statusnya "menunggu_review" juga otomatis muncul di halaman
-- Tinjauan Waka milik akun yang namanya dipilih sebagai pemeriksa —
-- selain tetap muncul untuk semua Waka di bidang yang sama seperti biasa.
--
-- `checker_name` (kolom lama, teks bebas) tetap dipakai untuk ditampilkan
-- di dokumen cetak — itu catatan historis yang tidak berubah walau nanti
-- akun tersebut diganti nama/dihapus.
--
-- Jalankan di D1 Console.

-- 1
ALTER TABLE sop ADD COLUMN checker_user_id INTEGER;
