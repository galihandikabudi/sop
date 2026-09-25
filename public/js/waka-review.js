// public/js/waka-review.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  if (user.role !== "waka") {
    document.getElementById("body").innerHTML = `<div class="empty-state">Halaman ini khusus untuk Waka bidang.</div>`;
    return;
  }

  const bodyEl = document.getElementById("body");
  const subCount = document.getElementById("sub-count");

  const queue = await api("/sop?status=menunggu_review");
  subCount.textContent = `${queue.length} pengajuan SOP menunggu review Anda`;

  if (!queue.length) {
    bodyEl.innerHTML = `<div class="empty-state" style="flex:1">Tidak ada pengajuan yang menunggu saat ini.</div>`;
    return;
  }

  let selectedId = queue[0].id;

  async function renderPanel() {
    const detail = await api(`/sop/${selectedId}`);

    bodyEl.innerHTML = `
      <div style="flex:1.3;display:flex;flex-direction:column;gap:12px">
        ${queue
          .map(
            (s) => `
          <div class="card" style="cursor:pointer;${s.id === selectedId ? "border:2px solid var(--primary)" : ""}" data-id="${s.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:700;font-size:15px">${s.title}</div>
                <div style="font-size:12.5px;color:var(--muted);margin-top:3px">diajukan oleh ${s.created_by_name} · ${fmtDate(s.updated_at)}</div>
              </div>
              ${s.id === selectedId ? `<span class="badge" style="background:var(--pending-bg);color:var(--pending-text)">Sedang ditinjau</span>` : ""}
            </div>
          </div>`
          )
          .join("")}
      </div>

      <div class="card" style="width:400px;flex-shrink:0;display:flex;flex-direction:column;gap:16px">
        <div>
          <div style="font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px">Tinjau Pengajuan</div>
          <div class="serif" style="font-size:18px;font-weight:600">${detail.title}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Pengaju</span><span style="font-weight:600">${detail.created_by_name}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Diajukan</span><span style="font-weight:600">${fmtDate(detail.updated_at)}</span></div>
        </div>
        <a href="/sop-detail.html?id=${detail.id}" class="btn btn-secondary" style="justify-content:center">Baca dokumen lengkap</a>
        <div class="field">
          <label for="note">Catatan (wajib jika menolak)</label>
          <textarea id="note" rows="3" placeholder="Tulis catatan revisi jika diperlukan…"></textarea>
        </div>
        <div id="error" class="error-text" style="display:none"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-danger" style="flex:1;justify-content:center" id="reject-btn">Tolak</button>
          <button class="btn btn-primary" style="flex:1;justify-content:center" id="approve-btn">Setujui &amp; Teruskan</button>
        </div>
      </div>
    `;

    bodyEl.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => {
        selectedId = Number(el.dataset.id);
        renderPanel();
      });
    });

    document.getElementById("approve-btn").addEventListener("click", async () => {
      const errorEl = document.getElementById("error");
      try {
        await api(`/sop/${selectedId}/waka-approve`, {
          method: "POST",
          body: JSON.stringify({ note: document.getElementById("note").value || undefined }),
        });
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
      }
    });

    document.getElementById("reject-btn").addEventListener("click", async () => {
      const errorEl = document.getElementById("error");
      const note = document.getElementById("note").value;
      if (!note) {
        errorEl.textContent = "Isi catatan alasan penolakan terlebih dahulu.";
        errorEl.style.display = "block";
        return;
      }
      try {
        await api(`/sop/${selectedId}/waka-reject`, { method: "POST", body: JSON.stringify({ note }) });
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
      }
    });
  }

  renderPanel();
})();
