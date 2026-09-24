// lib/log.js
// Best-effort audit logging — a logging failure must never break the
// action it's describing, so every call is wrapped in try/catch.
export async function logActivity(env, { actorId, actorName, action, entityType, entityId, detail }) {
  try {
    await env.DB.prepare(
      `INSERT INTO activity_log (actor_id, actor_name, action, entity_type, entity_id, detail)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(actorId || null, actorName || "?", action, entityType, entityId || null, detail || null)
      .run();
  } catch (e) {
    // Swallow — logging is not allowed to break the primary request.
  }
}
