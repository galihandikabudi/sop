// public/js/rich-editor.js
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Turns plain text into simple HTML paragraphs, automatically making
// top-level numbered section headers (e.g. "1. Tujuan", "2. Ruang Lingkup")
// bold and larger — but leaving sub-steps like "3.1 ..." as normal text.
function autoFormatSopHtml(text) {
  const lines = String(text || "").split(/\r?\n/);
  let html = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isTopLevelHeading = /^\d{1,2}\.\s+\S/.test(line);
    html += isTopLevelHeading
      ? `<p class="sop-heading">${escapeHtml(line)}</p>`
      : `<p>${escapeHtml(line)}</p>`;
  }
  return html || "<p></p>";
}

// If content already looks like HTML (from the rich editor), use it as-is;
// otherwise (older plain-text drafts) run it through the auto-formatter.
function toDisplayHtml(content) {
  if (!content) return "";
  return /<[a-z][\s\S]*>/i.test(content) ? content : autoFormatSopHtml(content);
}

function richEditorToolbarHtml() {
  return `
    <button type="button" data-cmd="bold" title="Tebal"><b>B</b></button>
    <button type="button" data-cmd="italic" title="Miring"><i>I</i></button>
    <button type="button" data-cmd="underline" title="Garis bawah"><u>U</u></button>
    <button type="button" data-cmd="insertUnorderedList" title="Daftar bullet">• List</button>
    <button type="button" data-cmd="insertOrderedList" title="Daftar bernomor">1. List</button>
    <button type="button" id="auto-format-btn" title="Format otomatis judul bernomor (1. 2. 3. ...)">Format Otomatis</button>
  `;
}

function wireRichEditorToolbar(toolbarEl, editorEl) {
  toolbarEl.querySelectorAll("[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      editorEl.focus();
      document.execCommand(btn.dataset.cmd, false, null);
    });
  });
  const autoBtn = toolbarEl.querySelector("#auto-format-btn");
  if (autoBtn) {
    autoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      editorEl.innerHTML = autoFormatSopHtml(editorEl.innerText);
    });
  }
}
