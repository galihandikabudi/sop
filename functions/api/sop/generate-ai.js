// POST /api/sop/generate-ai  { title, bidang, instruksi? }
// Drafts SOP content (Tujuan, Ruang Lingkup, Prosedur, dst.) in the school's
// "Muhada Berdaya" tone of voice. Uses whichever AI backend is configured:
//   1. Claude (Anthropic API) — best quality, needs ANTHROPIC_API_KEY secret.
//   2. Cloudflare Workers AI — free (10,000 neurons/day), needs an "AI"
//      binding added via the dashboard (Settings → Functions → Workers AI
//      bindings). No API key required.
// If neither is configured, the endpoint returns a clear error explaining
// what to set up.
import { getSessionUser, json, unauthorized } from "../../../lib/auth.js";

const BRAND_CONTEXT = `Anda membantu menyusun draf SOP (Standard Operating Procedure) untuk SMK Muhammadiyah Todanan (SMK Muhada), sekolah menengah kejuruan di bawah Majelis Pendidikan Dasar dan Menengah (Dikdasmen) PCM Todanan, dengan dua program keahlian: Teknik Kendaraan Ringan/Teknik Otomotif (TKR/TO) dan Akuntansi dan Keuangan Lembaga (AKL).

Ikuti gaya bahasa dan nilai brand sekolah, "Muhada Berdaya": profesional, hangat, membangun (empowering), dan berlandaskan nilai keislaman serta kemuhammadiyahan. Bila relevan dengan isi SOP, cerminkan semangat lima dimensi Muhada Berdaya berikut secara wajar (tanpa menyebutnya secara eksplisit sebagai istilah teknis jika tidak perlu): Berdaya Budi (karakter & akhlak), Berdaya Pikir (nalar & kompetensi), Berdaya Cipta (kreativitas & inovasi), Berdaya Saing (profesionalisme & daya saing), Berdaya Sosial (kepedulian & kontribusi sosial).

Tulis draf SOP dalam Bahasa Indonesia baku dan formal ala dokumen administrasi sekolah, TANPA markdown dan TANPA tanda bintang, dengan format persis berikut:

1. Tujuan
(satu paragraf singkat)

2. Ruang Lingkup
(satu paragraf singkat)

3. Prosedur
(langkah-langkah bernomor seperti 3.1, 3.2, dst. — realistis, bisa dieksekusi staf sekolah, sekitar 5-8 langkah)

Jangan mengarang nama orang, tanggal, atau nomor Surat Keputusan (SK) — gunakan placeholder seperti [Nama Jabatan] atau [Nomor SK] bila diperlukan. Jangan menambahkan judul dokumen atau kalimat pembuka di luar format di atas.`;

async function generateWithClaude(env, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: BRAND_CONTEXT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error (status ${res.status}).`);

  const data = await res.json();
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function generateWithWorkersAI(env, userPrompt) {
  const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: BRAND_CONTEXT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 1500,
  });
  return (result && result.response ? result.response : "").trim();
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();

  const { title, bidang, instruksi } = await request.json().catch(() => ({}));
  if (!title || !bidang) {
    return json({ error: "Judul dan bidang wajib diisi sebelum membuat draf AI." }, 400);
  }

  let userPrompt = `Buatkan draf SOP dengan judul: "${title}"\nBidang: ${bidang}`;
  // Instruksi tambahan dari pengguna (mis. langkah tertentu yang perlu
  // ditekankan) — opsional, ditambahkan di prompt tapi tidak boleh
  // mengubah format keluaran yang sudah ditentukan di BRAND_CONTEXT.
  if (instruksi && String(instruksi).trim()) {
    userPrompt += `\n\nInstruksi tambahan dari pengguna (ikuti selama tidak bertentangan dengan format yang sudah ditentukan): ${String(instruksi).trim()}`;
  }

  try {
    let content;
    if (env.ANTHROPIC_API_KEY) {
      content = await generateWithClaude(env, userPrompt);
    } else if (env.AI) {
      content = await generateWithWorkersAI(env, userPrompt);
    } else {
      return json(
        {
          error:
            "Fitur AI belum aktif. Tambahkan binding Workers AI (gratis, Variable name \"AI\") atau environment variable ANTHROPIC_API_KEY di Settings project ini.",
        },
        500
      );
    }

    if (!content) return json({ error: "AI tidak mengembalikan isi draf. Coba lagi." }, 502);
    return json({ content });
  } catch (e) {
    return json({ error: "Gagal menghasilkan draf. Silakan coba lagi." }, 500);
  }
}
