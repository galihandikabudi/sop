// GET /api/users/directory — minimal user list (id, name, bidang, role),
// for ANY logged-in user (not just Kepala Sekolah). Used to populate the
// "Nama Pemeriksa" dropdown on Ajukan SOP Baru / edit draft, so the field
// picks from real registered accounts instead of free text. Deliberately
// leaves out email and other account details — this is just a name
// directory, not the admin user list (/api/users, Kepala Sekolah only).
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    "SELECT id, name, bidang, role FROM users ORDER BY name"
  ).all();
  return json(results);
}
