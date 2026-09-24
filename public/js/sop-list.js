// public/js/sop-list.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const rowsEl = document.getElementById("rows");
  const subCount = document.getElementById("sub-count");
  const searchEl = document.getElementById("search");
  const statusEl = document.getElementById("filter-status");

  async function load() {
    const params = new URLSearchParams();
    if (searchEl.value) params.set("q", searchEl.value);
    if (statusEl.value) params.set("status", statusEl.value);

    const list = await api(`/sop?${params.toString()}`);
    subCount.textContent = `${list.length} dokumen ditemukan`;

    rowsEl.innerHTML =
      list
        .map((s) => {
          const badge = effectiveBadge(s);
          const canDelete = user.role === "kepala_sekolah" || (s.created_by === user.id && s.status === "draft");
          return `
      <tr onclick="window.location.href='/sop-detail.html?id=${s.id}'">
        <td style="font-weight:600">${s.title}</td>
        <td style="color:var(--muted)">${s.bidang}</td>
        <td style="color:var(--muted)">v${s.version}</td>
        <td><span class="badge badge-${badge.cls}">${badge.label}</span></td>
        <td style="color:var(--muted)">${fmtDate(s.valid_until)}</td>
        <td style="color:var(--muted)">${fmtDate(s.updated_at)}</td>
        <td style="text-align:right">${
          canDelete
            ? `<button class="btn btn-danger" style="padding:6px 10px;font-size:12px" data-delete-id="${s.id}" data-delete-title="${s.title.replace(/"/g, "&quot;")}">Hapus</button>`
            : ""
        }</td>
      </tr>`;
        })
        .join("") || `<tr><td colspan="7" class="empty-state">Belum ada SOP yang cocok.</td></tr>`;

    rowsEl.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        const title = btn.dataset.deleteTitle;
        if (!confirm(`Hapus SOP "${title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        try {
          await api(`/sop/${id}/delete`, { method: "POST" });
          load();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  searchEl.addEventListener("input", () => load());
  statusEl.addEventListener("change", () => load());
  load();
})();
