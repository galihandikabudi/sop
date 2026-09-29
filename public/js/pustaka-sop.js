// public/js/pustaka-sop.js
// Halaman "Pustaka SOP" — daftar semua SOP yang sudah berlaku (disahkan),
// bisa diakses siapa pun yang login, lintas bidang, dengan pencarian judul,
// filter bidang, dan tabel yang bisa diurutkan dengan mengklik judul kolom.
// Beda dari "Daftar SOP" yang dibatasi ke bidang sendiri dan menampilkan
// semua status termasuk draft/pengajuan.
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const rowsEl = document.getElementById("rows");
  const subCount = document.getElementById("sub-count");
  const searchEl = document.getElementById("search");
  const bidangEl = document.getElementById("filter-bidang");
  const sortableHeaders = document.querySelectorAll("th.sortable");

  const bidangNames = await fetchBidangNames();
  bidangEl.innerHTML += bidangNames.map((b) => `<option value="${b}">${b}</option>`).join("");

  // Urutan default: judul, A→Z.
  let sortKey = "title";
  let sortDir = "asc";

  function applySort(list) {
    const sorted = [...list].sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === "version") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (sortKey === "valid_from") {
        va = va || "";
        vb = vb || "";
      } else {
        va = (va || "").toString().toLowerCase();
        vb = (vb || "").toString().toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function updateSortIndicators() {
    sortableHeaders.forEach((th) => {
      if (th.dataset.sort === sortKey) {
        th.dataset.sortDir = sortDir;
        th.querySelector(".sort-arrow").textContent = sortDir === "asc" ? "↑" : "↓";
      } else {
        th.removeAttribute("data-sort-dir");
        th.querySelector(".sort-arrow").textContent = "↕";
      }
    });
  }

  async function load() {
    const params = new URLSearchParams();
    if (searchEl.value) params.set("q", searchEl.value);
    if (bidangEl.value) params.set("bidang", bidangEl.value);

    const list = await api(`/sop/published?${params.toString()}`);
    const sorted = applySort(list);
    updateSortIndicators();

    subCount.textContent = `${sorted.length} SOP berlaku ditemukan`;

    rowsEl.innerHTML =
      sorted
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

  sortableHeaders.forEach((th) => {
    th.addEventListener("click", () => {
      if (sortKey === th.dataset.sort) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = th.dataset.sort;
        sortDir = "asc";
      }
      load();
    });
  });

  searchEl.addEventListener("input", () => load());
  bidangEl.addEventListener("change", () => load());
  load();
})();
