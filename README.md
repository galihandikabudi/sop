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
