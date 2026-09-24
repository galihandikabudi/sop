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
      <div class="stat-value" style="color:#C97A2B">${data.menunggu}</div>
    </div>
    <div class="card">
      <div class="stat-label">Perlu Ditinjau Ulang</div>
      <div class="stat-value" style="color:#B42318">${data.perluDitinjau}</div>
    </div>
    <div class="card">
      <div class="stat-label">Masa Berlaku &lt; 30 Hari</div>
      <div class="stat-value">${data.akanKedaluwarsa.length}</div>
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
        <div style="height:8px;background:#EDE9DD;border-radius:999px">
          <div style="height:8px;width:${(b.total / maxTotal) * 100}%;background:var(--primary);border-radius:999px"></div>
        </div>
      </div>`
      )
      .join("") || `<div class="empty-state">Belum ada data SOP.</div>`;

  document.getElementById("akan-kedaluwarsa").innerHTML =
    data.akanKedaluwarsa
      .map(
        (s) => `
      <a href="/sop-detail.html?id=${s.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#FBF6EC;border-radius:8px;text-decoration:none;color:inherit">
        <div>
          <div style="font-size:13.5px;font-weight:600">${s.title}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${s.bidang} · berlaku s.d. ${fmtDate(s.valid_until)}</div>
        </div>
      </a>`
      )
      .join("") || `<div class="empty-state">Tidak ada SOP yang perlu ditinjau.</div>`;
})();
