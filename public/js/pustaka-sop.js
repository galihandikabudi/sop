// public/js/pustaka-sop.js
// Halaman "Pustaka SOP" — daftar semua SOP yang sudah berlaku (disahkan),
// bisa diakses siapa pun yang login, lintas bidang, dengan pencarian judul
// dan filter bidang. Beda dari "Daftar SOP" yang dibatasi ke bidang sendiri
// dan menampilkan semua status termasuk draft/pengajuan.
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const rowsEl = document.getElementById("rows");
  const subCount = document.getElementById("sub-count");
  const searchEl = document.getElementById("search");
  const bidangEl = document.getElementById("filter-bidang");

  const bidangNames = await fetchBidangNames();
  bidangEl.innerHTML += bidangNames.map((b) => `<option value="${b}">${b}</option>`).join("");

  async function load() {
    const params = new URLSearchParams();
    if (searchEl.value) params.set("q", searchEl.value);
    if (bidangEl.value) params.set("bidang", bidangEl.value);

    const list = await api(`/sop/published?${params.toString()}`);
    subCount.textContent = `${list.length} SOP berlaku ditemukan`;

    rowsEl.innerHTML =
      list
        .map(
          (s) => `
      <tr onclick="window.location.href='/sop-detail.html?id=${s.id}'">
        <td style="font-weight:600">${s.title}</td>
        <td style="color:var(--muted)">${s.bidang}</td>
        <td style="color:var(--muted)">${s.doc_number || "—"}</td>
        <td style="color:var(--muted)">v${s.version}</td>
        <td style="color:var(--muted)">${fmtDate(s.valid_from)}</td>
      </tr>`
        )
        .join("") || `<tr><td colspan="5" class="empty-state">Belum ada SOP yang berlaku dan cocok dengan pencarian.</td></tr>`;
  }

  searchEl.addEventListener("input", () => load());
  bidangEl.addEventListener("change", () => load());
  load();
})();
