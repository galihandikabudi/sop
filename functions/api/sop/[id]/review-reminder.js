// PUT /api/sop/:id/review-reminder  { date }  — set or clear (date: null)
//
// Kepala Sekolah, or the Waka of that SOP's own bidang, can mark a
// "berlaku" SOP to be reminded about on a given date. This is PURELY a
// reminder — it does not touch status/valid_from and does not make the
// SOP expire. It just surfaces on the Beranda dashboard once the date is
// near/past, so someone remembers to take a look and re-approve it if
// needed (or not, if it's still fine as-is).
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";

export async function onRequestPut({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);

  const canManage = user.role === "kepala_sekolah" || (user.role === "waka" && user.bidang === sop.bidang);
  if (!canManage) return forbidden();

  if (sop.status !== "berlaku") {
    return json({ error: "Pengingat peninjauan hanya bisa dipasang pada SOP yang sudah berlaku." }, 400);
  }

  const { date } = await request.json().catch(() => ({}));
  const reminderDate = date || null;

  await env.DB.prepare("UPDATE sop SET review_reminder_date = ? WHERE id = ?")
    .bind(reminderDate, sop.id)
    .run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: reminderDate ? "review_reminder_set" : "review_reminder_clear",
    entityType: "sop",
    entityId: sop.id,
    detail: reminderDate
      ? `Menjadwalkan peninjauan ulang "${sop.title}" pada ${reminderDate}`
      : `Membatalkan pengingat peninjauan "${sop.title}"`,
  });

  return json({ ok: true, review_reminder_date: reminderDate });
}
