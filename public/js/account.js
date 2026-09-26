// public/js/account.js
const ROLE_LABEL_ACCOUNT = { kepala_sekolah: "Kepala Sekolah", waka: "Waka Bidang", staff: "Staf" };

(async function () {
  const user = await renderSidebar();
  if (!user) return;

  document.getElementById("info-email").textContent = user.email;
  document.getElementById("info-role").textContent =
    user.role === "waka" ? wakaTitle(user.bidang, user.jabatan_label) : (ROLE_LABEL_ACCOUNT[user.role] || user.role) + (user.bidang ? ` · ${user.bidang}` : "");
  document.getElementById("name").value = user.name;

  const form = document.getElementById("form");
  const errorEl = document.getElementById("error");
  const successEl = document.getElementById("success");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    successEl.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan…";

    try {
      await api("/account", {
        method: "PUT",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          currentPassword: document.getElementById("current-password").value,
          newPassword: document.getElementById("new-password").value || undefined,
        }),
      });
      document.getElementById("current-password").value = "";
      document.getElementById("new-password").value = "";
      successEl.textContent = "Perubahan berhasil disimpan.";
      successEl.style.display = "block";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan Perubahan";
    }
  });
})();
