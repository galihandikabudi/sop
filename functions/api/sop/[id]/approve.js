// POST /api/sop/:id/approve  { valid_until?, note? } — Kepala Sekolah only
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

function bumpVersion(version) {
  const [major, minor = "0"] = String(version).split(".");
  return `${Number(major) + 1}.0`;
}

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat menyetujui SOP.");

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.status !== "menunggu_persetujuan") {
    return json({ error: "SOP ini tidak sedang menunggu persetujuan." }, 400);
  }

  const body = await request.json().catch(() => ({}));
  const validUntil =
    body.valid_until ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newVersion = bumpVersion(sop.version);

  await env.DB.prepare(
    `UPDATE sop SET status = 'berlaku', version = ?, valid_until = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(newVersion, validUntil, sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'berlaku', ?, ?)`
  ).bind(sop.id, newVersion, sop.content, body.note || "Disahkan", user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "approve",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengesahkan "${sop.title}" (v${newVersion}, berlaku s.d. ${validUntil})`,
  });

  return json({ ok: true, version: newVersion, valid_until: validUntil });
}
