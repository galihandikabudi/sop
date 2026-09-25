// public/js/dashboard.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const data = await api("/dashboard");

  document.getElementById("stats").innerHTML = `
    <div class="card">
      <div class="stat-label">SOP Berlaku</div>
      <div class="stat-value">${data.totalBerlaku}</div>
    </div>
    <div class="card">
      <div class="stat-label">Menunggu Persetujuan</div>
      <div class="stat-value" style="color:var(--oranye)">${data.menunggu}</div>
    </div>
    <div class="card">
      <div class="stat-label">Draft Belum Diajukan</div>
      <div class="stat-value" style="color:var(--muted)">${data.draft}</div>
    </div>
    <div class="card">
      <div class="stat-label">Bidang Terpantau</div>
      <div class="stat-value">${data.perBidang.length}</div>
    </div>
  `;

  const maxTotal = Math.max(1, ...data.perBidang.map((b) => b.total));
  document.getElementById("per-bidang").innerHTML =
    data.perBidang
      .map(
        (b) => `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>${b.bidang}</span><span style="font-weight:600">${b.aktif}/${b.total}</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:999px">
          <div style="height:8px;width:${(b.total / maxTotal) * 100}%;background:var(--primary);border-radius:999px"></div>
        </div>
      </div>`
      )
      .join("") || `<div class="empty-state">Belum ada data SOP.</div>`;

  // SOP yang sudah berlaku tidak punya tanggal kedaluwarsa — daftar ini
  // murni informasional: SOP aktif yang paling lama belum direvisi, supaya
  // Kepala Sekolah tahu mana yang mungkin layak ditinjau ulang, tanpa
  // tenggat atau peringatan.
  document.getElementById("aktif-terlama").innerHTML =
    data.aktifTerlama
      .map((s) => {
        const umur = daysLeft(s.valid_from) * -1;
        return `
      <a href="/sop-detail.html?id=${s.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg);border-radius:8px;text-decoration:none;color:inherit">
        <div>
          <div style="font-size:13.5px;font-weight:600">${s.title}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${s.bidang} · berlaku mulai ${fmtDate(s.valid_from)}</div>
        </div>
        <span class="badge" style="background:var(--border);color:var(--muted)">${umur > 0 ? umur + " hari" : "baru"}</span>
      </a>`;
      })
      .join("") || `<div class="empty-state">Belum ada SOP yang berlaku.</div>`;
})();
