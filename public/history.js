(async function loadHistory() {
  const deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  const res = await fetch("/api/history", {
    headers: { "x-device-id": deviceId },
  });

  const data = await res.json();

  if (!data.ok || !Array.isArray(data.history) || data.history.length === 0) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  const container = document.getElementById("historyContainer");
  container.innerHTML = "";

  data.history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const created = new Date(item.created_at).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const fileNames = Array.isArray(item.files)
      ? item.files
          .map((f) => {
            if (typeof f === "string") return f;
            if (f && typeof f === "object" && f.name) return f.name;
            return "";
          })
          .filter(Boolean)
          .join(", ")
      : "";

    card.innerHTML = `
      <h3>Analysis #${item.id}</h3>
      <p><strong>Files:</strong> ${fileNames}</p>
      <p><strong>Date:</strong> ${created}</p>
    `;

    // ----- CARD CLICK -----
    card.addEventListener("click", async () => {
      console.log("Opening analysis:", item.id);

      const res2 = await fetch(`/api/history/${item.id}`, {
        headers: { "x-device-id": deviceId },
      });

      const full = await res2.json();

      if (!full.ok) {
        alert("Unable to load analysis.");
        return;
      }

      const processedMerged = full.files.map((f, index) => {
        const name = typeof f === "string" ? f : f?.name || "Unknown File";
        const url = typeof f === "string" ? `/uploads/${f}` : f?.url || "";
        const transcript =
          f?.transcript ||
          (Array.isArray(full.transcripts)
            ? full.transcripts[index] || "No transcript found."
            : "No transcript found.");

        return { name, url, transcript };
      });

      sessionStorage.setItem(
        "analysisResults",
        JSON.stringify({
          ok: true,
          processed_files: processedMerged,
          data: full.data,
        })
      );

      window.location.href = "/insights.html";
    });

    container.appendChild(card);
  });
})();
