// public/js/approvals.js
(async function () {
  const user = await renderSidebar();
  if (!user) return;

  if (user.role !== "kepala_sekolah") {
    document.getElementById("body").innerHTML = `<div class="empty-state">Halaman ini khusus untuk Kepala Sekolah.</div>`;
    return;
  }

  const bodyEl = document.getElementById("body");
  const subCount = document.getElementById("sub-count");

  // Kepala Sekolah bisa langsung menyetujui/menolak SOP baik yang sudah
  // di-ACC Waka ("menunggu_persetujuan") maupun yang belum sempat direview
  // sama sekali ("menunggu_review") — gabungkan kedua antrean di sini, dan
  // beri tanda "Belum diperiksa" pada item yang masih menunggu_review supaya
  // Kepala Sekolah tahu sebelum mengesahkan.
  const [reviewQueue, approvalQueue] = await Promise.all([
    api("/sop?status=menunggu_review"),
    api("/sop?status=menunggu_persetujuan"),
  ]);
  const queue = [...approvalQueue, ...reviewQueue].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  subCount.textContent = `${queue.length} pengajuan SOP menunggu tinjauan Anda`;

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
                <div style="font-size:12.5px;color:var(--muted);margin-top:3px">${s.bidang} · diajukan oleh ${s.created_by_name} · ${fmtDate(s.updated_at)}</div>
              </div>
              ${
                s.status === "menunggu_review"
                  ? `<span class="badge" style="background:var(--danger-bg,#fdecea);color:var(--danger-text,#b3261e)">Belum diperiksa</span>`
                  : s.id === selectedId
                  ? `<span class="badge" style="background:var(--pending-bg);color:var(--pending-text)">Sedang ditinjau</span>`
                  : ""
              }
            </div>
          </div>`
          )
          .join("")}
      </div>

      <div class="card" style="width:400px;flex-shrink:0;display:flex;flex-direction:column;gap:16px">
        <div>
          <div style="font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px">Tinjau Pengajuan</div>
          <div class="serif" style="font-size:18px;font-weight:600">${detail.title}</div>
          ${
            detail.status === "menunggu_review"
              ? `<div style="margin-top:8px;padding:10px 12px;border-radius:8px;background:var(--danger-bg,#fdecea);color:var(--danger-text,#b3261e);font-size:12.5px;font-weight:600">
                   ⚠️ SOP ini belum diperiksa/di-ACC oleh Waka atau Pemeriksa. Anda dapat tetap mengesahkannya langsung, tapi pastikan sudah membaca isinya.
                 </div>`
              : ""
          }
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Bidang</span><span style="font-weight:600">${detail.bidang}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Pengaju</span><span style="font-weight:600">${detail.created_by_name}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Diajukan</span><span style="font-weight:600">${fmtDate(detail.updated_at)}</span></div>
        </div>
        <a href="/sop-detail.html?id=${detail.id}" class="btn btn-secondary" style="justify-content:center">Baca dokumen lengkap</a>
        <div class="field">
          <label for="valid-from">Berlaku mulai</label>
          <input type="date" id="valid-from" value="${new Date().toISOString().slice(0, 10)}">
          <div style="font-size:11.5px;color:var(--muted)">Tanggal efektif SOP ini mulai berlaku. Tidak ada tanggal kedaluwarsa — versi ini akan tetap aktif sampai digantikan versi yang lebih baru.</div>
        </div>
        <div class="field">
          <label for="note">Catatan (wajib jika menolak)</label>
          <textarea id="note" rows="3" placeholder="Tulis catatan revisi jika diperlukan…"></textarea>
        </div>
        <div id="error" class="error-text" style="display:none"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-danger" style="flex:1;justify-content:center" id="reject-btn">Tolak</button>
          <button class="btn btn-primary" style="flex:1;justify-content:center" id="approve-btn">Setujui &amp; Sahkan</button>
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
      if (
        detail.status === "menunggu_review" &&
        !window.confirm(
          "SOP ini belum diperiksa/di-ACC oleh Waka atau Pemeriksa. Anda akan mengesahkannya langsung tanpa proses review tersebut. Lanjutkan?"
        )
      ) {
        return;
      }
      try {
        await api(`/sop/${selectedId}/approve`, {
          method: "POST",
          body: JSON.stringify({
            valid_from: document.getElementById("valid-from").value || undefined,
            note: document.getElementById("note").value || undefined,
          }),
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
        await api(`/sop/${selectedId}/reject`, { method: "POST", body: JSON.stringify({ note }) });
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
      }
    });
  }

  renderPanel();
})();
