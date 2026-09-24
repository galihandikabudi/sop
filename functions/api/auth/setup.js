// POST /api/auth/setup
// One-time bootstrap: creates the first Kepala Sekolah account.
// Refuses once at least one user already exists, so it's safe to leave
// deployed — but you can also delete this file after first use.
import { hashPassword, json } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (count.n > 0) {
    return json({ error: "Setup sudah pernah dijalankan. Silakan login." }, 409);
  }

  const body = await request.json().catch(() => ({}));
  const { name, email, password } = body;
  if (!name || !email || !password || password.length < 8) {
    return json(
      { error: "Isi name, email, dan password (min. 8 karakter)." },
      400
    );
  }

  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    "INSERT INTO users (name, email, password_hash, role, bidang) VALUES (?, ?, ?, 'kepala_sekolah', NULL)"
  ).bind(name, email.toLowerCase(), passwordHash).run();

  return json({ ok: true, message: "Akun Kepala Sekolah berhasil dibuat. Silakan login." });
}
