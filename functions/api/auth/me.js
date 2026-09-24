// GET /api/auth/me — returns the logged-in user, or 401.
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  return json(user);
}
