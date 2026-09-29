// GET  /api/sop/:id/comments — list comments, oldest first
// POST /api/sop/:id/comments  { comment } — add a comment
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

// Diskusi mengikuti aturan lihat yang sama dengan halaman detail SOP itu
// sendiri (lihat isPublished di functions/api/sop/[id].js): SOP yang sudah
// "berlaku" adalah dokumen resmi terbuka untuk SEMUA pengguna yang login,
// jadi kolom diskusinya pun ikut terbuka untuk semua orang yang punya akun
// — bukan cuma bidang sendiri. Draft/pengajuan yang belum berlaku tetap
// dibatasi seperti biasa (bidang sendiri, pemeriksa yang ditunjuk, atau
// Kepala Sekolah) supaya diskusi internal yang belum publik tidak bocor.
function canAccess(user, sop) {
  if (user.role === "kepala_sekolah") return true;
  if (sop.status === "berlaku") return true;
  const isNamedChecker = user.role === "waka" && sop.checker_user_id === user.id;
  return sop.bidang === user.bidang || isNamedChecker;
}

export async function onRequestGet({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT id, bidang, status, checker_user_id FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (!canAccess(user, sop)) return forbidden();

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.comment, c.created_at, c.user_id, u.name AS author_name
     FROM sop_comments c JOIN users u ON u.id = c.user_id
     WHERE c.sop_id = ? ORDER BY c.created_at ASC`
  ).bind(sop.id).all();

  return json(results);
}

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT id, bidang, title, status, checker_user_id FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (!canAccess(user, sop)) return forbidden();

  const { comment } = await request.json().catch(() => ({}));
  if (!comment || !comment.trim()) return json({ error: "Komentar tidak boleh kosong." }, 400);

  const result = await env.DB.prepare(
    "INSERT INTO sop_comments (sop_id, user_id, comment) VALUES (?, ?, ?)"
  ).bind(sop.id, user.id, comment.trim()).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "comment",
    entityType: "sop",
    entityId: sop.id,
    detail: `Berkomentar di "${sop.title}"`,
  });

  return json({ id: result.meta.last_row_id }, 201);
}
