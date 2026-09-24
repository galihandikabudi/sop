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

function daysLeft(validUntil) {
  if (!validUntil) return null;
  return Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
}

// Mirrors the visual language from the design mockup: an SOP that's still
// "berlaku" but close to (or past) its expiry date shows an orange/red
// warning badge instead of a plain green "Berlaku" badge.
function effectiveBadge(sop) {
  if (sop.status === "berlaku" && sop.valid_until) {
    const d = daysLeft(sop.valid_until);
    if (d < 0) return { cls: "kedaluwarsa", label: "Kedaluwarsa" };
    if (d < 30) return { cls: "review", label: "Perlu Ditinjau" };
  }
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
