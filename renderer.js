// renderer.js
const axios = require("axios");

// Grab DOM elements
const forwardBtn = document.getElementById("forwardBtn");
const backBtn = document.getElementById("backBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

const speakBtn = document.getElementById("speakBtn");
const ttsInput = document.getElementById("ttsInput");

const speedSlider = document.getElementById("speedSlider");

// Load saved settings from localStorage
let speed = localStorage.getItem("meboSpeed") || 5;
if (speedSlider) {
  speedSlider.value = speed;
}

// Replace with your robot’s IP address
const MEBO_IP = "192.168.10.1";
const MEBO_URL = `http://${MEBO_IP}:80/`;

// Helper to send commands
async function sendCommand(command) {
  try {
    await axios.get(`${MEBO_URL}${command}`);
    console.log("Sent:", command);
  } catch (err) {
    console.error("Command failed:", command, err.message);
  }
}

// Movement
if (forwardBtn) forwardBtn.addEventListener("click", () => sendCommand(`cmd=move&dir=fwd&spd=${speed}`));
if (backBtn) backBtn.addEventListener("click", () => sendCommand(`cmd=move&dir=rev&spd=${speed}`));
if (leftBtn) leftBtn.addEventListener("click", () => sendCommand(`cmd=move&dir=left&spd=${speed}`));
if (rightBtn) rightBtn.addEventListener("click", () => sendCommand(`cmd=move&dir=right&spd=${speed}`));

// Speed setting
if (speedSlider) {
  speedSlider.addEventListener("input", (e) => {
    speed = e.target.value;
    localStorage.setItem("meboSpeed", speed);
  });
}

// Text-to-Speech
if (speakBtn && ttsInput) {
  speakBtn.addEventListener("click", async () => {
    const text = ttsInput.value.trim();
    if (!text) return;

    try {
      // Example: replace with real endpoint if TTS backend is connected
      await sendCommand(`cmd=speak&text=${encodeURIComponent(text)}`);
    } catch (err) {
      console.error("TTS failed:", err.message);
    }
  });
}
