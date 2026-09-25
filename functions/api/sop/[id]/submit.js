// POST /api/sop/:id/submit — moves a draft into the review/approval queue.
//
// Normal case (pengaju staf): if a "waka" account exists for this SOP's
// bidang, it goes to that Waka first (status "menunggu_review"); otherwise
// it goes straight to the Kepala Sekolah queue ("menunggu_persetujuan").
//
// Special case (pengaju setingkat Waka): a Waka cannot review/approve their
// own submission, so a Pemeriksa is REQUIRED and must be a different Waka
// of the same bidang, or Kepala Sekolah. If the Pemeriksa is another Waka,
// it goes to "menunggu_review" as usual (that specific Waka reviews it,
// never the submitter). If the Pemeriksa is Kepala Sekolah, the review step
// is skipped entirely — it goes straight to "menunggu_persetujuan", since
// Kepala Sekolah is both pemeriksa and penyetuju akhir in that case.
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.created_by !== user.id && user.role !== "kepala_sekolah") return forbidden();
  if (sop.status !== "draft") return json({ error: "SOP ini bukan draft." }, 400);

  const creator = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(sop.created_by).first();
  const creatorIsWaka = !!creator && creator.role === "waka";

  let nextStatus;
  let noteText;

  if (creatorIsWaka) {
    if (!sop.checker_user_id) {
      return json(
        { error: "Karena pengaju adalah Waka, pilih Pemeriksa (Waka lain atau Kepala Sekolah) terlebih dahulu sebelum mengajukan." },
        400
      );
    }
    const checker = await env.DB.prepare("SELECT id, role, bidang FROM users WHERE id = ?").bind(sop.checker_user_id).first();
    if (!checker || checker.id === sop.created_by) {
      return json({ error: "Pemeriksa tidak valid. Pilih Waka lain atau Kepala Sekolah." }, 400);
    }
    if (checker.role === "kepala_sekolah") {
      nextStatus = "menunggu_persetujuan";
      noteText = "Diajukan untuk persetujuan Kepala Sekolah (Pemeriksa = Kepala Sekolah)";
    } else if (checker.role === "waka" && checker.bidang === sop.bidang) {
      nextStatus = "menunggu_review";
      noteText = "Diajukan untuk review Waka lain";
    } else {
      return json({ error: "Pemeriksa harus Waka bidang yang sama atau Kepala Sekolah." }, 400);
    }
  } else {
    const wakaExists = await env.DB.prepare(
      "SELECT 1 FROM users WHERE role = 'waka' AND bidang = ? LIMIT 1"
    ).bind(sop.bidang).first();

    nextStatus = wakaExists ? "menunggu_review" : "menunggu_persetujuan";
    noteText = wakaExists ? "Diajukan untuk review Waka bidang" : "Diajukan untuk persetujuan Kepala Sekolah";
  }

  await env.DB.prepare(
    "UPDATE sop SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(nextStatus, sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(sop.id, sop.version, sop.content, nextStatus, noteText, user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "submit",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengajukan "${sop.title}" — ${noteText}`,
  });

  return json({ ok: true, status: nextStatus });
}
