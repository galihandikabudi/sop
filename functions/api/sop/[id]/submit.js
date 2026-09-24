// POST /api/sop/:id/submit — moves a draft into the approval queue
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.created_by !== user.id && user.role !== "kepala_sekolah") return forbidden();
  if (sop.status !== "draft") return json({ error: "SOP ini bukan draft." }, 400);

  await env.DB.prepare(
    "UPDATE sop SET status = 'menunggu_persetujuan', updated_at = datetime('now') WHERE id = ?"
  ).bind(sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'menunggu_persetujuan', 'Diajukan untuk persetujuan', ?)`
  ).bind(sop.id, sop.version, sop.content, user.id).run();

  return json({ ok: true });
}
