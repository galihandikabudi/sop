// public/js/api.js
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.location.href = "/index.html";
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
  return data;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC with no
// timezone marker — normalize it to real ISO-8601 UTC before parsing so
// the browser shows it correctly converted to local time.
function fmtDateTime(sqliteDatetime) {
  if (!sqliteDatetime) return "—";
  const d = new Date(String(sqliteDatetime).replace(" ", "T") + "Z");
  return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

const STATUS_LABEL = {
  draft: "Draft",
  menunggu_review: "Menunggu Review Waka",
  menunggu_persetujuan: "Menunggu ACC",
  berlaku: "Berlaku",
  ditolak: "Ditolak",
};

// Daftar bidang dulunya tertulis tetap di sini — sekarang dikelola Kepala
// Sekolah lewat halaman Pengaturan dan disimpan di tabel `bidang`. Ambil
// lewat fetchBidangNames() di halaman yang butuh isi dropdown bidang.
async function fetchBidangNames() {
  const list = await api("/bidang");
  return list.map((b) => b.name);
}

// Sebutan jabatan untuk akun ber-role "waka": pakai "Sebutan Jabatan" yang
// diatur Kepala Sekolah per bidang di halaman Pengaturan (mis. "Kepala Tata
// Usaha", "Bendahara", "Koordinator BKK") kalau sudah diisi; kalau belum,
// fallback ke pola default "Waka {Bidang}" seperti sebelumnya. Dipakai di
// mana pun aplikasi menampilkan sebutan jabatan akun waka bidang (dropdown
// Nama Pemeriksa, sidebar, Akun Saya, dokumen cetak).
function wakaTitle(bidangName, jabatanLabel) {
  const j = (jabatanLabel || "").trim();
  return j || `Waka ${bidangName}`;
}

// Selisih hari dari sebuah tanggal ke hari ini. Dulu dipakai untuk hitung
// mundur ke tanggal kedaluwarsa; sekarang dipakai untuk hitung "sudah
// berapa lama" sebuah SOP berlaku (murni informasi, bukan peringatan) —
// nilainya negatif untuk tanggal di masa lalu.
function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

// Sebuah SOP yang berlaku tidak punya tanggal kedaluwarsa — ia tetap aktif
// selama belum digantikan versi yang lebih baru, jadi badge cukup
// mencerminkan status apa adanya.
function effectiveBadge(sop) {
  return { cls: sop.status, label: STATUS_LABEL[sop.status] || sop.status };
}

async function requireUser() {
  try {
    return await api("/auth/me");
  } catch {
    window.location.href = "/index.html";
    return null;
  }
}
