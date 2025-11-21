let ANALYSIS_FILES = [];
window.__ANALYSIS_DATA__ = JSON.parse(
  sessionStorage.getItem("analysisResults")
);
const BACKEND_TRANSCRIPTIONS =
  window.__ANALYSIS_DATA__?.data?.transcriptions || {};

document.addEventListener("DOMContentLoaded", () => {
  const stored = sessionStorage.getItem("analysisResults");

  if (!stored) {
    showEmptyState();
    return;
  }

  const data = JSON.parse(stored);
  if (!data.ok || !data.data) {
    document.getElementById("statusBanner").textContent =
      "⚠️ Invalid data received from AI. Please re-analyze.";
    return;
  }

  ANALYSIS_FILES = Array.isArray(data.processed_files)
    ? data.processed_files
    : [];

  renderFiles(ANALYSIS_FILES);
  renderInsights(data);

  setTimeout(toggleUISections, 120);
});

/* UI SECTION TOGGLING*/
function showEmptyState() {
  const idsToShow = ["emptyBanner", "emptyState"];
  const idsToHide = [
    "statusBanner",
    "insightsContent",
    "disclaimer",
    "ctaSection",
    "filesSection"
  ];

  idsToShow.forEach((id) => document.getElementById(id).classList.remove("hide"));
  idsToHide.forEach((id) => document.getElementById(id).classList.add("hide"));
}

function toggleUISections() {
  const insightsContent = document.getElementById("insightsContent");
  const hasContent =
    insightsContent && insightsContent.innerHTML.trim().length > 0;

  const show = (id) => document.getElementById(id).classList.remove("hide");
  const hide = (id) => document.getElementById(id).classList.add("hide");

  if (hasContent) {
    ["statusBanner", "insightsContent", "disclaimer", "ctaSection", "filesSection"].forEach(show);
    ["emptyBanner", "emptyState"].forEach(hide);
  } else {
    ["emptyBanner", "emptyState"].forEach(show);
    ["statusBanner", "insightsContent", "disclaimer", "ctaSection", "filesSection"].forEach(hide);
  }
}

// RENDER INSIGHTS
function renderInsights(data) {
  const banner = document.getElementById("statusBanner");
  const container = document.getElementById("insightsContent");
  const d = data.data;

  // Status banner
  banner.innerHTML = `✅ Analysis complete — ${
    data.processed_files?.length || 1
  } report${
    data.processed_files?.length > 1 ? "s" : ""
  } processed successfully`;

  container.innerHTML = "";

  // Helper
  const makeCard = (title, innerHTML) => `
    <div class="card">
      <div class="card-header"><h2>${title}</h2></div>
      ${innerHTML}
    </div>
  `;

  // Summary
  if (d.summary)
    container.innerHTML += makeCard(
      "Summary",
      `<p>${escapeHtml(d.summary)}</p>`
    );

  // Key Findings
  if (Array.isArray(d.key_findings) && d.key_findings.length)
    container.innerHTML += makeCard(
      "Key Findings",
      `<ul class="list findings">${d.key_findings
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul>`
    );

  // Points Requiring Attention
  if (Array.isArray(d.possible_red_flags) && d.possible_red_flags.length)
    container.innerHTML += makeCard(
      "Points Requiring Attention",
      `<ul class="list warnings">${d.possible_red_flags
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul>`
    );

  // Recommended Follow-ups
  if (Array.isArray(d.recommended_followups) && d.recommended_followups.length)
    container.innerHTML += makeCard(
      "Recommended Next Steps",
      `<ul class="list steps">${d.recommended_followups
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul>`
    );

  // Questions for Doctor
  if (Array.isArray(d.questions_for_doctor) && d.questions_for_doctor.length)
    container.innerHTML += makeCard(
      "Questions for Your Doctor",
      `<ul class="list questions">${d.questions_for_doctor
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul>`
    );

  // Additional unexpected fields
  const known = [
    "summary",
    "key_findings",
    "possible_red_flags",
    "recommended_followups",
    "questions_for_doctor",
    "raw_response",
  ];
  Object.keys(d)
    .filter((k) => !known.includes(k))
    .forEach((key) => {
      const val = d[key];
      if (typeof val === "string" && val.trim()) {
        container.innerHTML += makeCard(
          formatKey(key),
          `<p>${escapeHtml(val)}</p>`
        );
      } else if (Array.isArray(val) && val.length) {
        container.innerHTML += makeCard(
          formatKey(key),
          `<ul class="list">${val
            .map((v) => `<li>${escapeHtml(v)}</li>`)
            .join("")}</ul>`
        );
      }
    });
}

// RENDER FILE CARDS
function renderFiles(files) {
  const section = document.getElementById("filesSection");
  const list = document.getElementById("filesList");

  if (!section || !list) return;
  if (!files || !files.length) {
    section.classList.add("hide");
    return;
  }

  section.classList.remove("hide");
  list.innerHTML = "";

  files.forEach((file, idx) => {
    const card = document.createElement("div");
    card.className = "file-card";

    const nameEl = document.createElement("div");
    nameEl.className = "file-name";
    nameEl.textContent = `📄 ${file.name || "Report " + (idx + 1)}`;

    const actions = document.createElement("div");
    actions.className = "file-actions";

    // View File button
    const viewFileBtn = document.createElement("button");
    viewFileBtn.className = "file-btn";
    viewFileBtn.textContent = "View File";
    viewFileBtn.addEventListener("click", () => {
      if (file.url) {
        window.open(file.url, "_blank");
      } else {
        alert("File preview not available.");
      }
    });

    // View Transcript button
    const viewTranscriptBtn = document.createElement("button");
    viewTranscriptBtn.className = "file-btn secondary-btn";
    viewTranscriptBtn.textContent = "View Transcript";
    viewTranscriptBtn.addEventListener("click", () => {
      openTranscriptModal(file);
    });

    actions.appendChild(viewFileBtn);
    actions.appendChild(viewTranscriptBtn);

    card.appendChild(nameEl);
    card.appendChild(actions);

    list.appendChild(card);
  });
}

// TRANSCRIPT MODAL
function openTranscriptModal(file) {
  const modal = document.getElementById("transcriptModal");
  const fileNameEl = document.getElementById("modalFileName");
  const transcriptEl = document.getElementById("modalTranscript");

  fileNameEl.textContent = file.name || "Report Transcript";

  // const transcript = file.transcript;
  // transcriptEl.innerHTML = transcript
  //   ? escapeHtml(transcript).replace(/\n/g, "<br>")
  //   : "No transcription available for this file.";
  let transcript =
    BACKEND_TRANSCRIPTIONS[file.name] ||
    BACKEND_TRANSCRIPTIONS[file.name.trim()] ||
    "No transcription available for this file.";
  transcriptEl.innerHTML = escapeHtml(transcript).replace(/\n/g, "<br>");

  modal.classList.remove("hide");
}

// EVENT HANDLERS — History Bubble & Modal Close
document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("historyBubble");
  const modal = document.getElementById("transcriptModal");
  const close = document.getElementById("closeTranscript");

  if (bubble)
    bubble.addEventListener(
      "click",
      () => (window.location.href = "/history.html")
    );
  if (close) close.addEventListener("click", () => modal.classList.add("hide"));

  if (modal)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hide");
    });
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function createButton(text, className, onClick) {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}