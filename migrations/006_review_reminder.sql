-- 006_review_reminder.sql
--
-- Pengingat peninjauan ulang OPSIONAL — murni pengingat, tidak memengaruhi
-- status/keaktifan SOP (SOP tetap "berlaku" tanpa tenggat, sesuai migrasi
-- 004). Kepala Sekolah atau Waka bidang terkait bisa menandai sebuah SOP
-- untuk "diingatkan ditinjau lagi" pada tanggal tertentu; tanggal ini
-- murni informasional dan muncul di Beranda saat sudah dekat/lewat.
--
-- Jalankan di D1 Console.

-- 1
ALTER TABLE sop ADD COLUMN review_reminder_date TEXT;
