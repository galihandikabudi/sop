// public/js/activity-log.js
const ACTION_LABEL = {
  create: "Membuat draf",
  update: "Mengubah draf",
  submit: "Mengajukan",
  waka_approve: "Waka menyetujui",
  waka_reject: "Waka menolak",
  approve: "Kepala Sekolah mengesahkan",
  reject: "Kepala Sekolah menolak",
  delete: "Menghapus",
  comment: "Berkomentar",
  user_create: "Membuat akun",
  user_update: "Mengubah akun",
  user_delete: "Menghapus akun",
};

(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const cardEl = document.getElementById("log-card");
  if (user.role !== "kepala_sekolah") {
    cardEl.innerHTML = `<div class="empty-state">Halaman ini khusus untuk Kepala Sekolah.</div>`;
    return;
  }

  const logs = await api("/activity-log?limit=200");

  cardEl.innerHTML =
    logs
      .map(
        (l) => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div>
        <div><strong>${l.actor_name}</strong> — ${ACTION_LABEL[l.action] || l.action}</div>
        ${l.detail ? `<div style="margin-top:2px">${l.detail}</div>` : ""}
        <div class="log-meta">${fmtDateTime(l.created_at)}</div>
      </div>
    </div>`
      )
      .join("") || `<div class="empty-state">Belum ada aktivitas tercatat.</div>`;
})();
