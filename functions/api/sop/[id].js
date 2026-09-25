// GET /api/sop/:id — full detail incl. version history and read status
// PUT /api/sop/:id  { title, content } — edit a draft (author only)
import { getSessionUser, json, unauthorized, forbidden } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

async function loadSop(env, id) {
  return env.DB.prepare(
    `SELECT s.*, u.name AS created_by_name
     FROM sop s JOIN users u ON u.id = s.created_by
     WHERE s.id = ?`
  ).bind(id).first();
}

export async function onRequestGet({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await loadSop(env, params.id);
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  const isNamedChecker = user.role === "waka" && sop.checker_user_id === user.id;
  if (user.role !== "kepala_sekolah" && sop.bidang !== user.bidang && !isNamedChecker) return forbidden();

  const { results: versions } = await env.DB.prepare(
    `SELECT sv.version, sv.status, sv.note, sv.created_at, u.name AS actor_name
     FROM sop_versions sv LEFT JOIN users u ON u.id = sv.actor_id
     WHERE sv.sop_id = ? ORDER BY sv.created_at DESC`
  ).bind(sop.id).all();

  const myRead = await env.DB.prepare(
    "SELECT 1 FROM read_confirmations WHERE sop_id = ? AND user_id = ?"
  ).bind(sop.id, user.id).first();

  const kepsek = await env.DB.prepare(
    "SELECT name FROM users WHERE role = 'kepala_sekolah' ORDER BY id LIMIT 1"
  ).first();

  return json({ ...sop, versions, hasConfirmedRead: !!myRead, kepalaSekolahName: kepsek ? kepsek.name : null });
}

export async function onRequestPut({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await loadSop(env, params.id);
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.created_by !== user.id && user.role !== "kepala_sekolah") return forbidden();
  if (sop.status !== "draft") {
    return json({ error: "Hanya SOP berstatus draft yang dapat diedit." }, 400);
  }

  const { title, content, preparer_name, checker_name, checker_user_id } = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE sop SET title = COALESCE(?, title), content = COALESCE(?, content),
            preparer_name = ?, checker_name = ?, checker_user_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    title || null,
    content || null,
    preparer_name !== undefined ? preparer_name || null : sop.preparer_name,
    checker_name !== undefined ? checker_name || null : sop.checker_name,
    checker_user_id !== undefined ? checker_user_id || null : sop.checker_user_id,
    sop.id
  ).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "update",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengubah draf "${title || sop.title}"`,
  });

  return json({ ok: true });
}
