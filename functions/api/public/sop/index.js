// GET /api/public/sop — PUBLIC, no login required.
//
// Powers the public "Daftar SOP" page (public/list.html, served at /list)
// so anyone — staff, guru, wali murid, auditor — can browse which SOPs are
// currently berlaku without needing an account. Only status "berlaku" is
// exposed, and only a safe subset of fields (no content, no internal
// user ids, no comments) — same spirit as /api/public/sop/[id].js which
// already exposes a single document's full text publicly via QR code.
// Search and bidang filtering are done client-side on this full list since
// a school's SOP corpus is small; no query params needed here.
import { json } from "../../../../lib/auth.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, bidang, version, valid_from, doc_number
     FROM sop
     WHERE status = 'berlaku'
     ORDER BY bidang, title`
  ).all();

  return json(results);
}
