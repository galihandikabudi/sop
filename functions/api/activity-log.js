// GET /api/activity-log?limit=100 — Kepala Sekolah only
import { getSessionUser, json, unauthorized, forbidden } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden();

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 300);

  const { results } = await env.DB.prepare(
    "SELECT id, actor_name, action, entity_type, entity_id, detail, created_at FROM activity_log ORDER BY created_at DESC LIMIT ?"
  ).bind(limit).all();

  return json(results);
}
