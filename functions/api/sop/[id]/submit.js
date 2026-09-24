// POST /api/sop/:id/submit — moves a draft into the review/approval queue.
// If a "waka" account exists for this SOP's bidang, it goes to that Waka
// first (status "menunggu_review"); otherwise it goes straight to the
// Kepala Sekolah queue ("menunggu_persetujuan"), same as before.
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.created_by !== user.id && user.role !== "kepala_sekolah") return forbidden();
  if (sop.status !== "draft") return json({ error: "SOP ini bukan draft." }, 400);

  const wakaExists = await env.DB.prepare(
    "SELECT 1 FROM users WHERE role = 'waka' AND bidang = ? LIMIT 1"
  ).bind(sop.bidang).first();

  const nextStatus = wakaExists ? "menunggu_review" : "menunggu_persetujuan";
  const noteText = wakaExists ? "Diajukan untuk review Waka bidang" : "Diajukan untuk persetujuan Kepala Sekolah";

  await env.DB.prepare(
    "UPDATE sop SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(nextStatus, sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(sop.id, sop.version, sop.content, nextStatus, noteText, user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "submit",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengajukan "${sop.title}" — ${noteText}`,
  });

  return json({ ok: true, status: nextStatus });
}
