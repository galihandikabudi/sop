// POST /api/sop/:id/approve  { valid_from?, note? } — Kepala Sekolah only
//
// Mengesahkan SOP: menaikkan versi dan mencatat `valid_from` (tanggal mulai
// berlaku). Tidak ada tanggal kedaluwarsa — versi ini dianggap tetap aktif
// selama belum ada versi baru yang mengesahkan ulang SOP yang sama.
//
// Nomor dokumen resmi (`doc_number`) dibuat sekali saja, pada pengesahan
// PERTAMA — revisi berikutnya (naik versi) tidak mengubah nomor ini, hanya
// versinya yang bertambah.
import { getSessionUser, json, unauthorized, forbidden } from "../../../../lib/auth.js";
import { logActivity } from "../../../../lib/log.js";
import { generateDocNumber } from "../../../../lib/docNumber.js";

function bumpVersion(version) {
  const [major, minor = "0"] = String(version).split(".");
  return `${Number(major) + 1}.0`;
}

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  if (user.role !== "kepala_sekolah") return forbidden("Hanya Kepala Sekolah yang dapat menyetujui SOP.");

  const sop = await env.DB.prepare("SELECT * FROM sop WHERE id = ?").bind(params.id).first();
  if (!sop) return json({ error: "SOP tidak ditemukan." }, 404);
  if (sop.status !== "menunggu_persetujuan") {
    return json({ error: "SOP ini tidak sedang menunggu persetujuan." }, 400);
  }

  const body = await request.json().catch(() => ({}));
  // Default: berlaku efektif sejak hari ini (tanggal pengesahan). Kepala
  // Sekolah tetap bisa menetapkan tanggal efektif lain (mis. berlaku mulai
  // awal semester depan) lewat field valid_from di form persetujuan.
  const validFrom = body.valid_from || new Date().toISOString().slice(0, 10);
  const newVersion = bumpVersion(sop.version);

  // Nomor dokumen hanya dibuat sekali, saat pertama kali disahkan.
  const docNumber = sop.doc_number || (await generateDocNumber(env, sop.bidang, validFrom));

  await env.DB.prepare(
    `UPDATE sop SET status = 'berlaku', version = ?, valid_from = ?, doc_number = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(newVersion, validFrom, docNumber, sop.id).run();

  await env.DB.prepare(
    `INSERT INTO sop_versions (sop_id, version, content, status, note, actor_id)
     VALUES (?, ?, ?, 'berlaku', ?, ?)`
  ).bind(sop.id, newVersion, sop.content, body.note || "Disahkan", user.id).run();

  await logActivity(env, {
    actorId: user.id,
    actorName: user.name,
    action: "approve",
    entityType: "sop",
    entityId: sop.id,
    detail: `Mengesahkan "${sop.title}" (${docNumber}, v${newVersion}, berlaku mulai ${validFrom})`,
  });

  return json({ ok: true, version: newVersion, valid_from: validFrom, doc_number: docNumber });
}
