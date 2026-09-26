// PUT    /api/bidang/:id { name, code? } — rename a bidang, Kepala Sekolah only.
//        Renaming cascades to every user/SOP currently using the old name
//        (and to the document-numbering counters), so everything stays
//        consistent — nothing is left pointing at a name that no longer
//        exists in the managed list.
// DELETE /api/bidang/:id — Kepala Sekolah only. Refused while any user or
//        SOP still uses this bidang, so nothing is ever left orphaned;
//        reassign them first (edit the users/SOPs to a different bidang),
//        then delete.
import { getSessionUser, json, unauthorized, forbidden } from "../../../lib/auth.js";
import { logActivity } from "../../../lib/log.js";

export async function onRequestPut({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat mengelola bidang.");

  const bidangId = Number(params.id);
  const existing = await env.DB.prepare("SELECT * FROM bidang WHERE id = ?").bind(bidangId).first();
  if (!existing) return json({ error: "Bidang tidak ditemukan." }, 404);

  const { name, code, jabatan_label } = await request.json().catch(() => ({}));
  const trimmedName = (name || "").trim();
  if (!trimmedName) return json({ error: "Nama bidang tidak boleh kosong." }, 400);

  const clash = await env.DB.prepare("SELECT 1 FROM bidang WHERE LOWER(name) = LOWER(?) AND id != ?")
    .bind(trimmedName, bidangId)
    .first();
  if (clash) return json({ error: "Bidang dengan nama itu sudah ada." }, 409);

  const trimmedCode = (code || "").trim().toUpperCase() || null;
  const trimmedJabatanLabel = (jabatan_label || "").trim() || null;
  const oldName = existing.name;

  await env.DB.batch([
    env.DB.prepare("UPDATE bidang SET name = ?, code = ?, jabatan_label = ? WHERE id = ?").bind(trimmedName, trimmedCode, trimmedJabatanLabel, bidangId),
    env.DB.prepare("UPDATE users SET bidang = ? WHERE bidang = ?").bind(trimmedName, oldName),
    env.DB.prepare("UPDATE sop SET bidang = ? WHERE bidang = ?").bind(trimmedName, oldName),
    env.DB.prepare("UPDATE doc_number_counters SET bidang = ? WHERE bidang = ?").bind(trimmedName, oldName),
  ]);

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "bidang_update",
    entityType: "bidang",
    entityId: bidangId,
    detail: oldName === trimmedName ? `Mengubah kode bidang "${trimmedName}"` : `Mengubah nama bidang "${oldName}" menjadi "${trimmedName}"`,
  });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat mengelola bidang.");

  const bidangId = Number(params.id);
  const existing = await env.DB.prepare("SELECT * FROM bidang WHERE id = ?").bind(bidangId).first();
  if (!existing) return json({ error: "Bidang tidak ditemukan." }, 404);

  const [{ n: userCount }, { n: sopCount }] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE bidang = ?").bind(existing.name).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM sop WHERE bidang = ?").bind(existing.name).first(),
  ]);
  if (userCount > 0 || sopCount > 0) {
    return json(
      {
        error: `Tidak bisa menghapus — masih dipakai oleh ${userCount} akun dan ${sopCount} SOP. Pindahkan dulu ke bidang lain sebelum menghapus.`,
      },
      400
    );
  }

  await env.DB.prepare("DELETE FROM bidang WHERE id = ?").bind(bidangId).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "bidang_delete",
    entityType: "bidang",
    entityId: bidangId,
    detail: `Menghapus bidang "${existing.name}"`,
  });

  return json({ ok: true });
}
