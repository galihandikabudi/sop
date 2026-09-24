// POST /api/auth/login  { email, password }
import { verifyPassword, createSession, sessionCookie, json } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) return json({ error: "Email dan password wajib diisi." }, 400);

  const user = await env.DB.prepare(
    "SELECT id, name, email, password_hash, role, bidang FROM users WHERE email = ?"
  ).bind(email.toLowerCase()).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "Email atau password salah." }, 401);
  }

  const { id: sessionId, expiresAt } = await createSession(env, user.id);

  return json(
    { id: user.id, name: user.name, email: user.email, role: user.role, bidang: user.bidang },
    200,
    { "Set-Cookie": sessionCookie(sessionId, expiresAt) }
  );
}
