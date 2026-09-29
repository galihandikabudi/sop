// DELETE /api/sop/:id/delete
// Kepala Sekolah can delete any SOP. A staff member can delete only their
// own SOPs while still in draft AND never previously disahkan (once
// submitted/approved at least once, deleting is restricted to Kepala
// Sekolah to preserve the approval trail).
//
// This second condition matters because of "Ajukan Perubahan" (see
// propose-change.js): revising a "berlaku" SOP moves it back to status
// "draft" on the SAME row — without this guard, the owner could revise a
// long-approved SOP and then accidentally hit "Hapus" (now enabled because
// status is "draft" again) and permanently wipe the whole document
// including its approval history, not just the in-progress revision.
// `doc_number` is only ever set the first time a SOP is disahkan, so its
// presence reliably marks "this has a prior approval history".
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);

  const isOwner = sop.created_by === user.id;
  const hasPriorApproval = !!sop.doc_number;
  const canDelete =
    user.role === "kepala_sekolah" || (isOwner && sop.status === "draft" && !hasPriorApproval);
  if (!canDelete) {
    return forbidden(
      hasPriorApproval
        ? "SOP ini pernah disahkan — hanya Kepala Sekolah yang dapat menghapusnya."
        : "Hanya draf milik sendiri atau Kepala Sekolah yang dapat menghapus SOP ini."
    );
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM read_confirmations WHERE sop_id = ?").bind(sop.id),
    env.DB.prepare("DELETE FROM sop_versions WHERE sop_id = ?").bind(sop.id),
    env.DB.prepare("DELETE FROM sop_comments WHERE sop_id = ?").bind(sop.id),
    env.DB.prepare("DELETE FROM sop WHERE id = ?").bind(sop.id),
  ]);

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "delete",
    entityType: "sop",
    entityId: sop.id,
    detail: `Menghapus "${sop.title}" (${sop.bidang}, status sebelumnya: ${sop.status})`,
  });

  return json({ ok: true });
}
