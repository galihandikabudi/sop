// GET  /api/sop?status=&bidang=&q=   — list SOPs, newest first
// POST /api/sop   { title, bidang, content } — create a new draft
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const bidang = url.searchParams.get("bidang");
  const q = url.searchParams.get("q");

  let sql = `SELECT s.id, s.title, s.bidang, s.version, s.status, s.valid_until,
                    s.updated_at, u.name AS created_by_name
             FROM sop s JOIN users u ON u.id = s.created_by
             WHERE 1=1`;
  const params = [];

  // Staff only see their own bidang; Kepala Sekolah sees everything.
  if (user.role !== "kepala_sekolah") {
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

  const { title, bidang, content } = await request.json().catch(() => ({}));
  if (!title || !bidang) return json({ error: "Judul dan bidang wajib diisi." }, 400);

  // Staff can only create SOPs for their own bidang.
  const effectiveBidang = user.role === "kepala_sekolah" ? bidang : user.bidang;

  const result = await env.DB.prepare(
    `INSERT INTO sop (title, bidang, content, version, status, created_by)
     VALUES (?, ?, ?, '1.0', 'draft', ?)`
  ).bind(title, effectiveBidang, content || "", user.id).run();

  const sopId = result.meta.last_row_id;
  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, '1.0', ?, 'draft', 'Dibuat', ?)`
  ).bind(sopId, content || "", user.id).run();

  return json({ id: sopId }, 201);
}
