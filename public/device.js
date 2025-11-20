function generateUUID() {
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let deviceId = localStorage.getItem("device_id");

if (!deviceId) {
  deviceId = generateUUID();
  localStorage.setItem("device_id", deviceId);
}

window.__DEVICE_ID__ = deviceId;
