const modal = document.getElementById("modal");
const openUpload = document.getElementById("openUpload");
const navInsightsBtn = document.getElementById("navInsightsBtn");
const ctaUploadBtn = document.getElementById("ctaUploadBtn");
const cancelBtn = document.getElementById("cancel");

const fileInput = document.getElementById("fileInput");
const submitFiles = document.getElementById("submitFiles");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("fileList");
const loading = document.getElementById("loading");

let files = [];

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
openUpload?.addEventListener("click", openModal);
navInsightsBtn?.addEventListener("click", () => {
  window.location.href = "/insights.html";
});
ctaUploadBtn?.addEventListener("click", openModal);
cancelBtn?.addEventListener("click", hideModal);

// ---------- File Handling ----------
fileInput.addEventListener("change", (e) => {
  files = Array.from(e.target.files);
  renderFileList();
  toast.success(
    `${files.length} file${files.length > 1 ? "s" : ""} added successfully.`
  );
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const dropped = Array.from(e.dataTransfer.files);
  files = [...files, ...dropped].slice(0, 10);
  toast.success(
    `${dropped.length} file${dropped.length > 1 ? "s" : ""} added successfully.`
  );

  fileInput.value = "";
  renderFileList();
});

dropzone.addEventListener("click", () => fileInput.click());

// ---------- FILE LIST UI ----------
function renderFileList() {
  fileList.innerHTML = "";

  if (!files.length) return;

  files.forEach((f, idx) => {
    const row = document.createElement("div");
    row.className = "file-item";

    row.innerHTML = `
      <span class="name">${f.name}</span>
      <span class="badge">${(f.size / 1024 / 1024).toFixed(2)} MB</span>
      <button class="btn remove-file" data-index="${idx}">Remove</button>
    `;

    fileList.appendChild(row);
  });

  fileList.querySelectorAll(".remove-file").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = Number(e.target.dataset.index);
      files.splice(index, 1);
      renderFileList();
      toast.info("File removed.");
    });
  });
}

// ---------- SUBMIT FILES ----------
submitFiles.addEventListener("click", async () => {
  if (!files.length) {
    toast.warning("Please add at least one file before analysing.");
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
      headers: {
        "X-Device-Id": window.__DEVICE_ID__,
      },
    });

    const data = await res.json();

    hideLoading();
    submitFiles.disabled = false;
    submitFiles.textContent = "Analyze Reports";

    if (!res.ok || !data.ok) {
      toast.error(data?.error || "Something went wrong. Please try again.");
      return;
    }

    toast.success("Reports analysed successfully!");

    sessionStorage.setItem(
      "analysisResults",
      JSON.stringify({
        ok: data.ok,
        processed_files: data.processed_files,
        data: data.data,
      })
    );

    window.location.href = "/insights.html";
  } catch (err) {
    hideLoading();
    submitFiles.disabled = false;
    submitFiles.textContent = "Analyze Reports";
    toast.error("Failed to analyse files. Please try again.");
  }
});