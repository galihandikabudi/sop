// public/js/sidebar.js
async function renderSidebar() {
  const user = await requireUser();
  if (!user) return null;

  const path = window.location.pathname;
  const isActive = (p) => (path === p ? "active" : "");
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  let pendingCount = "";
  if (user.role === "kepala_sekolah") {
    try {
      const list = await api("/sop?status=menunggu_persetujuan");
      if (list.length) pendingCount = `<span class="badge-count">${list.length}</span>`;
    } catch {}
  }

  let wakaPendingCount = "";
  if (user.role === "waka") {
    try {
      const list = await api("/sop?status=menunggu_review");
      if (list.length) wakaPendingCount = `<span class="badge-count">${list.length}</span>`;
    } catch {}
  }

  const roleLabel =
    user.role === "kepala_sekolah" ? "Kepala Sekolah" : user.role === "waka" ? `Waka · ${user.bidang}` : user.bidang;

  document.getElementById("sidebar").innerHTML = `
    <div>
      <div class="brand-title">SOP Muhada</div>
      <div class="brand-sub">SMK Muhammadiyah Todanan</div>
    </div>
    <nav>
      <a href="/dashboard.html" class="${isActive("/dashboard.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/></svg>
        Beranda
      </a>
      <a href="/sop-list.html" class="${isActive("/sop-list.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Daftar SOP
      </a>
      ${user.role === "waka" ? `
      <a href="/waka-review.html" class="${isActive("/waka-review.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Tinjauan Waka ${wakaPendingCount}
      </a>` : ""}
      ${user.role === "kepala_sekolah" ? `
      <a href="/approvals.html" class="${isActive("/approvals.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Persetujuan ${pendingCount}
      </a>
      <a href="/users.html" class="${isActive("/users.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        Pengguna
      </a>
      <a href="/activity-log.html" class="${isActive("/activity-log.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
        Log Aktivitas
      </a>` : ""}
    </nav>
    <div class="user">
      <div class="avatar">${initials}</div>
      <div>
        <div class="name">${user.name}</div>
        <div class="role">${roleLabel}</div>
      </div>
    </div>
    <button class="logout" id="logout-btn">Keluar</button>
  `;

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    window.location.href = "/index.html";
  });

  return user;
}
