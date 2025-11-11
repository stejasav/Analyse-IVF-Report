// insights.js
document.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(sessionStorage.getItem("analysisResults") || "{}");

  if (!data || !data.ok) {
    document.getElementById("insightsContent").innerHTML = `
      <div class="insights-card">
        <h2>⚠️ No Analysis Data Found</h2>
        <p class="empty-state">Please upload and analyze your reports first.</p>
        <div style="text-align: center; margin-top: 20px;">
          <button class="btn-action btn-primary" onclick="window.location.href='/'">Go Back to Upload</button>
        </div>
      </div>
    `;
    return;
  }

  renderInsights(data);
});

function renderInsights(data) {
  const container = document.getElementById("insightsContent");
  const analysis = data.data;

  let html = "";

  // Processed Files
  if (data.processed_files && data.processed_files.length > 0) {
    html += `
      <div class="processed-files">
        <h3>✅ Analyzed Files</h3>
        ${data.processed_files
          .map((file) => `<span class="file-tag">${file}</span>`)
          .join("")}
      </div>
    `;
  }

  // Summary
  if (analysis.summary) {
    html += `
      <div class="insights-card summary">
        <h2>📋 Summary</h2>
        <p>${escapeHtml(analysis.summary)}</p>
      </div>
    `;
  }

  // Key Findings
  if (analysis.key_findings && analysis.key_findings.length > 0) {
    html += `
      <div class="insights-card">
        <h2>🔍 Key Findings</h2>
        <ul class="insights-list">
          ${analysis.key_findings
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  // Red Flags
  if (analysis.possible_red_flags && analysis.possible_red_flags.length > 0) {
    html += `
      <div class="insights-card">
        <h2>⚠️ Points Requiring Attention</h2>
        <ul class="insights-list">
          ${analysis.possible_red_flags
            .map((item) => `<li class="red-flag-item">${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  // Recommended Follow-ups
  if (
    analysis.recommended_followups &&
    analysis.recommended_followups.length > 0
  ) {
    html += `
      <div class="insights-card">
        <h2>✅ Recommended Next Steps</h2>
        <ul class="insights-list">
          ${analysis.recommended_followups
            .map((item) => `<li class="followup-item">${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  // Questions for Doctor
  if (
    analysis.questions_for_doctor &&
    analysis.questions_for_doctor.length > 0
  ) {
    html += `
      <div class="insights-card">
        <h2>❓ Questions for Your Doctor</h2>
        <ul class="insights-list">
          ${analysis.questions_for_doctor
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  // Raw Response (if available)
  if (analysis.raw_response) {
    html += `
      <div class="insights-card">
        <h2>📄 Full AI Response</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
          <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapeHtml(
            analysis.raw_response
          )}</pre>
        </div>
      </div>
    `;
  }

  // Disclaimer
  if (analysis.disclaimer) {
    html += `
      <div class="insights-card">
        <h2>⚖️ Important Notice</h2>
        <div class="disclaimer-box">
          <p>${escapeHtml(analysis.disclaimer)}</p>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
