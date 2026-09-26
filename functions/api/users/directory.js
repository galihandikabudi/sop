// GET /api/users/directory — minimal user list (id, name, bidang, role,
// jabatan_label), for ANY logged-in user (not just Kepala Sekolah). Used to
// populate the "Nama Pemeriksa" dropdown on Ajukan SOP Baru / edit draft, so
// the field picks from real registered accounts instead of free text.
// `jabatan_label` comes from the account's bidang (set in Pengaturan) and
// overrides the default "Waka {bidang}" title shown for a waka account whose
// real job title isn't literally "Waka" (mis. "Kepala Tata Usaha").
// Deliberately leaves out email and other account details — this is just a
// name directory, not the admin user list (/api/users, Kepala Sekolah only).
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT u.id, u.name, u.bidang, u.role, b.jabatan_label
     FROM users u LEFT JOIN bidang b ON b.name = u.bidang
     ORDER BY u.name`
  ).all();
  return json(results);
}
