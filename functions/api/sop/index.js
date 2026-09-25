// GET  /api/sop?status=&bidang=&q=   — list SOPs, newest first
// POST /api/sop   { title, bidang, content } — create a new draft
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const bidang = url.searchParams.get("bidang");
  const q = url.searchParams.get("q");

  let sql = `SELECT s.id, s.title, s.bidang, s.version, s.status, s.valid_from,
                    s.created_by, s.updated_at, u.name AS created_by_name
             FROM sop s JOIN users u ON u.id = s.created_by
             WHERE 1=1`;
  const params = [];

  // Staff only see their own bidang. Kepala Sekolah sees everything. Waka
  // see their own bidang PLUS any SOP (any bidang) where they're
  // specifically named as the pemeriksa (checker_user_id) — so a SOP also
  // shows up in that Waka's own Tinjauan Waka list, not just the queue for
  // Waka of the SOP's own bidang. A Waka never needs to review their own
  // submission, so anything they created themselves is excluded here even
  // if it happens to match on bidang.
  if (user.role === "waka") {
    sql += " AND (s.bidang = ? OR s.checker_user_id = ?) AND s.created_by != ?";
    params.push(user.bidang, user.id, user.id);
  } else if (user.role !== "kepala_sekolah") {
    sql += " AND s.bidang = ?";
    params.push(user.bidang);
  }
  if (status) {
    sql += " AND s.status = ?";
    params.push(status);
  }
  if (bidang) {
    sql += " AND s.bidang = ?";
    params.push(bidang);
  }
  if (q) {
    sql += " AND s.title LIKE ?";
    params.push(`%${q}%`);
  }
  sql += " ORDER BY s.updated_at DESC";

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { title, bidang, content, preparer_name, checker_name, checker_user_id } = await request.json().catch(() => ({}));
  if (!title || !bidang) return json({ error: "Judul dan bidang wajib diisi." }, 400);

  // Staff can only create SOPs for their own bidang.
  const effectiveBidang = user.role === "kepala_sekolah" ? bidang : user.bidang;

  const result = await env.DB.prepare(
    `INSERT INTO sop (title, bidang, content, version, status, created_by, preparer_name, checker_name, checker_user_id)
     VALUES (?, ?, ?, '1.0', 'draft', ?, ?, ?, ?)`
  ).bind(title, effectiveBidang, content || "", user.id, preparer_name || null, checker_name || null, checker_user_id || null).run();

  const sopId = result.meta.last_row_id;
  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, '1.0', ?, 'draft', 'Dibuat', ?)`
  ).bind(sopId, content || "", user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "create",
    entityType: "sop",
    entityId: sopId,
    detail: `Membuat draf "${title}" (${effectiveBidang})`,
  });

  return json({ id: sopId }, 201);
}