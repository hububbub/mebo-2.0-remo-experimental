// Renderer (UI logic)
const { ipcRenderer } = require("electron");

// Buttons
document.addEventListener("DOMContentLoaded", () => {
  const forwardBtn = document.getElementById("forward");
  const backBtn = document.getElementById("back");
  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const stopBtn = document.getElementById("stop");

  // Example Mebo command (replace with actual IP/endpoint)
  const sendCommand = async (cmd) => {
    try {
      const response = await fetch(`http://192.168.1.100:80/${cmd}`);
      console.log(`Sent: ${cmd}, Status: ${response.status}`);
    } catch (err) {
      console.error("Command failed:", err);
    }
  };

  forwardBtn.onclick = () => sendCommand("move/forward");
  backBtn.onclick = () => sendCommand("move/backward");
  leftBtn.onclick = () => sendCommand("move/left");
  rightBtn.onclick = () => sendCommand("move/right");
  stopBtn.onclick = () => sendCommand("move/stop");

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp": sendCommand("move/forward"); break;
      case "ArrowDown": sendCommand("move/backward"); break;
      case "ArrowLeft": sendCommand("move/left"); break;
      case "ArrowRight": sendCommand("move/right"); break;
      case " ": sendCommand("move/stop"); break;
    }
  });

  // Listen to menu events from main.js
  ipcRenderer.on("open-keyboard-settings", () => {
    alert("Keyboard settings would open here.");
  });
  ipcRenderer.on("open-settings", () => {
    alert("General settings would open here.");
  });
  ipcRenderer.on("open-ai-settings", () => {
    alert("AI settings would open here.");
  });
  ipcRenderer.on("show-about", () => {
    alert("Mebo Control v1.0 — Portable Edition");
  });
});
