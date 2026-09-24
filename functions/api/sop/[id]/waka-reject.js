// POST /api/sop/:id/waka-reject  { note } — Waka bidang sends SOP back to draft
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "waka") return forbidden("Hanya Waka bidang yang dapat meninjau di tahap ini.");

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.bidang !== user.bidang) return forbidden("SOP ini bukan dari bidang Anda.");
  if (sop.status !== "menunggu_review") {
    return json({ error: "SOP ini tidak sedang menunggu review Waka." }, 400);
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

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "waka_reject",
    entityType: "sop",
    entityId: sop.id,
    detail: `Menolak "${sop.title}" di tahap Waka: ${note}`,
  });

  return json({ ok: true });
}
