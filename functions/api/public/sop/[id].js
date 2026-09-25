// GET /api/public/sop/:id — PUBLIC, no login required.
//
// Powers the QR code printed on every SOP document: scanning it should let
// anyone (staff at their desk, an auditor, whoever) immediately see the
// current online version, without having to log in first. Only SOPs that
// are currently "berlaku" are exposed here, and only a safe subset of
// fields — no internal ids beyond what's needed, no comments, no version
// history, no other users' info beyond names already meant to be printed
// on the document (preparer/checker/kepala sekolah).
import { json } from "../../../../lib/auth.js";

export async function onRequestGet({ env, params }) {
  const sop = await env.DB.prepare(
    `SELECT s.id, s.title, s.bidang, s.version, s.status, s.valid_from, s.doc_number,
            s.content, s.preparer_name, s.checker_name, s.updated_at,
            u.name AS created_by_name
     FROM sop s JOIN users u ON u.id = s.created_by
     WHERE s.id = ?`
  ).bind(params.id).first();

  if (!sop || sop.status !== "berlaku") {
    return json({ error: "Dokumen tidak ditemukan atau belum berlaku." }, 404);
  }

  const approvalVersion = await env.DB.prepare(
    `SELECT u.name AS actor_name FROM sop_versions sv
     LEFT JOIN users u ON u.id = sv.actor_id
     WHERE sv.sop_id = ? AND sv.status = 'berlaku'
     ORDER BY sv.created_at DESC LIMIT 1`
  ).bind(sop.id).first();

  const kepsek = await env.DB.prepare(
    "SELECT name FROM users WHERE role = 'kepala_sekolah' ORDER BY id LIMIT 1"
  ).first();

  return json({
    id: sop.id,
    title: sop.title,
    bidang: sop.bidang,
    version: sop.version,
    valid_from: sop.valid_from,
    doc_number: sop.doc_number,
    content: sop.content,
    preparer_name: sop.preparer_name || sop.created_by_name,
    checker_name: sop.checker_name,
    kepalaSekolahName: (approvalVersion && approvalVersion.actor_name) || (kepsek && kepsek.name) || null,
  });
}
