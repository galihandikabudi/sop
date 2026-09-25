// GET  /api/bidang            — list all bidang, any logged-in user (used
//      to populate dropdowns: Ajukan SOP Baru, Tambah/Edit Pengguna, dst.)
// POST /api/bidang { name, code? } — create a new bidang, Kepala Sekolah only
import { getSessionUser, json, unauthorized, forbidden } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare("SELECT id, name, code FROM bidang ORDER BY name").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat mengelola bidang.");

  const { name, code } = await request.json().catch(() => ({}));
  const trimmedName = (name || "").trim();
  if (!trimmedName) return json({ error: "Nama bidang tidak boleh kosong." }, 400);

  const existing = await env.DB.prepare("SELECT 1 FROM bidang WHERE LOWER(name) = LOWER(?)")
    .bind(trimmedName)
    .first();
  if (existing) return json({ error: "Bidang dengan nama itu sudah ada." }, 409);

  const trimmedCode = (code || "").trim().toUpperCase() || null;

  const result = await env.DB.prepare("INSERT INTO bidang (name, code) VALUES (?, ?)")
    .bind(trimmedName, trimmedCode)
    .run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "bidang_create",
    entityType: "bidang",
    entityId: result.meta.last_row_id,
    detail: `Menambah bidang "${trimmedName}"`,
  });

  return json({ ok: true, id: result.meta.last_row_id });
}
