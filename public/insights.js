let ANALYSIS_FILES = [];

document.addEventListener("DOMContentLoaded", () => {
  const stored = sessionStorage.getItem("analysisResults");
  const statusBanner = document.getElementById("statusBanner");

  if (!stored) {
    document.getElementById("emptyBanner").classList.remove("hide");
    document.getElementById("emptyState").classList.remove("hide");

    document.getElementById("statusBanner").classList.add("hide");
    document.getElementById("insightsContent").classList.add("hide");
    document.getElementById("disclaimer").classList.add("hide");
    document.getElementById("ctaSection").classList.add("hide");
    document.getElementById("filesSection").classList.add("hide");

    return;
  }

  const data = JSON.parse(stored);
  if (!data.ok || !data.data) {
    statusBanner.textContent =
      "⚠️ Invalid data received from AI. Please re-analyze.";
    return;
  }

  ANALYSIS_FILES = Array.isArray(data.processed_files)
    ? data.processed_files
    : [];

  renderFiles(ANALYSIS_FILES);
  renderInsights(data);
});

function renderInsights(data) {
  const banner = document.getElementById("statusBanner");
  const container = document.getElementById("insightsContent");
  // const disclaimerBox = document.getElementById("disclaimer");
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
    "disclaimer",
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

  // Disclaimer
  // if (d.disclaimer) {
  //   disclaimerBox.style.display = "block";
  //   disclaimerBox.innerHTML = `<h3>⚕️ Medical Disclaimer</h3><p>${escapeHtml(
  //     d.disclaimer
  //   )}</p>`;
  // }
}

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

function openTranscriptModal(file) {
  const modal = document.getElementById("transcriptModal");
  const fileNameEl = document.getElementById("modalFileName");
  const transcriptEl = document.getElementById("modalTranscript");

  if (!modal || !fileNameEl || !transcriptEl) return;

  fileNameEl.textContent = file.name || "Report Transcript";
  transcriptEl.textContent =
    file.transcript && file.transcript.trim().length
      ? file.transcript
      : "No transcription available for this file.";

  modal.classList.remove("hide");
}


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const insightsContent = document.getElementById("insightsContent");
    const hasContent =
      insightsContent && insightsContent.innerHTML.trim().length > 0;

    const statusBanner = document.getElementById("statusBanner");
    const emptyBanner = document.getElementById("emptyBanner");
    const emptyState = document.getElementById("emptyState");
    const disclaimer = document.getElementById("disclaimer");
    const ctaSection = document.getElementById("ctaSection");
    const filesSection = document.getElementById("filesSection");

    if (hasContent) {
      // SHOW insights UI
      statusBanner.classList.remove("hide");
      insightsContent.classList.remove("hide");
      disclaimer.classList.remove("hide");
      ctaSection.classList.remove("hide");
      filesSection.classList.remove("hide");

      // HIDE empty UI
      emptyBanner.classList.add("hide");
      emptyState.classList.add("hide");
    } else {
      // Show EMPTY state
      emptyBanner.classList.remove("hide");
      emptyState.classList.remove("hide");

      // Hide insights UI
      statusBanner.classList.add("hide");
      insightsContent.classList.add("hide");
      disclaimer.classList.add("hide");
      ctaSection.classList.add("hide");
      filesSection.classList.add("hide");
    }
  }, 120);
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- History bubble + transcript modal handler ----
document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("historyBubble");
  if (bubble) {
    bubble.addEventListener("click", () => {
      window.location.href = "/history.html";
    });
  }

  const transcriptModal = document.getElementById("transcriptModal");
  const closeTranscript = document.getElementById("closeTranscript");

  if (transcriptModal && closeTranscript) {
    closeTranscript.addEventListener("click", () => {
      transcriptModal.classList.add("hide");
    });

    transcriptModal.addEventListener("click", (e) => {
      if (e.target === transcriptModal) {
        transcriptModal.classList.add("hide");
      }
    });
  }
});

