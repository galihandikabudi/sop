// public/js/sop-detail.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const errorEl = document.getElementById("error");
  const contentEl = document.getElementById("content");

  let sop;
  try {
    sop = await api(`/sop/${id}`);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    return;
  }

  const isOwnerOrAdmin = sop.created_by === user.id || user.role === "kepala_sekolah";
  const isDraft = sop.status === "draft";
  const isBerlaku = sop.status === "berlaku";
  const daysLeft = sop.valid_until
    ? Math.ceil((new Date(sop.valid_until) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  function render() {
    contentEl.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:18px;min-width:0">
        <div style="font-size:13px;color:var(--muted)">
          <a href="/sop-list.html" style="font-weight:600;text-decoration:none;color:inherit">Daftar SOP</a> / ${sop.bidang}
        </div>

        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span class="badge badge-${sop.status}">${STATUS_LABEL[sop.status] || sop.status}</span>
              <span style="color:var(--muted);font-size:12.5px">Versi ${sop.version}${sop.valid_until ? " · berlaku s.d. " + fmtDate(sop.valid_until) : ""}</span>
            </div>
            <h1 class="serif" style="margin:0;font-size:24px;font-weight:600;max-width:520px">${sop.title}</h1>
            <div style="color:var(--muted);font-size:13px;margin-top:6px">Bidang ${sop.bidang} · Dibuat oleh ${sop.created_by_name}</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0" id="actions"></div>
        </div>

        ${isBerlaku && daysLeft !== null && daysLeft < 30 ? `
        <div class="card" style="background:#FBF6EC;border-color:#F0DEBF">
          <div style="font-weight:700;font-size:13.5px;color:var(--warn-text)">Perlu ditinjau ulang</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:4px">
            ${daysLeft <= 0 ? "Masa berlaku dokumen ini sudah lewat." : `Masa berlaku berakhir dalam ${daysLeft} hari.`}
          </div>
        </div>` : ""}

        <div class="card" id="body-card"></div>
      </div>

      <div style="width:320px;flex-shrink:0;display:flex;flex-direction:column;gap:16px">
        ${isBerlaku ? `
        <div class="card" id="read-card">
          <div style="font-weight:700;font-size:13.5px;margin-bottom:8px">Konfirmasi Baca</div>
          <div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:10px">
            Konfirmasi bahwa Anda telah membaca dan memahami SOP ini.
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer">
            <input type="checkbox" id="read-checkbox" style="width:17px;height:17px" ${sop.hasConfirmedRead ? "checked disabled" : ""}>
            ${sop.hasConfirmedRead ? "Sudah dikonfirmasi" : "Saya telah membaca SOP ini"}
          </label>
        </div>` : ""}

        <div class="card">
          <div style="font-weight:700;font-size:13.5px;margin-bottom:12px">Riwayat Versi</div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${sop.versions
              .map(
                (v) => `
              <div style="display:flex;gap:10px">
                <div style="width:8px;height:8px;border-radius:999px;background:var(--primary);margin-top:5px;flex-shrink:0"></div>
                <div>
                  <div style="font-size:13px;font-weight:600">v${v.version} — ${STATUS_LABEL[v.status] || v.status}</div>
                  <div style="font-size:12px;color:var(--muted)">${fmtDate(v.created_at)}${v.actor_name ? " · " + v.actor_name : ""}</div>
                  ${v.note ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${v.note}</div>` : ""}
                </div>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    // Body: editable textarea if draft & owner, else plain text
    const bodyCard = document.getElementById("body-card");
    if (isDraft && isOwnerOrAdmin) {
      bodyCard.innerHTML = `
        <div class="field">
          <label for="edit-content">Isi SOP</label>
          <textarea id="edit-content" rows="16">${sop.content}</textarea>
        </div>
        <button class="btn btn-secondary" id="save-btn" style="margin-top:12px">Simpan Perubahan</button>
      `;
      document.getElementById("save-btn").addEventListener("click", async () => {
        await api(`/sop/${id}`, {
          method: "PUT",
          body: JSON.stringify({ content: document.getElementById("edit-content").value }),
        });
        window.location.reload();
      });
    } else {
      bodyCard.innerHTML = `<div style="white-space:pre-line;font-size:13.5px;line-height:1.7;color:#3A423F">${sop.content || "(Belum ada isi.)"}</div>`;
    }

    // Actions
    const actions = document.getElementById("actions");
    let actionsHtml = "";
    if (isDraft && isOwnerOrAdmin) {
      actionsHtml += `<button class="btn btn-primary" id="submit-btn">Ajukan Persetujuan</button>`;
    }
    if (sop.status === "menunggu_persetujuan" && user.role === "kepala_sekolah") {
      actionsHtml += `<a href="/approvals.html" class="btn btn-primary">Tinjau di Antrean Persetujuan</a>`;
    }
    actions.innerHTML = actionsHtml;

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        submitBtn.disabled = true;
        await api(`/sop/${id}/submit`, { method: "POST" });
        window.location.reload();
      });
    }

    const readCheckbox = document.getElementById("read-checkbox");
    if (readCheckbox && !sop.hasConfirmedRead) {
      readCheckbox.addEventListener("change", async () => {
        if (!readCheckbox.checked) return;
        readCheckbox.disabled = true;
        await api(`/sop/${id}/confirm-read`, { method: "POST" });
      });
    }
  }

  render();
})();
