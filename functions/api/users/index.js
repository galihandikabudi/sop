// GET  /api/users   — list all users (Kepala Sekolah only)
// POST /api/users    { name, email, password, bidang, role? } — create a
//      staff or waka (bidang reviewer) account. role defaults to "staff".
import { getSessionUser, hashPassword, json, unauthorized, forbidden } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden();

  const { results } = await env.DB.prepare(
    "SELECT id, name, email, role, bidang, created_at FROM users ORDER BY name"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden();

  const { name, email, password, bidang, role } = await request.json().catch(() => ({}));
  const effectiveRole = role === "waka" ? "waka" : "staff";
  if (!name || !email || !password || !bidang || password.length < 8) {
    return json({ error: "Isi name, email, bidang, dan password (min. 8 karakter)." }, 400);
  }

  const passwordHash = await hashPassword(password);
  let userId;
  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, role, bidang) VALUES (?, ?, ?, ?, ?)"
    ).bind(name, email.toLowerCase(), passwordHash, effectiveRole, bidang).run();
    userId = result.meta.last_row_id;
  } catch (e) {
    return json({ error: "Email sudah terdaftar." }, 409);
  }

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "user_create",
    entityType: "user",
    entityId: userId,
    detail: `Membuat akun ${effectiveRole === "waka" ? "Waka" : "staf"} "${name}" (${bidang})`,
  });

  return json({ ok: true });
}
