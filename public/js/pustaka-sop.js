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
  // Filter langsung dari kepala tabel: satu input/select per kolom.
  const searchEl = document.getElementById("search");
  const bidangEl = document.getElementById("filter-bidang");
  const docEl = document.getElementById("filter-doc");
  const versionEl = document.getElementById("filter-version");
  const dateEl = document.getElementById("filter-date");

  const bidangNames = await fetchBidangNames();
  bidangEl.innerHTML += bidangNames.map((b) => `<option value="${b}">${b}</option>`).join("");

  async function load() {
    // Judul & bidang difilter di server (endpoint sudah mendukungnya);
    // No. Dokumen, Versi, dan Berlaku Mulai difilter di sisi klien karena
    // datanya kecil dan supaya pencarian per-kolom bisa langsung terasa.
    const params = new URLSearchParams();
    if (searchEl.value) params.set("q", searchEl.value);
    if (bidangEl.value) params.set("bidang", bidangEl.value);

    let list = await api(`/sop/published?${params.toString()}`);

    const doc = docEl.value.trim().toLowerCase();
    const version = versionEl.value.trim().toLowerCase();
    const date = dateEl.value.trim().toLowerCase();
    if (doc) list = list.filter((s) => (s.doc_number || "").toLowerCase().includes(doc));
    if (version) list = list.filter((s) => String(s.version).toLowerCase().includes(version));
    if (date) list = list.filter((s) => fmtDate(s.valid_from).toLowerCase().includes(date));

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

  [searchEl, docEl, versionEl, dateEl].forEach((el) => el.addEventListener("input", () => load()));
  bidangEl.addEventListener("change", () => load());
  load();
})();
