// public/js/settings.js
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
  const nameInput = document.getElementById("name");
  const codeInput = document.getElementById("code");
  const jabatanLabelInput = document.getElementById("jabatan_label");
  const errorEl = document.getElementById("error");

  let editingId = null;
  let bidangList = [];

  function openModal() {
    overlay.classList.add("open");
  }
  function closeModal() {
    overlay.classList.remove("open");
  }

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = "Tambah Bidang";
    submitBtn.textContent = "Tambah Bidang";
    deleteBtn.style.display = "none";
    errorEl.style.display = "none";
  }

  function startAdd() {
    resetForm();
    openModal();
  }

  function startEdit(b) {
    editingId = b.id;
    nameInput.value = b.name;
    codeInput.value = b.code || "";
    jabatanLabelInput.value = b.jabatan_label || "";
    formTitle.textContent = `Edit Bidang — ${b.name}`;
    submitBtn.textContent = "Simpan Perubahan";
    deleteBtn.style.display = "";
    errorEl.style.display = "none";
    openModal();
  }

  addBtn.addEventListener("click", startAdd);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  async function loadBidang() {
    bidangList = await api("/bidang");
    document.getElementById("rows").innerHTML =
      bidangList
        .map(
          (b) => `
      <tr style="cursor:default">
        <td style="font-weight:600">${b.name}</td>
        <td style="color:var(--muted)">${b.code || "—"}</td>
        <td style="color:var(--muted)">${b.jabatan_label || `Waka ${b.name} (default)`}</td>
        <td style="text-align:right">
          <button class="btn" style="padding:6px 10px;font-size:12px" data-edit-id="${b.id}">Edit</button>
        </td>
      </tr>`
        )
        .join("") || `<tr><td colspan="3" class="empty-state">Belum ada bidang.</td></tr>`;

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const b = bidangList.find((x) => String(x.id) === btn.dataset.editId);
        if (b) startEdit(b);
      });
    });
  }

  deleteBtn.addEventListener("click", async () => {
    const b = bidangList.find((x) => x.id === editingId);
    if (!b) return;
    if (!confirm(`Hapus bidang "${b.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    deleteBtn.disabled = true;
    try {
      await api(`/bidang/${editingId}`, { method: "DELETE" });
      closeModal();
      loadBidang();
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
    const payload = { name: nameInput.value, code: codeInput.value, jabatan_label: jabatanLabelInput.value };
    try {
      if (editingId) {
        await api(`/bidang/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/bidang", { method: "POST", body: JSON.stringify(payload) });
      }
      closeModal();
      loadBidang();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });

  resetForm();
  loadBidang();
})();
