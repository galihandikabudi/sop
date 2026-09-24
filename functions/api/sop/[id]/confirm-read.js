// POST /api/sop/:id/confirm-read — records that the current user has read this SOP
import { getSessionUser, json, unauthorized } from "../../../../lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT id FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);

  await env.DB.prepare(
    "INSERT OR IGNORE INTO read_confirmations (sop_id, user_id) VALUES (?, ?)"
  ).bind(sop.id, user.id).run();

  return json({ ok: true });
}
