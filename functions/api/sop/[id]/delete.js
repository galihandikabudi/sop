// DELETE /api/sop/:id/delete
// Kepala Sekolah can delete any SOP. A staff member can delete only their
// own SOPs while still in draft (once submitted/approved, deleting is
// restricted to Kepala Sekolah to preserve the approval trail).
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);

  const isOwner = sop.created_by === user.id;
  const canDelete =
    user.role === "kepala_sekolah" || (isOwner && sop.status === "draft");
  if (!canDelete) {
    return forbidden("Hanya draf milik sendiri atau Kepala Sekolah yang dapat menghapus SOP ini.");
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM read_confirmations WHERE sop_id = ?").bind(sop.id),
    env.DB.prepare("DELETE FROM sop_versions WHERE sop_id = ?").bind(sop.id),
    env.DB.prepare("DELETE FROM sop WHERE id = ?").bind(sop.id),
  ]);

  return json({ ok: true });
}
