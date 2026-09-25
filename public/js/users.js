// public/js/users.js
const ROLE_LABEL = { kepala_sekolah: "Kepala Sekolah", waka: "Waka Bidang", staff: "Staf" };

(async function () {
  const me = await renderSidebar();
  if (!me) return;

  if (me.role !== "kepala_sekolah") {
    document.querySelector(".main").innerHTML = `<div class="empty-state">Halaman ini khusus untuk Kepala Sekolah.</div>`;
    return;
  }

  const overlay = document.getElementById("modal-overlay");
  const form = document.getElementById("form");
  const formTitle = document.getElementById("form-title");
  const submitBtn = document.getElementById("submit-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const addBtn = document.getElementById("add-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const roleSelect = document.getElementById("role");
  const bidangField = document.getElementById("bidang-field");
  const bidangSelect = document.getElementById("bidang");
  const passwordInput = document.getElementById("password");
  const passwordLabel = document.getElementById("password-label");
  const errorEl = document.getElementById("error");

  bidangSelect.innerHTML = (await fetchBidangNames()).map((b) => `<option value="${b}">${b}</option>`).join("");

  let editingId = null;
  let userList = [];

  function toggleBidangField() {
    bidangField.style.display = roleSelect.value === "kepala_sekolah" ? "none" : "";
    bidangSelect.required = roleSelect.value !== "kepala_sekolah";
  }
  roleSelect.addEventListener("change", toggleBidangField);

  function openModal() {
    overlay.classList.add("open");
  }
  function closeModal() {
    overlay.classList.remove("open");
  }

  function resetForm() {
    editingId = null;
    form.reset();
    toggleBidangField();
    formTitle.textContent = "Tambah Akun";
    submitBtn.textContent = "Buat Akun";
    deleteBtn.style.display = "none";
    passwordLabel.textContent = "Password Awal";
    passwordInput.placeholder = "";
    passwordInput.required = true;
    errorEl.style.display = "none";
  }

  function startAdd() {
    resetForm();
    openModal();
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
    deleteBtn.style.display = u.id === me.id ? "none" : "";
    errorEl.style.display = "none";
    openModal();
  }

  addBtn.addEventListener("click", startAdd);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  async function loadUsers() {
    userList = await api("/users");
    document.getElementById("rows").innerHTML =
      userList
        .map(
          (u) => `
      <tr style="cursor:default">
        <td style="font-weight:600">${u.name}</td>
        <td style="color:var(--muted)">${u.email}</td>
        <td style="color:var(--muted)">${u.bidang || "—"}</td>
        <td>${ROLE_LABEL[u.role] || u.role}</td>
        <td style="text-align:right">
          <button class="btn" style="padding:6px 10px;font-size:12px" data-edit-id="${u.id}">Edit</button>
        </td>
      </tr>`
        )
        .join("") || `<tr><td colspan="5" class="empty-state">Belum ada pengguna.</td></tr>`;

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = userList.find((x) => String(x.id) === btn.dataset.editId);
        if (u) startEdit(u);
      });
    });
  }

  deleteBtn.addEventListener("click", async () => {
    const u = userList.find((x) => x.id === editingId);
    if (!u) return;
    if (!confirm(`Hapus akun "${u.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    deleteBtn.disabled = true;
    try {
      await api(`/users/${editingId}`, { method: "DELETE" });
      closeModal();
      loadUsers();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    } finally {
      deleteBtn.disabled = false;
    }
  });

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
      closeModal();
      loadUsers();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });

  resetForm();
  loadUsers();
})();
