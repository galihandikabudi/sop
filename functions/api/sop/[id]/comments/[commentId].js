// DELETE /api/sop/:id/comments/:commentId — remove a comment. Only the
// comment's own author, or Kepala Sekolah, can delete it.
import { getSessionUser, json, unauthorized, forbidden } from "../../../../../lib/auth.js";
import { logActivity } from "../../../../../lib/log.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const comment = await env.DB.prepare(
    `SELECT c.*, s.title AS sop_title
     FROM sop_comments c JOIN sop s ON s.id = c.sop_id
     WHERE c.id = ? AND c.sop_id = ?`
  ).bind(params.commentId, params.id).first();
  if (!comment) return json({ error: "Komentar tidak ditemukan." }, 404);

  if (comment.user_id !== user.id && user.role !== "kepala_sekolah") {
    return forbidden("Hanya penulis komentar atau Kepala Sekolah yang dapat menghapus komentar ini.");
  }

  await env.DB.prepare("DELETE FROM sop_comments WHERE id = ?").bind(comment.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "comment_delete",
    entityType: "sop",
    entityId: Number(params.id),
    detail: `Menghapus komentar di "${comment.sop_title}"`,
  });

  return json({ ok: true });
}
