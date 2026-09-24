// GET  /api/users   — list all users (Kepala Sekolah only)
// POST /api/users    { name, email, password, bidang } — create a staff account
import { getSessionUser, hashPassword, json, unauthorized, forbidden } from "../../../lib/auth.js";

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

  const { name, email, password, bidang } = await request.json().catch(() => ({}));
  if (!name || !email || !password || !bidang || password.length < 8) {
    return json({ error: "Isi name, email, bidang, dan password (min. 8 karakter)." }, 400);
  }

  const passwordHash = await hashPassword(password);
  try {
    await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, role, bidang) VALUES (?, ?, ?, 'staff', ?)"
    ).bind(name, email.toLowerCase(), passwordHash, bidang).run();
  } catch (e) {
    return json({ error: "Email sudah terdaftar." }, 409);
  }

  return json({ ok: true });
}
