// GET /api/dashboard — summary numbers for the Beranda page
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
    `SELECT COUNT(*) AS n FROM sop ${scope ? scope + " AND" : "WHERE"} status = 'menunggu_persetujuan'`
  ).bind(...bind).first();

  const perluDitinjau = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sop ${scope ? scope + " AND" : "WHERE"} status = 'berlaku'
     AND valid_until IS NOT NULL AND julianday(valid_until) - julianday('now') < 30`
  ).bind(...bind).first();

  const { results: akanKedaluwarsa } = await env.DB.prepare(
    `SELECT id, title, bidang, valid_until
     FROM sop
     ${scope ? scope + " AND" : "WHERE"} status = 'berlaku' AND valid_until IS NOT NULL
     ORDER BY valid_until ASC LIMIT 6`
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
    perluDitinjau: perluDitinjau.n,
    akanKedaluwarsa,
    perBidang,
  });
}
