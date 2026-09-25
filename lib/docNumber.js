// lib/docNumber.js
// Generates the official, permanent document number assigned the first
// time an SOP is disahkan (approved). Format:
//   {urut 3 digit}/SOP-{KODE BIDANG}/SMK.MUHADA/{bulan romawi}/{tahun}
// e.g. 003/SOP-KUR/SMK.MUHADA/IX/2026
//
// The sequence resets per bidang, per year (tracked in
// doc_number_counters, keyed by (bidang, year)), so numbering never has
// gaps from rejected/deleted drafts — only SOPs that actually get
// disahkan consume a number — and each bidang starts back at 001 every
// new year.
//
// Bidang abbreviations ("kode") are managed by Kepala Sekolah in the
// `bidang` table (see migrations/007_bidang_table.sql and the Pengaturan
// page) — not hardcoded here anymore. If a bidang has no code set (or was
// deleted/renamed outside the managed list), we fall back to a derived
// 3-letter abbreviation so numbering never breaks.

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function deriveCodeFallback(bidang) {
  return String(bidang || "UMUM").slice(0, 3).toUpperCase();
}

export function romanMonth(monthIndex1to12) {
  return ROMAN_MONTHS[Math.min(Math.max(monthIndex1to12, 1), 12) - 1];
}

async function bidangCode(env, bidang) {
  const row = await env.DB.prepare("SELECT code FROM bidang WHERE name = ?").bind(bidang).first();
  return (row && row.code) || deriveCodeFallback(bidang);
}

/**
 * Atomically bumps and returns the next sequence number for a bidang+year,
 * then formats the full document number string. `effectiveDate` (a
 * "YYYY-MM-DD" string) supplies the month/year used in the number — this
 * is the SOP's valid_from date, i.e. the date it's being disahkan.
 */
export async function generateDocNumber(env, bidang, effectiveDate) {
  const d = effectiveDate ? new Date(effectiveDate) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const [code, row] = await Promise.all([
    bidangCode(env, bidang),
    env.DB.prepare(
      `INSERT INTO doc_number_counters (bidang, year, last_seq) VALUES (?, ?, 1)
       ON CONFLICT(bidang, year) DO UPDATE SET last_seq = last_seq + 1
       RETURNING last_seq`
    ).bind(bidang, year).first(),
  ]);

  const seq = row.last_seq;
  const seqStr = String(seq).padStart(3, "0");
  return `${seqStr}/SOP-${code}/SMK.MUHADA/${romanMonth(month)}/${year}`;
}
