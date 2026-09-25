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
