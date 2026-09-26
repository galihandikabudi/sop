# Sistem Manajemen SOP — SMK Muhammadiyah Todanan

Aplikasi web untuk mengelola SOP (Standard Operating Procedure) sekolah:
draft → pengajuan → persetujuan Kepala Sekolah → berlaku, lengkap dengan
riwayat versi, konfirmasi baca staf, dan dashboard kepatuhan per bidang.

**Stack**: HTML/CSS/JS statis (`/public`) + Cloudflare Pages Functions
(`/functions`, serverless API) + Cloudflare D1 (database SQLite gratis).
Tidak ada langkah build — semua file di-serve apa adanya.

## Struktur folder

```
public/            → frontend statis (yang di-deploy sebagai situs)
  index.html        halaman login
  setup.html        buat akun Kepala Sekolah pertama (sekali pakai)
  dashboard.html    beranda / ringkasan
  sop-list.html     daftar & pencarian SOP
  sop-new.html      buat draft SOP baru
  sop-detail.html   detail, edit draft, ajukan, konfirmasi baca
  approvals.html    antrean persetujuan (Kepala Sekolah)
  users.html        kelola akun staf (Kepala Sekolah)
  css/, js/

functions/api/      → API (Cloudflare Pages Functions, tiap file = 1 route)
lib/auth.js         → helper login, hash password, session
schema.sql          → skema database D1
```

Seluruh proses di bawah ini dilakukan lewat GitHub (upload biasa, tidak
perlu `git` di terminal jika tidak mau) dan dashboard Cloudflare (klik-klik
biasa) — **tidak perlu install Wrangler/CLI apa pun.**

## 1. Upload proyek ini ke GitHub

