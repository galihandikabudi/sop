-- 009_bidang_jabatan_label.sql
--
-- Sebagian bidang punya pemegang jabatan yang bukan "Waka" secara harfiah
-- (mis. Tata Usaha dikepalai "Kepala Tata Usaha", bukan "Waka Tata Usaha";
-- Bendahara Sekolah cukup disebut "Bendahara"; BKK dikoordinasi
-- "Koordinator BKK"). Kolom baru `jabatan_label` di tabel `bidang` membiarkan
-- Kepala Sekolah mengatur sebutan yang benar per bidang lewat halaman
-- Pengaturan, dan sebutan itu dipakai di mana pun aplikasi sebelumnya
-- menampilkan "Waka {bidang}" (dropdown Nama Pemeriksa, sidebar, dokumen
-- cetak). Kalau dibiarkan kosong, tampilannya tetap "Waka {bidang}" seperti
-- sebelumnya — jadi aman dijalankan tanpa perlu mengisi apa pun dulu.
--
-- Jalankan di D1 Console.

-- 1
ALTER TABLE bidang ADD COLUMN jabatan_label TEXT;
