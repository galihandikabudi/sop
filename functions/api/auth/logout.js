// POST /api/auth/logout
import { clearSessionCookie, json } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  if (match) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(decodeURIComponent(match[1])).run();
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
