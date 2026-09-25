// PUT /api/account  { name, currentPassword, newPassword? }
//
// Self-service account edit — any logged-in user (staff, waka, kepala
// sekolah) can update their OWN name and/or password here. Unlike
// /api/users/:id (Kepala Sekolah only, can edit anyone), this endpoint
// only ever touches the caller's own row (taken from the session, never
// from the request body) and always requires the current password as
// confirmation, since it needs no admin privilege to call.
//
// Email, bidang, and role are intentionally NOT editable here — those stay
// under Kepala Sekolah control via the Pengguna page, to prevent a user
// escalating their own access.
import { getSessionUser, hashPassword, verifyPassword, json, unauthorized } from "../../lib/auth.js";
import { logActivity } from "../../lib/log.js";

export async function onRequestPut({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { name, currentPassword, newPassword } = await request.json().catch(() => ({}));

  if (!name || !name.trim()) {
    return json({ error: "Nama tidak boleh kosong." }, 400);
  }
  if (!currentPassword) {
    return json({ error: "Masukkan password Anda saat ini untuk mengonfirmasi perubahan." }, 400);
  }
  if (newPassword && newPassword.length > 0 && newPassword.length < 8) {
    return json({ error: "Password baru minimal 8 karakter." }, 400);
  }

  const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
    return json({ error: "Password saat ini salah." }, 400);
  }

  const passwordHash = newPassword && newPassword.length > 0 ? await hashPassword(newPassword) : row.password_hash;

  await env.DB.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?")
    .bind(name.trim(), passwordHash, user.id)
    .run();

  await logActivity(env, {
    actorId: user.id,
    actorName: name.trim(),
    action: "account_update",
    entityType: "user",
    entityId: user.id,
    detail: `Mengubah akun sendiri${newPassword ? " (termasuk password baru)" : ""}`,
  });

  return json({ ok: true });
}
