// lib/auth.js
// Password hashing (PBKDF2 via Web Crypto — available in the Cloudflare
// Workers/Pages runtime, no external dependency needed) and session
// helpers shared by every API route.

const ITERATIONS = 100000;
const SESSION_DAYS = 7;

function toB64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${toB64(salt)}:${toB64(bits)}`;
}

export async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = (stored || "").split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = fromB64(saltB64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toB64(bits) === hashB64;
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export async function createSession(env, userId) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(id, userId, expiresAt).run();
  return { id, expiresAt };
}

export function sessionCookie(id, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `session=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export async function getSessionUser(request, env) {
  const cookies = parseCookies(request);
  const sessionId = cookies["session"];
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.bidang, b.jabatan_label, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     LEFT JOIN bidang b ON b.name = u.bidang
     WHERE s.id = ?`
  ).bind(sessionId).first();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }
  // jabatan_label: sebutan jabatan khusus untuk bidang akun ini (dikelola di
  // halaman Pengaturan), dipakai di tempat yang sebelumnya selalu menampilkan
  // "Waka {bidang}" (mis. sidebar) supaya sebutan bisa disesuaikan per bidang
  // (Kepala Tata Usaha, Bendahara, Koordinator BKK, dst.).
  return { id: row.id, name: row.name, email: row.email, role: row.role, bidang: row.bidang, jabatan_label: row.jabatan_label };
}

/** Throws a Response-like error object the route can return directly. */
export function unauthorized(message = "Belum login") {
  return json({ error: message }, 401);
}
export function forbidden(message = "Tidak memiliki akses") {
  return json({ error: message }, 403);
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
