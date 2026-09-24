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
        .map(
          (s) => `
      <tr onclick="window.location.href='/sop-detail.html?id=${s.id}'">
        <td style="font-weight:600">${s.title}</td>
        <td style="color:var(--muted)">${s.bidang}</td>
        <td style="color:var(--muted)">v${s.version}</td>
        <td><span class="badge badge-${s.status}">${STATUS_LABEL[s.status] || s.status}</span></td>
        <td style="color:var(--muted)">${fmtDate(s.valid_until)}</td>
        <td style="color:var(--muted)">${fmtDate(s.updated_at)}</td>
      </tr>`
        )
        .join("") || `<tr><td colspan="6" class="empty-state">Belum ada SOP yang cocok.</td></tr>`;
  }

  searchEl.addEventListener("input", () => load());
  statusEl.addEventListener("change", () => load());
  load();
})();
