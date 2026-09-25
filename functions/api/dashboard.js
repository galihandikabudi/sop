// GET /api/dashboard — summary numbers for the Beranda page
//
// SOP yang sudah "berlaku" tidak punya tanggal kedaluwarsa — statistik di
// sini karena itu tidak lagi menghitung "akan kedaluwarsa", melainkan
// menyoroti SOP aktif yang paling lama belum direvisi (informasional saja,
// bukan peringatan/tenggat).
import { getSessionUser, json, unauthorized } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const scope = user.role === "kepala_sekolah" ? "" : "WHERE bidang = ?";
  const bind = user.role === "kepala_sekolah" ? [] : [user.bidang];

  const totalBerlaku = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sop ${scope ? scope + " AND" : "WHERE"} status = 'berlaku'`
  ).bind(...bind).first();

  const menunggu = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sop ${scope ? scope + " AND" : "WHERE"} status IN ('menunggu_review', 'menunggu_persetujuan')`
  ).bind(...bind).first();

  const draft = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sop ${scope ? scope + " AND" : "WHERE"} status = 'draft'`
  ).bind(...bind).first();

  const { results: aktifTerlama } = await env.DB.prepare(
    `SELECT id, title, bidang, valid_from
     FROM sop
     ${scope ? scope + " AND" : "WHERE"} status = 'berlaku' AND valid_from IS NOT NULL
     ORDER BY valid_from ASC LIMIT 6`
  ).bind(...bind).all();

  const { results: perBidang } = await env.DB.prepare(
    `SELECT bidang,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'berlaku' THEN 1 ELSE 0 END) AS aktif
     FROM sop
     GROUP BY bidang`
  ).all();

  return json({
    totalBerlaku: totalBerlaku.n,
    menunggu: menunggu.n,
    draft: draft.n,
    aktifTerlama,
    perBidang,
  });
}
