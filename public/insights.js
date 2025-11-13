document.addEventListener("DOMContentLoaded", () => {
  const stored = sessionStorage.getItem("analysisResults");
  if (!stored) {
    document.getElementById("statusBanner").textContent =
      "⚠️ No Analysis Found — Please upload reports first.";
    return;
  }

  const data = JSON.parse(stored);
  if (!data.ok || !data.data) {
    document.getElementById("statusBanner").textContent =
      "⚠️ Invalid data received from AI. Please re-analyze.";
    return;
  }

  renderInsights(data);
});

function renderInsights(data) {
  const banner = document.getElementById("statusBanner");
  const container = document.getElementById("insightsContent");
  const disclaimerBox = document.getElementById("disclaimer");
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
  if (d.disclaimer) {
    disclaimerBox.style.display = "block";
    disclaimerBox.innerHTML = `<h3>⚕️ Medical Disclaimer</h3><p>${escapeHtml(
      d.disclaimer
    )}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const insightsContent = document.getElementById("insightsContent");
    const hasContent = insightsContent && insightsContent.children.length > 0;

    const statusBanner = document.getElementById("statusBanner");
    const emptyBanner = document.getElementById("emptyBanner");
    const emptyState = document.getElementById("emptyState");
    const disclaimer = document.getElementById("disclaimer");
    const ctaSection = document.getElementById("ctaSection");

    if (hasContent) {
      // Show insights UI
      statusBanner.classList.remove("hide");
      insightsContent.classList.remove("hide");
      disclaimer.classList.remove("hide");
      ctaSection.classList.remove("hide");

      // Hide empty state
      emptyBanner.classList.add("hide");
      emptyState.classList.add("hide");
    } else {
      // Show empty UI
      emptyBanner.classList.remove("hide");
      emptyState.classList.remove("hide");

      // Hide insights parts
      statusBanner.classList.add("hide");
      insightsContent.classList.add("hide");
      disclaimer.classList.add("hide");
      ctaSection.classList.add("hide");
    }
  }, 100);
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
