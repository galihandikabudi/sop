// POST /api/sop/:id/propose-change — reopens a "berlaku" (in-effect) SOP so
// a revision can be made. Only the original creator or Kepala Sekolah can
// do this (same rule as editing/deleting a draft).
//
// Reuses the SAME sop row and moves status back to "draft", so the
// existing draft-edit UI (isi, Nama Penyusun/Pemeriksa) and the normal
// draft -> review -> persetujuan pipeline apply unchanged — no new UI or
// workflow needed. This matches how approve.js already treats revisions:
// version bertambah dan nomor dokumen (doc_number) TETAP SAMA, dibuat
// hanya sekali saat pertama disahkan (lihat lib/docNumber.js).
//
// Catatan: selama revisi berjalan (draft/menunggu review/menunggu
// persetujuan), dokumen ini untuk sementara tidak muncul lagi di Pustaka
// SOP (yang hanya menampilkan status "berlaku") sampai revisinya disahkan
// ulang — persis seperti saat sebuah SOP ditolak Waka/Kepala Sekolah dan
// kembali ke draft.
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.created_by !== user.id && user.role !== "kepala_sekolah") return forbidden();
  if (sop.status !== "berlaku") {
    return json({ error: "Hanya SOP berstatus \"Berlaku\" yang bisa diajukan perubahannya." }, 400);
  }

  await env.DB.prepare(
    "UPDATE sop SET status = 'draft', updated_at = datetime('now') WHERE id = ?"
  ).bind(sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'draft', ?, ?)`
  ).bind(sop.id, sop.version, sop.content, "Diajukan perubahan atas versi yang berlaku", user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "propose_change",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengajukan perubahan untuk "${sop.title}" (sebelumnya v${sop.version}, berlaku)`,
  });

  return json({ ok: true });
}
