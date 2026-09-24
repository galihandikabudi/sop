// public/js/users.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  if (user.role !== "kepala_sekolah") {
    document.querySelector(".main").innerHTML = `<div class="empty-state">Halaman ini khusus untuk Kepala Sekolah.</div>`;
    return;
  }

  const bidangSelect = document.getElementById("bidang");
  bidangSelect.innerHTML = BIDANG_LIST.map((b) => `<option value="${b}">${b}</option>`).join("");

  async function loadUsers() {
    const list = await api("/users");
    document.getElementById("rows").innerHTML = list
      .map(
        (u) => `
      <tr style="cursor:default">
        <td style="font-weight:600">${u.name}</td>
        <td style="color:var(--muted)">${u.email}</td>
        <td style="color:var(--muted)">${u.bidang || "—"}</td>
        <td>${u.role === "kepala_sekolah" ? "Kepala Sekolah" : "Staf"}</td>
      </tr>`
      )
      .join("");
  }

  document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error");
    errorEl.style.display = "none";
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          bidang: bidangSelect.value,
          password: document.getElementById("password").value,
        }),
      });
      e.target.reset();
      loadUsers();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });

  loadUsers();
})();
