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

const STATUS_LABEL = {
  draft: "Draft",
  menunggu_persetujuan: "Menunggu ACC",
  berlaku: "Berlaku",
  ditolak: "Ditolak",
  kedaluwarsa: "Kedaluwarsa",
};

const BIDANG_LIST = [
  "Kurikulum",
  "Kesiswaan",
  "Sarana & Prasarana",
  "Kaprodi TKR/TO",
  "Kaprodi AKL",
  "BKK",
  "Tata Usaha",
  "Bendahara Sekolah",
  "Publikasi",
];

async function requireUser() {
  try {
    return await api("/auth/me");
  } catch {
    window.location.href = "/index.html";
    return null;
  }
}
