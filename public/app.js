const modal = document.getElementById("modal");
const openUpload = document.getElementById("openUpload");
const cancelBtn = document.getElementById("cancel");
const fileInput = document.getElementById("fileInput");
const submitFiles = document.getElementById("submitFiles");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("fileList");
const loading = document.getElementById("loading");

let files = [];

// ---------- Modal Controls ----------
function openModal() {
  modal.classList.remove("hidden");
}
function hideModal() {
  modal.classList.add("hidden");
}
function showLoading() {
  loading.classList.remove("hidden");
}
function hideLoading() {
  loading.classList.add("hidden");
}

// ---------- Event Listeners ----------
openUpload.addEventListener("click", openModal);
document.getElementById("navUploadBtn").addEventListener("click", openModal);
document.getElementById("ctaUploadBtn").addEventListener("click", openModal);
cancelBtn.addEventListener("click", hideModal);

// ---------- File Handling ----------
fileInput.addEventListener("change", (e) => {
  files = Array.from(e.target.files);
  renderFileList();
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () =>
  dropzone.classList.remove("dragover")
);
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const dropped = Array.from(e.dataTransfer.files);
  files = [...files, ...dropped].slice(0, 10);
  fileInput.value = "";
  renderFileList();
});
dropzone.addEventListener("click", () => fileInput.click());

function renderFileList() {
  fileList.innerHTML = "";
  if (!files.length) return;
  files.forEach((f, idx) => {
    const row = document.createElement("div");
    row.className = "file-item";
    row.innerHTML = `
      <span class="name">${f.name}</span>
      <span class="badge">${(f.size / 1024 / 1024).toFixed(2)} MB</span>
      <button class="btn" data-remove="${idx}">Remove</button>
    `;
    fileList.appendChild(row);
  });

  // remove handlers
  fileList.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(e.target.getAttribute("data-remove"));
      files.splice(i, 1);
      renderFileList();
    });
  });
}

// ---------- Submit & Analyze ----------
submitFiles.addEventListener("click", async () => {
  if (!files.length) {
    alert("Please add at least one file.");
    return;
  }

  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  hideModal();
  showLoading();
  submitFiles.disabled = true;
  submitFiles.textContent = "Analyzing...";

  try {
    const res = await fetch(`${window.location.origin}/api/analyze`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    hideLoading();
    submitFiles.disabled = false;
    submitFiles.textContent = "Analyze Reports";

    if (!res.ok || !data.ok) {
      console.error("❌ Server error:", data);
      alert(data?.error || "Something went wrong. Please try again.");
      return;
    }

    console.log("✅ Gemini AI response:", data);

    // ✅ Save results and redirect to insights
    sessionStorage.setItem("analysisResults", JSON.stringify(data));
    window.location.href = "/insights.html";
  } catch (err) {
    hideLoading();
    submitFiles.disabled = false;
    submitFiles.textContent = "Analyze Reports";
    console.error("❌ Analysis error:", err);
    alert("Failed to analyze files. Please try again.");
  }
});
