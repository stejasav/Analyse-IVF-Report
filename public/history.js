(async function loadHistory() {
  const deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  console.log("🟦 Fetching history for device:", deviceId);

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
      <p><strong>Files:</strong> ${item.files.join(", ")}</p>
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

      sessionStorage.setItem(
        "analysisResults",
        JSON.stringify({
          ok: true,
          processed_files: full.files,
          data: full.data,
        })
      );

      window.location.href = "/insights.html";
    });

    container.appendChild(card);
  });
})();
