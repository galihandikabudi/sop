// POST /api/sop/:id/reject  { note } — Kepala Sekolah only; sends SOP back to draft
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat menolak SOP.");

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.status !== "menunggu_persetujuan") {
    return json({ error: "SOP ini tidak sedang menunggu persetujuan." }, 400);
  }

  const { note } = await request.json().catch(() => ({}));
  if (!note) return json({ error: "Catatan alasan penolakan wajib diisi." }, 400);

  await env.DB.prepare(
    "UPDATE sop SET status = 'draft', updated_at = datetime('now') WHERE id = ?"
  ).bind(sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'ditolak', ?, ?)`
  ).bind(sop.id, sop.version, sop.content, note, user.id).run();

  return json({ ok: true });
}
