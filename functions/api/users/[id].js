// PUT    /api/users/:id  { name, email, bidang, role, password? } — edit an
//        existing account (Kepala Sekolah only). password is optional; when
//        omitted or blank, the existing password is left untouched.
// DELETE /api/users/:id  — remove an account (Kepala Sekolah only).
//
// Guardrails: a Kepala Sekolah cannot delete their own account, cannot
// change their own role away from "kepala_sekolah", and cannot delete or
// demote the last remaining "kepala_sekolah" account — all to avoid
// accidentally locking everyone out of admin access.
import { getSessionUser, hashPassword, json, unauthorized, forbidden } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

async function countKepalaSekolah(env) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'kepala_sekolah'"
  ).first();
  return row?.n || 0;
}

export async function onRequestPut({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden();

  const targetId = Number(params.id);
  const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetId).first();
  if (!target) return json({ error: "Pengguna tidak ditemukan." }, 404);

  const { name, email, bidang, role, password } = await request.json().catch(() => ({}));
  const effectiveRole = role === "waka" || role === "kepala_sekolah" ? role : "staff";

  if (!name || !email || (effectiveRole !== "kepala_sekolah" && !bidang)) {
    return json({ error: "Isi nama, email, dan bidang (untuk peran selain Kepala Sekolah)." }, 400);
  }
  if (password && password.length > 0 && password.length < 8) {
    return json({ error: "Password baru minimal 8 karakter." }, 400);
  }

  // Guard: don't let the last kepala_sekolah demote themself (or be demoted).
  if (target.role === "kepala_sekolah" && effectiveRole !== "kepala_sekolah") {
    const n = await countKepalaSekolah(env);
    if (n <= 1) {
      return json({ error: "Tidak bisa mengubah peran ini — minimal harus ada satu akun Kepala Sekolah." }, 400);
    }
  }

  const passwordHash = password && password.length > 0 ? await hashPassword(password) : target.password_hash;
  const effectiveBidang = effectiveRole === "kepala_sekolah" ? null : bidang;

  try {
    await env.DB.prepare(
      "UPDATE users SET name = ?, email = ?, bidang = ?, role = ?, password_hash = ? WHERE id = ?"
    ).bind(name, email.toLowerCase(), effectiveBidang, effectiveRole, passwordHash, targetId).run();
  } catch (e) {
    return json({ error: "Email sudah digunakan akun lain." }, 409);
  }

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "user_update",
    entityType: "user",
    entityId: targetId,
    detail: `Mengubah data akun "${name}"${password ? " (termasuk password baru)" : ""}`,
  });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden();

  const targetId = Number(params.id);
  if (targetId === user.id) {
    return json({ error: "Tidak bisa menghapus akun Anda sendiri." }, 400);
  }

  const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetId).first();
  if (!target) return json({ error: "Pengguna tidak ditemukan." }, 404);

  if (target.role === "kepala_sekolah") {
    const n = await countKepalaSekolah(env);
    if (n <= 1) {
      return json({ error: "Tidak bisa menghapus — minimal harus ada satu akun Kepala Sekolah." }, 400);
    }
  }

  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "user_delete",
    entityType: "user",
    entityId: targetId,
    detail: `Menghapus akun "${target.name}" (${target.email})`,
  });

  return json({ ok: true });
}
