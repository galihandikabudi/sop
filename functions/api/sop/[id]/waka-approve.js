// POST /api/sop/:id/waka-approve — Waka bidang approves, forwarding to Kepala Sekolah
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

  await env.DB.prepare(
    "UPDATE sop SET status = 'menunggu_persetujuan', updated_at = datetime('now') WHERE id = ?"
  ).bind(sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'menunggu_persetujuan', ?, ?)`
  ).bind(sop.id, sop.version, sop.content, note || "Disetujui Waka, diteruskan ke Kepala Sekolah", user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "waka_approve",
    entityType: "sop",
    entityId: sop.id,
    detail: `Menyetujui "${sop.title}" di tahap Waka, diteruskan ke Kepala Sekolah`,
  });

  return json({ ok: true });
}
