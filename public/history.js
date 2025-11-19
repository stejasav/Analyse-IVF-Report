(async function loadHistory() {
  const deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  const res = await fetch("/api/history", {
    headers: {
      "x-device-id": deviceId,
    },
  });

  const data = await res.json();

  if (!data.ok || !data.history || data.history.length === 0) {
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

    card.innerHTML = `
      <h3>Analysis #${item.id}</h3>
      <p><strong>Files:</strong> ${
        Array.isArray(item.files)
          ? item.files
              .map((f) => (typeof f === "string" ? f : f.name))
              .join(" , ")
          : ""
      }</p>
      <p><strong>Date:</strong> ${created}</p>
    `;

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

      const processedMerged = full.files.map((f, index) => ({
        name: typeof f === "string" ? f : f.name,
        url: typeof f === "string" ? `/uploads/${f}` : f.url,
        transcript:
          typeof f === "object" && f.transcript
            ? f.transcript
            : Array.isArray(full.transcripts)
            ? full.transcripts[index] || "No transcript found."
            : "No transcript found.",
      }));

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
