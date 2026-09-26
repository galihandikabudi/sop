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
    user.role === "kepala_sekolah"
      ? "Kepala Sekolah"
      : user.role === "waka"
      ? wakaTitle(user.bidang, user.jabatan_label)
      : user.bidang;

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
      <a href="/pustaka-sop.html" class="${isActive("/pustaka-sop.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Pustaka SOP
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
      </a>
      <a href="/settings.html" class="${isActive("/settings.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Pengaturan
      </a>` : ""}
      <a href="/account.html" class="${isActive("/account.html")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
        Akun Saya
      </a>
    </nav>
    <a href="/account.html" class="user" style="text-decoration:none">
      <div class="avatar">${initials}</div>
      <div>
        <div class="name">${user.name}</div>
        <div class="role">${roleLabel}</div>
      </div>
    </a>
    <button class="logout" id="logout-btn">Keluar</button>
  `;

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    window.location.href = "/index.html";
  });

  return user;
}
