// public/device.js

// Generate UUID (simple implementation)
function generateUUID() {
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initialize device ID
let deviceId = localStorage.getItem("device_id");

if (!deviceId) {
  deviceId = generateUUID();
  localStorage.setItem("device_id", deviceId);
  console.log("🆕 Generated new device_id:", deviceId);
} else {
  console.log("🔑 Existing device_id:", deviceId);
}

// Export globally
window.__DEVICE_ID__ = deviceId;
