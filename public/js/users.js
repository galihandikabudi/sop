// public/js/users.js
const ROLE_LABEL = { kepala_sekolah: "Kepala Sekolah", waka: "Waka Bidang", staff: "Staf" };

(async function () {
  const me = await renderSidebar();
  if (!me) return;

  if (me.role !== "kepala_sekolah") {
    document.querySelector(".main").innerHTML = `<div class="empty-state">Halaman ini khusus untuk Kepala Sekolah.</div>`;
    return;
  }

  const form = document.getElementById("form");
  const formTitle = document.getElementById("form-title");
  const submitBtn = document.getElementById("submit-btn");
  const cancelBtn = document.getElementById("cancel-edit-btn");
  const roleSelect = document.getElementById("role");
  const bidangField = document.getElementById("bidang-field");
  const bidangSelect = document.getElementById("bidang");
  const passwordInput = document.getElementById("password");
  const passwordLabel = document.getElementById("password-label");
  const errorEl = document.getElementById("error");

  bidangSelect.innerHTML = BIDANG_LIST.map((b) => `<option value="${b}">${b}</option>`).join("");

  let editingId = null;

  function toggleBidangField() {
    bidangField.style.display = roleSelect.value === "kepala_sekolah" ? "none" : "";
    bidangSelect.required = roleSelect.value !== "kepala_sekolah";
  }
  roleSelect.addEventListener("change", toggleBidangField);
  toggleBidangField();

  function resetForm() {
    editingId = null;
    form.reset();
    toggleBidangField();
    formTitle.textContent = "Tambah Akun";
    submitBtn.textContent = "Buat Akun";
    cancelBtn.style.display = "none";
    passwordLabel.textContent = "Password Awal";
    passwordInput.placeholder = "";
    passwordInput.required = true;
    errorEl.style.display = "none";
  }

  function startEdit(u) {
    editingId = u.id;
    document.getElementById("name").value = u.name;
    document.getElementById("email").value = u.email;
    roleSelect.value = u.role;
    toggleBidangField();
    bidangSelect.value = u.bidang || "";
    passwordInput.value = "";
    passwordInput.required = false;
    passwordLabel.textContent = "Password Baru";
    passwordInput.placeholder = "Kosongkan jika tidak diubah";
    formTitle.textContent = `Edit Akun — ${u.name}`;
    submitBtn.textContent = "Simpan Perubahan";
    cancelBtn.style.display = "";
    errorEl.style.display = "none";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cancelBtn.addEventListener("click", () => resetForm());

  async function loadUsers() {
    const list = await api("/users");
    document.getElementById("rows").innerHTML =
      list
        .map(
          (u) => `
      <tr style="cursor:default">
        <td style="font-weight:600">${u.name}</td>
        <td style="color:var(--muted)">${u.email}</td>
        <td style="color:var(--muted)">${u.bidang || "—"}</td>
        <td>${ROLE_LABEL[u.role] || u.role}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn" style="padding:6px 10px;font-size:12px" data-edit-id="${u.id}">Edit</button>
          ${
            u.id === me.id
              ? ""
              : `<button class="btn btn-danger" style="padding:6px 10px;font-size:12px;margin-left:6px" data-delete-id="${u.id}" data-delete-name="${u.name.replace(/"/g, "&quot;")}">Hapus</button>`
          }
        </td>
      </tr>`
        )
        .join("") || `<tr><td colspan="5" class="empty-state">Belum ada pengguna.</td></tr>`;

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = list.find((x) => String(x.id) === btn.dataset.editId);
        if (u) startEdit(u);
      });
    });

    document.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.deleteId;
        const name = btn.dataset.deleteName;
        if (!confirm(`Hapus akun "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        try {
          await api(`/users/${id}`, { method: "DELETE" });
          if (editingId === Number(id)) resetForm();
          loadUsers();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    const payload = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      bidang: roleSelect.value === "kepala_sekolah" ? null : bidangSelect.value,
      role: roleSelect.value,
      password: passwordInput.value,
    };
    try {
      if (editingId) {
        await api(`/users/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/users", { method: "POST", body: JSON.stringify(payload) });
      }
      resetForm();
      loadUsers();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });

  loadUsers();
})();
