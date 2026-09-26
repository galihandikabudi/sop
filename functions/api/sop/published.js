// GET /api/sop/published?q=&bidang=  — SOP yang sudah BERLAKU (disahkan),
// untuk SEMUA pengguna yang login — guru/staf bidang apa pun, bukan cuma
// bidang sendiri. Ini yang memberi daya "Pustaka SOP": satu tempat semua
// guru bisa mencari & membaca SOP resmi sekolah, lintas bidang, dengan
// pencarian judul dan filter bidang.
//
// Sengaja dibuat sebagai endpoint terpisah dari GET /api/sop biasa, karena
// endpoint itu memang perlu tetap membatasi staf/Waka ke bidang sendiri
// untuk status lain (draft, menunggu review, dst) — pembatasan itu tidak
// relevan di sini karena di sini yang ditampilkan cuma dokumen yang sudah
// resmi berlaku.
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const bidang = url.searchParams.get("bidang");

  let sql = `SELECT s.id, s.title, s.bidang, s.version, s.valid_from, s.doc_number,
                    s.created_by, s.updated_at, u.name AS created_by_name
             FROM sop s JOIN users u ON u.id = s.created_by
             WHERE s.status = 'berlaku'`;
  const params = [];

  if (bidang) {
    sql += " AND s.bidang = ?";
    params.push(bidang);
  }
  if (q) {
    sql += " AND s.title LIKE ?";
    params.push(`%${q}%`);
  }
  sql += " ORDER BY s.bidang, s.title";

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return json(results);
}