1. Buat akun [GitHub](https://github.com) jika belum punya, lalu buat repo
   baru (kosong) di [github.com/new](https://github.com/new), misalnya
   bernama `sop-muhada`.
2. Ekstrak `sop-muhada.zip` di komputer Anda.
3. Di halaman repo GitHub yang baru dibuat, klik **"uploading an existing
   file"**, lalu seret (drag-and-drop) seluruh isi folder hasil ekstrak
   (folder `public`, `functions`, `lib`, dan file `schema.sql`,
   `README.md`, `.gitignore`) ke area upload, lalu klik
   **Commit changes**.
   (Alternatif: jika terbiasa dengan Git, boleh juga `git push` seperti
   biasa — hasilnya sama.)

## 2. Buat database D1 lewat dashboard Cloudflare

1. Buat akun [Cloudflare](https://dash.cloudflare.com) (gratis) jika belum
   punya.
2. Di dashboard → **Workers & Pages** → tab **D1 SQL Database** → **Create
   Database**. Beri nama `sop-muhada-db` → **Create**.
3. Buka database yang baru dibuat → tab **Console**. Buka file
   `schema.sql` (dari folder yang Anda ekstrak) dengan text editor, salin
   seluruh isinya, tempel ke kotak Console tersebut, lalu jalankan
   (**Execute**). Ini membuat semua tabel yang dibutuhkan aplikasi.

## 3. Hubungkan repo ke Cloudflare Pages

1. Di dashboard Cloudflare → **Workers & Pages** → **Create** → tab
   **Pages** → **Connect to Git** → pilih repo `sop-muhada` yang tadi
   diupload (mungkin perlu memberi izin akses GitHub terlebih dahulu).
2. Build settings:
   - **Framework preset**: None
   - **Build command**: (kosongkan)
   - **Build output directory**: `public`
3. Klik **Save and Deploy**. Tunggu sampai statusnya sukses.

## 4. Sambungkan database ke situs

1. Buka project Pages yang baru dibuat → **Settings** → **Functions** →
   **D1 database bindings** → **Add binding**.
2. Isi **Variable name**: `DB`, lalu pilih database **sop-muhada-db** yang
   dibuat di langkah 2.
3. Simpan. Cloudflare akan otomatis men-deploy ulang situsnya (tunggu ±1
   menit).

Setelah ini, situs Anda sudah live di alamat seperti
`https://sop-muhada.pages.dev`, dan akan otomatis ter-update setiap kali
Anda mengunggah perubahan baru ke repo GitHub tersebut.

## 5. Buat akun Kepala Sekolah pertama

Buka `https://<domain-situs-anda>/setup.html` di browser — ada formulir
untuk membuat akun Kepala Sekolah pertama, tanpa perlu terminal atau
`curl`. Halaman ini otomatis terkunci begitu satu akun sudah dibuat, jadi
aman dibiarkan ada di kode. Setelah itu, login di `/index.html`, lalu
tambahkan akun staf per bidang lewat halaman **Pengguna**.

## Pembaruan: Approval Berjenjang, Komentar, Log Aktivitas, QR Cetak

**PENTING — jalankan migrasi database dulu sebelum meng-upload kode baru**,
karena kode baru mengandalkan kolom/tabel yang belum ada di database lama:

1. Dashboard Cloudflare → D1 SQL Database → buka `sop-muhada-db` → tab
   **Console**.
2. Buka file `migrations/002_tiered_approval_comments_audit.sql` dari zip
   ini. Jalankan **satu blok per satu** (ada 5 blok, dipisah komentar
   `-- Block N`) — salin satu blok, Execute, baru lanjut ke blok berikutnya,
   sama seperti waktu menjalankan `schema.sql` pertama kali.
3. Setelah semua blok berhasil, buka tab **Tables** — pastikan tabel
   `sop_comments` dan `activity_log` sudah muncul, dan tidak ada error di
   blok mana pun.
4. Baru setelah itu, upload/timpa semua file kode yang berubah ke GitHub
   (lihat daftar di bawah).

Kalau ini instalasi **baru** (belum pernah menjalankan `schema.sql` sama
sekali), langsung jalankan `schema.sql` yang sudah diperbarui — tidak perlu
file migrasi.

### 1. Approval berjenjang (Waka bidang → Kepala Sekolah)

- Di halaman **Pengguna**, Kepala Sekolah sekarang bisa membuat akun dengan
  peran **Waka Bidang** (selain Staf).
- Kalau ada akun Waka untuk suatu bidang, SOP yang diajukan staf bidang itu
  akan masuk ke antrean Waka dulu (halaman baru **Tinjauan Waka**) sebelum
  diteruskan ke antrean Kepala Sekolah. Waka bisa menyetujui (diteruskan)
  atau menolak (kembali ke draft dengan catatan).
- Kalau suatu bidang **belum punya** akun Waka, alurnya tetap seperti
  sebelumnya — langsung ke Kepala Sekolah, tidak ada yang berubah.

### 2. Komentar/diskusi

Setiap halaman Detail SOP sekarang punya kotak "Diskusi / Komentar" di
bawah isi SOP — staf lain di bidang yang sama (atau Kepala Sekolah) bisa
menulis masukan sebelum SOP diajukan, tanpa harus menunggu proses
tolak-ajukan-ulang.

### 3. Log aktivitas

Halaman baru **Log Aktivitas** (khusus Kepala Sekolah) mencatat riwayat:
pembuatan/pengubahan/penghapusan SOP, pengajuan, review Waka, pengesahan/
penolakan, komentar, dan pembuatan akun — lengkap dengan siapa dan kapan.

### 4. QR code di halaman cetak

Halaman Cetak/PDF sekarang menampilkan kode QR yang mengarah ke versi
online SOP tersebut, supaya siapa pun yang memegang salinan cetak bisa
memindai dan langsung memastikan itu masih versi terbaru. QR dibuat lewat
layanan publik gratis (api.qrserver.com) yang memerlukan koneksi internet
saat mencetak — kalau layanan itu tidak bisa diakses, tautan URL-nya
ditampilkan sebagai teks biasa.

### Berkas yang baru/berubah pada pembaruan ini

Baru: `migrations/002_tiered_approval_comments_audit.sql`, `lib/log.js`,
`functions/api/sop/[id]/waka-approve.js`, `functions/api/sop/[id]/waka-reject.js`,
`functions/api/sop/[id]/comments.js`, `functions/api/activity-log.js`,
`public/waka-review.html`, `public/js/waka-review.js`,
`public/activity-log.html`, `public/js/activity-log.js`

Berubah: `schema.sql`, `functions/api/sop/index.js`, `functions/api/sop/[id].js`,
`functions/api/sop/[id]/submit.js`, `functions/api/sop/[id]/approve.js`,
`functions/api/sop/[id]/reject.js`, `functions/api/sop/[id]/delete.js`,
`functions/api/users/index.js`, `public/js/api.js`, `public/js/sidebar.js`,
`public/js/sop-detail.js`, `public/users.html`, `public/js/users.js`,
`public/css/style.css`, `public/sop-print.html`

## Pembaruan: Nama Penyusun/Pemeriksa, Cetak PDF A4 dengan Nomor Halaman

**Migrasi database (sederhana, cuma 2 baris)** — jalankan di D1 Console
sebelum upload kode:

```sql
ALTER TABLE sop ADD COLUMN preparer_name TEXT;
```
```sql
ALTER TABLE sop ADD COLUMN checker_name TEXT;
```

(Ada juga sebagai `migrations/003_add_preparer_checker_names.sql` di zip ini.)

### Yang berubah

- **Nama Penyusun & Nama Pemeriksa**: field baru saat membuat/mengedit draft
  SOP. Nama Penyusun otomatis terisi nama Anda saat membuat draft baru
  (bisa diubah).
- **Nama Kepala Sekolah otomatis** di kolom "Disahkan oleh" pada cetakan:
  kalau SOP sudah pernah disahkan, memakai nama Kepala Sekolah yang benar-
  benar mengesahkan versi itu (dari riwayat versi); kalau belum, memakai
  nama akun Kepala Sekolah yang aktif saat ini.
- **Tulisan "Pindai untuk versi online" dihapus** dari bawah QR code —
  QR code-nya sendiri tetap ada.
- **Cetak/PDF sekarang pakai [Paged.js](https://pagedjs.org/)** — pustaka
  khusus untuk masalah ini, karena browser sebenarnya tidak mendukung
  nomor halaman ("Halaman X dari Y") secara native saat mencetak dari CSS
  biasa. Hasilnya: ukuran A4 yang presisi, margin yang benar di setiap
  halaman (termasuk halaman ke-2 dst. kalau SOP-nya panjang), dan footer
  "Halaman X dari Y" otomatis di tiap halaman. Perlu koneksi internet saat
  membuka halaman cetak (memuat Paged.js dari CDN unpkg.com).
- File baru: `public/css/print.css` (aturan tampilan cetak, termasuk aturan
  `@page` untuk ukuran A4, margin, dan nomor halaman).

### Berkas yang baru/berubah pada pembaruan ini

Baru: `migrations/003_add_preparer_checker_names.sql`, `public/css/print.css`

Berubah: `schema.sql`, `functions/api/sop/index.js`, `functions/api/sop/[id].js`,
`public/sop-new.html`, `public/js/sop-detail.js`, `public/sop-print.html`

## Pembaruan: Edit/Hapus Pengguna, Font Cetak Konsisten, Tampilan Baru

**1. Edit & hapus akun pengguna** — di halaman **Pengguna**, setiap baris kini
punya tombol **Edit** (ubah nama, email, bidang, peran, dan boleh mengatur
password baru — kosongkan kalau tidak mau ganti password) dan **Hapus**.
Ada pengaman bawaan: akun sendiri tidak bisa dihapus dari sini, dan akun
Kepala Sekolah terakhir tidak bisa dihapus/diturunkan perannya supaya tidak
ada yang terkunci dari akses admin. Perubahan/penghapusan akun tercatat di
Log Aktivitas.

Tidak perlu migrasi database baru untuk fitur ini — hanya endpoint API dan
tampilan.

**2. Font di cetak/PDF sekarang konsisten** — sebelumnya bagian judul di
header dokumen cetak memakai font serif (Source Serif 4) sedangkan bagian
isi lainnya memakai font biasa (Public Sans), sehingga terlihat beda. Semua
bagian dokumen cetak (header, judul SOP, isi, tanda tangan) sekarang
memakai satu keluarga font yang sama; pembeda antar bagian cukup dari tebal
dan ukuran huruf, bukan jenis fontnya.

**3. Tampilan aplikasi mengikuti gaya SPP Muhada** — mulai dari halaman
login, skema warna dan jenis font aplikasi ini diseragamkan dengan aplikasi
SPP Muhada (Sistem Pembayaran): biru tua/biru terang sebagai warna utama,
oranye sebagai warna aksen, font **Montserrat** untuk judul/heading dan
**Inter** untuk teks isi. **Susunan/layout tiap halaman tidak diubah** —
sidebar, kartu, tabel, dan alur kerja tetap sama seperti sebelumnya, hanya
warna dan font yang berganti. Dokumen hasil cetak/PDF (`sop-print.html`)
sengaja **tidak** ikut diubah warnanya — tetap memakai gaya dokumen resmi
hitam-putih formal agar rapi saat dicetak di atas kertas.

### Berkas yang baru/berubah pada pembaruan ini

Baru: `functions/api/users/[id].js`

Berubah: `public/users.html`, `public/js/users.js`, `public/js/activity-log.js`,
`public/css/print.css`, `public/css/style.css`, `public/index.html`,
`public/js/dashboard.js`, `public/js/sop-detail.js`, dan tag Google Fonts di
semua halaman `public/*.html` kecuali `sop-print.html`.

## Pembaruan: "Berlaku Mulai" (tanpa tanggal kedaluwarsa)

Sebelumnya, saat mengesahkan SOP, Kepala Sekolah mengisi tanggal **"Berlaku
sampai"** dan sistem menandai SOP sebagai "Perlu Ditinjau"/"Kedaluwarsa"
saat tanggal itu mendekat/lewat. Sekarang konsepnya diubah: field itu
menjadi **"Berlaku mulai"** (tanggal efektif), dan **tidak ada lagi tanggal
kedaluwarsa** — sebuah versi SOP yang sudah disahkan otomatis tetap
dianggap aktif selama belum digantikan oleh versi yang lebih baru
(pengesahan ulang). Ini sesuai alur kerja yang sebenarnya: SOP tidak
"habis masa berlaku" begitu saja, ia berlaku sampai direvisi.

Yang berubah:
- Form persetujuan (`Persetujuan`) — field diganti jadi **"Berlaku mulai"**, terisi otomatis dengan tanggal hari ini, bisa diubah kalau SOP memang baru efektif di tanggal lain (mis. awal semester depan).
- Kolom `valid_until` di database berganti nama jadi `valid_from` (lihat migrasi di bawah).
- Badge "Perlu Ditinjau"/"Kedaluwarsa" yang berbasis hitung mundur tanggal dihapus — badge kini murni mengikuti status SOP (Draft/Menunggu Review/Menunggu ACC/Berlaku/Ditolak).
- Di Beranda, kartu "Perlu Ditinjau Ulang" dan daftar "Perlu Ditinjau Segera" diganti dengan kartu **"Draft Belum Diajukan"** dan daftar **"SOP Aktif Terlama"** (informasional — menunjukkan SOP aktif yang paling lama belum direvisi, tanpa tenggat/peringatan).

### Migrasi database yang perlu dijalankan

Buka **D1 Console** → jalankan file `migrations/004_valid_until_to_valid_from.sql` (isinya cuma satu baris `ALTER TABLE sop RENAME COLUMN valid_until TO valid_from;`, D1 mendukung ini langsung tanpa perlu bongkar-pasang tabel seperti migrasi sebelumnya).

### Berkas yang baru/berubah pada pembaruan ini

Baru: `migrations/004_valid_until_to_valid_from.sql`

Berubah: `schema.sql`, `functions/api/sop/[id]/approve.js`, `functions/api/sop/index.js`,
`functions/api/dashboard.js`, `public/js/api.js`, `public/js/dashboard.js`,
`public/js/sop-list.js`, `public/js/sop-detail.js`, `public/js/approvals.js`,
`public/sop-list.html`, `public/dashboard.html`, `public/sop-print.html`.

## Pembaruan: Nomor Dokumen Resmi yang Sistematis

Sebelumnya nomor dokumen di lembar cetak (`SOP/0007/SMK-MUHADA/2026`) memakai
ID baris database — nomornya bisa bolong (draf yang ditolak/dihapus tetap
"memakai" satu angka) dan tidak menunjukkan bidang mana yang menerbitkannya.

Sekarang setiap SOP mendapat **nomor dokumen resmi** dengan format:

```
{urut 3 digit}/SOP-{KODE BIDANG}/SMK.MUHADA/{bulan romawi}/{tahun}
Contoh: 003/SOP-KUR/SMK.MUHADA/IX/2026
```

Aturannya:
- **Nomor baru dibuat hanya saat SOP pertama kali disahkan** (bukan saat draf dibuat) — jadi draf yang ditolak/dihapus tidak membuat nomor bolong.
- **Nomor bersifat permanen**: kalau SOP itu direvisi lagi di kemudian hari (naik versi), nomornya tidak berubah — hanya versinya (mis. v2.0) yang bertambah.
- **Urutan direset per bidang, per tahun** — tiap bidang mulai dari 001 lagi setiap tahun baru, tidak bercampur dengan bidang lain.
- Kode bidang: KUR (Kurikulum), KES (Kesiswaan), SARPRAS (Sarana & Prasarana), OTO (Kaprodi TKR/TO), AKL (Kaprodi AKL), BKK, TU (Tata Usaha), BEN (Bendahara Sekolah), PUB (Publikasi). Bisa diubah di `lib/docNumber.js` (objek `BIDANG_CODE`) kalau ada nama bidang baru.
- SOP yang sudah disahkan **sebelum** pembaruan ini tidak dinomori ulang — di lembar cetak, dokumen tersebut otomatis memakai nomor gaya lama sebagai cadangan, supaya dokumen yang sudah pernah dicetak/diedarkan tidak berubah nomornya.

Nomor dokumen ini juga ditampilkan di halaman detail SOP (untuk SOP yang sudah berlaku) dan di lembar cetak/PDF.

### Migrasi database yang perlu dijalankan

Buka **D1 Console** → jalankan `migrations/005_doc_number.sql` (dua pernyataan: menambah kolom `doc_number` ke tabel `sop`, dan membuat tabel `doc_number_counters` untuk penghitung urut per bidang per tahun).

### Berkas yang baru/berubah pada pembaruan ini

Baru: `lib/docNumber.js`, `migrations/005_doc_number.sql`

Berubah: `schema.sql`, `functions/api/sop/[id]/approve.js`, `public/sop-print.html`, `public/js/sop-detail.js`

## Pembaruan: Edit Akun Sendiri ("Akun Saya")

Sebelumnya, satu-satunya cara mengubah data sebuah akun adalah lewat halaman
**Pengguna** (khusus Kepala Sekolah, bisa mengedit siapa saja). Staf dan
Waka tidak punya cara untuk mengganti password atau nama mereka sendiri
sama sekali.

Sekarang setiap orang yang login — Staf, Waka, maupun Kepala Sekolah —
punya halaman **Akun Saya** (menu di sidebar, juga bisa diklik lewat kartu
nama di pojok bawah sidebar) untuk mengubah **nama** dan **password**nya
sendiri. Untuk keamanan, perubahan apa pun di halaman ini wajib
mengonfirmasi dengan **password saat ini** terlebih dulu. Email, bidang,
dan peran sengaja tidak bisa diubah dari sini — itu tetap hanya bisa lewat
halaman Pengguna oleh Kepala Sekolah, supaya tidak ada yang bisa menaikkan
hak aksesnya sendiri.

### Berkas yang baru/berubah pada pembaruan ini

Baru: `functions/api/account.js`, `public/account.html`, `public/js/account.js`

Berubah: `public/js/sidebar.js`, `public/js/activity-log.js`

## Pembaruan: Halaman Publik untuk Scan QR

Sebelumnya, QR code di dokumen cetak mengarah ke `/sop-detail.html` yang
mewajibkan login — jadi kalau ada orang luar (auditor, wali murid, tamu)
memindai QR tersebut, mereka hanya akan diarahkan ke halaman login dan
tidak bisa langsung melihat isi dokumennya.

Sekarang QR mengarah ke halaman publik baru, **`/sop-public.html`**, yang
bisa dibuka **tanpa login** oleh siapa saja. Halaman ini:
- Hanya menampilkan SOP yang berstatus **"berlaku"** — draf, yang sedang ditinjau, atau yang ditolak tidak bisa diakses lewat sini sama sekali (selalu menampilkan "tidak ditemukan").
- Menampilkan info yang memang dimaksudkan untuk dilihat publik saja: judul, nomor dokumen, bidang, versi, tanggal berlaku mulai, isi SOP, dan tiga nama tanda tangan (penyusun/pemeriksa/pengesah) — tidak ada komentar, log aktivitas, atau data akun.
- Ada banner pengingat bahwa halaman ini selalu menampilkan revisi terbaru, jadi kalau ada salinan cetak yang berbeda isinya, halaman ini yang jadi acuan.
- Ada tombol "Cetak halaman ini" (pakai print bawaan browser) buat yang mau menyimpan versi kertas sederhana; dokumen resmi ber-kop yang lengkap tetap lewat "Cetak / PDF" di halaman detail (perlu login) seperti biasa.

### Berkas yang baru/berubah pada pembaruan ini

Baru: `functions/api/public/sop/[id].js`, `public/sop-public.html`

Berubah: `public/sop-print.html` (QR sekarang mengarah ke `/sop-public.html`, bukan `/sop-detail.html`)

## Pembaruan: Pengingat Peninjauan Ulang (Opsional)

Sesuai keputusan sebelumnya, SOP yang sudah "berlaku" tidak lagi punya
tanggal kedaluwarsa paksa. Tapi kadang Kepala Sekolah/Waka tetap ingin
diingatkan untuk meninjau ulang sebuah SOP di kemudian hari (mis. awal
tahun ajaran baru) — tanpa membuatnya "kedaluwarsa" kalau lupa.

Sekarang, di halaman detail sebuah SOP yang **berlaku**, Kepala Sekolah
(untuk semua bidang) atau Waka (untuk bidang miliknya) akan melihat kartu
**"Pengingat Peninjauan"** — bisa memilih tanggal untuk diingatkan, atau
menghapus pengingat yang sudah dipasang. Ini murni pengingat: memasang atau
membiarkannya kosong **tidak mengubah status atau keaktifan SOP** sama
sekali.

Saat tanggalnya sudah dekat (≤30 hari) atau sudah lewat, SOP tersebut
otomatis muncul di kartu **"Pengingat Peninjauan"** pada halaman Beranda
(kartu ini hanya muncul kalau memang ada yang perlu ditinjau).

### Migrasi database yang perlu dijalankan

Buka **D1 Console** → jalankan `migrations/006_review_reminder.sql` (satu baris: menambah kolom `review_reminder_date` ke tabel `sop`).

### Berkas yang baru/berubah pada pembaruan ini

Baru: `migrations/006_review_reminder.sql`, `functions/api/sop/[id]/review-reminder.js`

Berubah: `schema.sql`, `functions/api/dashboard.js`, `public/js/dashboard.js`,
`public/dashboard.html`, `public/js/sop-detail.js`, `public/js/activity-log.js`

## Pembaruan: Tampilan Halaman Pengguna Dirapikan (Overlay)

Form "Tambah Akun" yang sebelumnya selalu tampil di samping tabel sekarang
jadi **overlay/modal** — muncul saat tombol **"+ Tambah Akun"** di pojok
kanan atas diklik, lalu bisa ditutup dengan tombol × atau klik di luar
kotaknya. Tabel pengguna jadi lega, satu kolom penuh.

Tombol **Edit** pada setiap baris memakai overlay yang sama; form edit itu
sekarang juga punya tombol **"Hapus Akun"** langsung di dalamnya (selain
tombol "Simpan Perubahan"), jadi tidak perlu tombol "Hapus" terpisah lagi
di tabel — semua aksi terhadap satu akun (ubah data, ubah peran termasuk
jadi Kepala Sekolah, atau hapus) terkumpul di satu tempat.

### Berkas yang berubah pada pembaruan ini

`public/users.html`, `public/js/users.js`

## Pembaruan: Kelola Bidang Sendiri (Halaman Pengaturan)

Sebelumnya daftar bidang (Kurikulum, Kesiswaan, dst.) tertulis tetap di
kode — untuk menambah/mengubah/menghapus bidang, kode aplikasinya harus
diubah dan diupload ulang. Sekarang ada halaman **Pengaturan** (khusus
Kepala Sekolah, menu baru di sidebar) untuk mengelola bidang sendiri:

- **Tambah Bidang** — nama bebas, plus kode singkatan opsional (dipakai di nomor dokumen resmi, mis. "PERPUS" untuk bidang baru "Perpustakaan"). Kalau kode dikosongkan, dibuat otomatis dari 3 huruf pertama nama bidang.
- **Edit Bidang** — ubah nama dan/atau kode. Kalau namanya diubah, seluruh akun dan SOP yang memakai nama lama otomatis ikut diperbarui ke nama baru (termasuk penghitung nomor dokumennya), jadi tidak ada data yang "nyangkut" di nama lama.
- **Hapus Bidang** — ditolak kalau masih ada akun atau SOP yang memakai bidang itu (supaya tidak ada data yang jadi yatim); pindahkan dulu akun/SOP terkait ke bidang lain baru bisa dihapus.

Dropdown bidang di halaman **Ajukan SOP Baru** dan **Pengguna** (Tambah/Edit
Akun) sekarang mengambil daftar ini secara langsung, jadi begitu bidang baru
ditambahkan, langsung muncul di semua tempat tanpa perlu update kode lagi.

### Migrasi database yang perlu dijalankan

Buka **D1 Console** → jalankan `migrations/007_bidang_table.sql` (dua pernyataan: membuat tabel `bidang`, lalu mengisi 9 bidang yang sudah ada saat ini beserta kode singkatannya masing-masing, supaya penomoran dokumen yang sudah berjalan tidak berubah).

### Berkas yang baru/berubah pada pembaruan ini

Baru: `migrations/007_bidang_table.sql`, `functions/api/bidang/index.js`,
`functions/api/bidang/[id].js`, `public/settings.html`, `public/js/settings.js`

Berubah: `schema.sql`, `lib/docNumber.js`, `public/js/api.js`, `public/js/sidebar.js`,
`public/js/activity-log.js`, `public/js/users.js`, `public/users.html`, `public/sop-new.html`

## Masukan: Menghubungkan Sistem SOP dengan SPMI

SPMI (Sistem Penjaminan Mutu Internal) di sekolah pada dasarnya bekerja
lewat siklus **PPEPP**: Penetapan → Pelaksanaan → Evaluasi → Pengendalian →
Peningkatan standar. Sistem SOP ini sudah menutupi bagian **Penetapan** dan
**Pelaksanaan** (SOP dibuat, disahkan, disosialisasikan, dan staf
mengonfirmasi baca). Yang belum ada adalah bagian **Evaluasi**,
**Pengendalian**, dan **Peningkatan** — di sinilah titik hubungnya dengan
SPMI/audit mutu internal (AMI) dan instrumen pemetaan mutu 8 SNP yang
pernah dibahas sebelumnya. Beberapa arah yang bisa dikembangkan:

1. **Kaitkan setiap SOP ke standar mutu (SNP) yang dipenuhinya.** Tambah satu field "Standar SNP terkait" saat membuat SOP (mis. Standar Isi, Standar Proses, Standar Penilaian, dst.). Nanti bisa direkap: standar mana yang sudah punya SOP pendukung, standar mana yang belum — inilah bagian "Penetapan" versi SPMI.
2. **Hasil temuan Audit Mutu Internal (AMI) ditautkan ke SOP terkait.** Kalau auditor internal menemukan ketidaksesuaian (mis. "Prosedur penerimaan siswa baru tidak dijalankan sesuai SOP"), temuan itu dicatat dan ditautkan langsung ke SOP yang bersangkutan — riwayatnya menyatu dengan riwayat versi SOP itu sendiri, bukan dokumen terpisah. Ini bagian "Evaluasi" dan "Pengendalian".
3. **Tindak lanjut (corrective action) dari hasil AMI/pemetaan mutu memicu revisi SOP.** Kalau sebuah temuan mengharuskan SOP direvisi, alurnya bisa otomatis membuat draf revisi baru dari SOP terkait — menutup siklus PPEPP sampai ke "Peningkatan" tanpa proses manual terpisah.
4. **Dashboard mutu gabungan.** Karena keduanya sama-sama aplikasi berbasis Cloudflare + D1, satu Beranda bisa menampilkan status SOP *dan* status pemetaan mutu 8 SNP berdampingan — Kepala Sekolah tidak perlu bolak-balik dua aplikasi buat melihat gambaran mutu sekolah secara utuh.

Titik masuk paling realistis untuk mulai: nomor 1 (kaitkan SOP ke standar
SNP) — perubahannya kecil (satu kolom + satu dropdown) tapi langsung
membuka jalan untuk laporan "standar mana yang sudah/belum didukung SOP",
yang biasanya jadi salah satu bukti dokumen paling dicari saat akreditasi
atau audit mutu. Kalau tertarik, saya bisa langsung buatkan.

## Pembaruan: Nama File PDF & Perbaikan Print di Perangkat Apple

**1. Nama file saat "Simpan sebagai PDF"** — browser menamai file PDF
sesuai judul halaman (`document.title`) saat tombol print/simpan diklik.
Sekarang halaman cetak SOP otomatis mengatur judul itu ke format
**"{nomor}-{kode bidang} {judul SOP}"**, misalnya:

```
001-KES SOP Penanganan Murid Terlambat
```

Kalau SOP tersebut belum punya nomor dokumen resmi (disahkan sebelum fitur
penomoran ada), sistem otomatis memakai ID SOP dan kode bidang sebagai
gantinya, supaya nama filenya tetap masuk akal.

**2. Perbaikan tampilan cetak di perangkat Apple (Safari/iOS/macOS)** —
Safari punya cara berbeda dari Chrome dalam menentukan warna latar yang
ikut dicetak: kalau tidak ditegaskan, Safari bisa membuat backdrop
abu-abu/krem di balik halaman (yang di layar cuma jadi bingkai preview)
ikut tercetak atau muncul di PDF, padahal di Chrome sudah benar putih
bersih. Sekarang ditambahkan aturan `print-color-adjust: exact` dan
latar putih tegas untuk semua elemen pembungkus halaman, khusus untuk
perangkat Apple, supaya hasil cetak/PDF-nya konsisten sama dengan preview
di layar — bukan cuma cocok di Chrome.

### Berkas yang berubah pada pembaruan ini

`public/sop-print.html`, `public/css/print.css`

## Pembaruan: Nama Pemeriksa Jadi Dropdown

Field **"Nama Pemeriksa"** di halaman **Ajukan SOP Baru** (dan saat
mengedit draf di halaman detail SOP) sekarang berupa **dropdown** —
bukan lagi ketik bebas.

**Isi dropdown dibatasi ke tingkatan Waka ke atas**: hanya akun **Waka
di bidang yang sama** dengan SOP tersebut, atau **Kepala Sekolah** —
staf tidak muncul di daftar ini. Daftarnya ikut berubah otomatis kalau
Kepala Sekolah memilih bidang lain saat membuat SOP.

Kalau sebuah draf lama sudah punya nama pemeriksa yang, misalnya, akunnya
sudah dihapus atau namanya beda dari daftar terkini, nama itu tetap
muncul sebagai pilihan (ditandai "tidak terdaftar") supaya data yang
sudah ada tidak hilang begitu saja.

### Pemeriksa yang dipilih terhubung ke akun aslinya

Selain tetap ditampilkan sebagai teks di dokumen cetak (kolom lama
`checker_name` tidak berubah), pemeriksa yang dipilih sekarang juga
disimpan sebagai tautan ke akun aslinya (`checker_user_id`). Efeknya:

- SOP yang menunggu review tetap muncul di **Tinjauan Waka** untuk semua
  Waka di bidang yang sama seperti biasa, **dan**
- SOP itu juga otomatis muncul di halaman **Tinjauan Waka milik akun yang
  namanya dipilih sebagai pemeriksa** — walaupun (dalam kasus khusus)
  akun itu bukan Waka di bidang yang sama persis.

### Migrasi database yang perlu dijalankan

Buka **D1 Console** di dashboard Cloudflare, lalu jalankan statement ini
(cukup satu):

```sql
ALTER TABLE sop ADD COLUMN checker_user_id INTEGER;
```

### Berkas yang baru/berubah pada pembaruan ini

Baru: `functions/api/users/directory.js`, `migrations/008_checker_user_id.sql`

Berubah: `schema.sql`, `functions/api/sop/index.js`, `functions/api/sop/[id].js`,
`public/sop-new.html`, `public/js/sop-detail.js`, `public/js/waka-review.js`

## Pembaruan: Instruksi Tambahan untuk AI, Kepala Sekolah Bisa Pilih Pemeriksa

Di halaman **Ajukan SOP Baru**, ada kotak teks baru **"Instruksi tambahan
untuk AI"** tepat di atas kotak isi SOP. Isi kotak ini opsional — kalau
diisi (mis. "tekankan langkah verifikasi berkas oleh Waka Kesiswaan"),
instruksi itu ikut dikirim ke AI saat tombol **"Buat Draf dengan AI"**
ditekan, supaya hasilnya lebih sesuai kebutuhan tanpa mengubah format
baku SOP (Tujuan/Ruang Lingkup/Prosedur) yang sudah ditentukan.

Selain itu, dropdown **"Nama Pemeriksa"** sudah bisa dipakai juga oleh
akun **Kepala Sekolah** saat mengajukan SOP: pilih dulu **Bidang** untuk
SOP tersebut, dropdown Pemeriksa otomatis menampilkan **Waka bidang itu**
untuk dipilih (opsional, tidak wajib seperti pada pengajuan oleh Waka).

### Berkas yang berubah pada pembaruan ini

`functions/api/sop/generate-ai.js`, `public/sop-new.html`

## Pembaruan: Pustaka SOP (Semua Guru Bisa Akses SOP yang Berlaku)

Halaman baru **"Pustaka SOP"** muncul di menu sidebar untuk **semua
pengguna yang login** — apa pun perannya (staf/guru, Waka, Kepala
Sekolah) dan bidangnya. Halaman ini menampilkan **hanya SOP yang sudah
disahkan (status "Berlaku")**, lintas bidang, lengkap dengan:

- **Pencarian judul** SOP
- **Filter Bidang** (dropdown, otomatis mengikuti daftar bidang yang
  dikelola di halaman Pengaturan)

Ini berbeda dari halaman **"Daftar SOP"** yang sudah ada, yang tetap
dibatasi ke bidang pengguna sendiri dan menampilkan semua status
(termasuk draft/pengajuan) — "Daftar SOP" untuk kerja sehari-hari
menyusun/meninjau SOP, "Pustaka SOP" untuk semua orang mencari dan
membaca SOP resmi yang berlaku.

Mengklik satu baris di Pustaka SOP membuka halaman detail SOP seperti
biasa (bisa dicetak/PDF dari sana). Untuk itu, aturan akses halaman
detail SOP juga disesuaikan: **SOP berstatus "Berlaku" sekarang bisa
dibuka siapa pun yang login, lintas bidang** — draft dan pengajuan yang
belum disahkan tetap dibatasi seperti sebelumnya.

### Berkas yang baru/berubah pada pembaruan ini

Baru: `functions/api/sop/published.js`, `public/pustaka-sop.html`, `public/js/pustaka-sop.js`

Berubah: `functions/api/sop/[id].js`, `public/js/sidebar.js`

## Pembaruan: Waka Tidak Meninjau Pengajuannya Sendiri

Kalau yang mengajukan SOP adalah seorang **Waka**, dua aturan baru berlaku:

1. **Pemeriksa wajib diisi**, dan wajib **Waka lain** (boleh dari bidang
   apa pun — karena bidang yang sama dengan pengaju biasanya cuma diisi
   satu akun Waka, yaitu pengaju itu sendiri) atau **Kepala Sekolah** —
   tidak boleh dirinya sendiri. Dropdown "Nama Pemeriksa" otomatis
   menyembunyikan pilihan yang tidak valid untuk kasus ini, dan tombol
   "Ajukan Persetujuan" akan menolak dengan pesan kalau Pemeriksa belum
   diisi dengan benar.
   - Kalau Pemeriksa yang dipilih adalah **Waka lain**, alurnya tetap sama
     seperti biasa: masuk ke **Tinjauan Waka** milik Waka tersebut.
   - Kalau Pemeriksa yang dipilih adalah **Kepala Sekolah**, tahap
     Tinjauan Waka dilewati — pengajuan langsung masuk ke antrean
     persetujuan Kepala Sekolah (karena Kepala Sekolah sekaligus jadi
     pemeriksa dan penyetuju akhir).
2. **Waka pembuat pengajuan tidak perlu (dan tidak bisa) meninjau
   pengajuannya sendiri** di halaman Tinjauan Waka — walaupun SOP itu ada
   di bidangnya sendiri, SOP itu tidak akan muncul di antrean tinjauannya.
   Ini juga ditegakkan di server, bukan cuma disembunyikan di tampilan.

### Berkas yang berubah pada pembaruan ini

`functions/api/sop/index.js`, `functions/api/sop/[id]/submit.js`,
`functions/api/sop/[id]/waka-approve.js`, `functions/api/sop/[id]/waka-reject.js`,
`public/sop-new.html`, `public/js/sop-detail.js`

## Fitur lain

- **Format teks kaya**: kotak isi SOP (saat membuat/mengedit draft) mendukung
  tebal/miring/garis bawah/daftar, plus tombol **Format Otomatis** yang
  otomatis menebalkan & memperbesar baris judul bernomor (`1. Tujuan`,
  `2. Ruang Lingkup`, dst.) tanpa mempengaruhi sub-poin seperti `3.1 …`.
  Draf dari AI otomatis diformat begitu juga.
- **Hapus SOP**: di halaman Daftar SOP dan Detail SOP. Staf hanya bisa
  menghapus draft miliknya sendiri; Kepala Sekolah bisa menghapus SOP apa
  pun.
- **Cetak / Ekspor PDF**: tombol di halaman Detail SOP membuka halaman cetak
  dengan kop "Dokumen Mutu" (nomor dokumen otomatis, bidang, versi, tanggal
  berlaku) dan kolom tanda tangan Disusun/Diperiksa/Disahkan. Gunakan dialog
  cetak browser (Ctrl/Cmd+P) lalu pilih tujuan **Save as PDF**.

## Fitur "Buat Draf dengan AI"

Di halaman **Ajukan SOP Baru**, ada tombol untuk membuat draf isi SOP otomatis
dari judul yang diketik, mengikuti gaya bahasa dan nilai brand "Muhada
Berdaya" (profesional, membangun, berlandaskan nilai keislaman/kemuhammadiyahan).
Ada dua opsi mesin AI — pilih salah satu (atau keduanya, Claude akan
diprioritaskan bila tersedia):

### Opsi gratis: Cloudflare Workers AI

Model open-source (Llama) yang dijalankan Cloudflare sendiri, kuota gratis
10.000 "neuron"/hari — untuk kebutuhan draf SOP satu sekolah biasanya lebih
dari cukup, dan **tidak perlu API key sama sekali**. Kualitas tulisannya
sedikit lebih sederhana dibanding Claude, tapi cukup memadai sebagai draf
awal yang akan Anda tinjau ulang.

1. Dashboard Cloudflare → project Pages Anda → **Settings** → **Functions**.
2. Cari bagian **Workers AI bindings** (terpisah dari D1 database bindings)
   → **Add binding**.
3. Isi **Variable name**: `AI` → Save.
4. Tunggu redeploy otomatis.

### Opsi berbayar (usage-based, sangat murah): Claude (Anthropic)

Kualitas tulisan lebih halus dan natural. Biayanya terpisah dari langganan
Claude.ai apa pun — dikenakan per token lewat API key Anthropic sendiri,
biasanya jauh di bawah beberapa ribu rupiah per bulan untuk pemakaian sekolah.

1. Buat API key di [console.anthropic.com](https://console.anthropic.com) →
   **API Keys** → **Create Key**.
2. Dashboard Cloudflare → project Pages Anda → **Settings** →
   **Environment variables** → **Add variable**.
   - Variable name: `ANTHROPIC_API_KEY`
   - Value: (tempel API key Anda)
   - Tandai sebagai **Encrypt/Secret**, environment **Production**.
3. Simpan, tunggu redeploy otomatis.

Tanpa salah satu di atas, tombol "Buat Draf dengan AI" akan menampilkan
pesan error yang menjelaskan apa yang perlu diaktifkan — fitur lain aplikasi
tetap berjalan normal. Draf yang dihasilkan AI (apa pun mesinnya) selalu
bisa dan sebaiknya diedit dulu di kotak isi SOP sebelum diajukan untuk
persetujuan.

## Alur kerja aplikasi

1. Staf bidang login → membuat **draft** SOP di bidangnya sendiri.
2. Staf mengedit draft, lalu menekan **Ajukan Persetujuan**.
3. Kepala Sekolah membuka **Antrean Persetujuan**, membaca dokumen, lalu
   **Menyetujui** (SOP menjadi versi baru berstatus *Berlaku* dengan
   tanggal masa berlaku) atau **Menolak** (kembali ke draft dengan
   catatan revisi).
4. Semua staf terkait dapat membuka SOP yang berlaku dan menandai
   **Saya telah membaca SOP ini**.
5. **Beranda** menampilkan SOP yang mendekati kedaluwarsa (< 30 hari) dan
   tingkat kepatuhan per bidang.

## Menjalankan secara lokal (opsional, perlu Node.js + Wrangler)

Proyek ini sengaja **tidak** menyertakan `wrangler.toml` di repo — kalau ada,
Cloudflare Pages akan salah mendeteksi proyek ini sebagai Worker biasa dan
mencoba menjalankan `wrangler deploy` (bukan build Pages statis), yang akan
gagal. Kalau Anda ingin coba jalankan di komputer sendiri, buat file
`wrangler.toml` sendiri (jangan commit ke repo yang terhubung ke Pages),
isinya:

```toml
name = "sop-muhada"
compatibility_date = "2026-09-01"

[[d1_databases]]
binding = "DB"
database_name = "sop-muhada-db"
database_id = "<database_id dari dashboard D1>"
```

lalu jalankan:

```
npm install -g wrangler
wrangler pages dev public
```

## Pengembangan lanjutan yang bisa ditambahkan

- Ekspor SOP ke PDF.
- Notifikasi email/WhatsApp saat SOP mendekati kedaluwarsa.
- Kaitan setiap SOP ke indikator 8 Standar Nasional Pendidikan (SNP), agar
  bisa disandingkan dengan instrumen pemetaan mutu yang sudah ada.
- Reset password mandiri (saat ini reset dilakukan manual oleh Kepala
  Sekolah via database).
