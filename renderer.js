// renderer.js

// Replace with your robot’s IP address
const MEBO_IP = "192.168.10.1";
const MEBO_URL = `http://${MEBO_IP}:80/`;

// === UI ELEMENTS === //
const forwardBtn = document.getElementById("forwardBtn");
const backBtn = document.getElementById("backBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

// Arm / claw / camera
const armUpBtn = document.getElementById("armUpBtn");
const armDownBtn = document.getElementById("armDownBtn");
const clawOpenBtn = document.getElementById("clawOpenBtn");
const clawCloseBtn = document.getElementById("clawCloseBtn");
const camUpBtn = document.getElementById("camUpBtn");
const camDownBtn = document.getElementById("camDownBtn");

// Settings
const speedSlider = document.getElementById("speedSlider");

// Audio / TTS
const speakBtn = document.getElementById("speakBtn");
const ttsInput = document.getElementById("ttsInput");
const micBtn = document.getElementById("micBtn");
const volumeSlider = document.getElementById("volumeSlider");

// AI tab
const aiToggle = document.getElementById("aiToggle"); // local/online
const aiChatInput = document.getElementById("aiChatInput");
const aiSendBtn = document.getElementById("aiSendBtn");
const aiOutput = document.getElementById("aiOutput");

// === STATE === //
let speed = localStorage.getItem("meboSpeed") || 5;
if (speedSlider) speedSlider.value = speed;

let usingAI = "online"; // default
let audioContext, micStream, micSource, speaker;

// === HELPERS === //
async function sendCommand(command) {
  try {
    const res = await fetch(`${MEBO_URL}${command}`);
    console.log("Sent:", command, "Response:", res.status);
  } catch (err) {
    console.error("Command failed:", command, err.message);
  }
}

// === MOVEMENT === //
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

// === ARM + CLAW === //
if (armUpBtn) armUpBtn.addEventListener("click", () => sendCommand(`cmd=arm&dir=up&spd=${speed}`));
if (armDownBtn) armDownBtn.addEventListener("click", () => sendCommand(`cmd=arm&dir=down&spd=${speed}`));
if (clawOpenBtn) clawOpenBtn.addEventListener("click", () => sendCommand("cmd=claw&action=open"));
if (clawCloseBtn) clawCloseBtn.addEventListener("click", () => sendCommand("cmd=claw&action=close"));
if (camUpBtn) camUpBtn.addEventListener("click", () => sendCommand("cmd=cam&dir=up"));
if (camDownBtn) camDownBtn.addEventListener("click", () => sendCommand("cmd=cam&dir=down"));

// === KEYBOARD SHORTCUTS === //
document.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "w": sendCommand(`cmd=move&dir=fwd&spd=${speed}`); break;
    case "s": sendCommand(`cmd=move&dir=rev&spd=${speed}`); break;
    case "a": sendCommand(`cmd=move&dir=left&spd=${speed}`); break;
    case "d": sendCommand(`cmd=move&dir=right&spd=${speed}`); break;

    // Arm / claw / camera
    case "i": sendCommand(`cmd=arm&dir=up&spd=${speed}`); break;
    case "k": sendCommand(`cmd=arm&dir=down&spd=${speed}`); break;
    case "j": sendCommand("cmd=claw&action=open"); break;
    case "l": sendCommand("cmd=claw&action=close"); break;
    case "u": sendCommand("cmd=cam&dir=up"); break;
    case "o": sendCommand("cmd=cam&dir=down"); break;
  }
});

// === TEXT-TO-SPEECH === //
if (speakBtn && ttsInput) {
  speakBtn.addEventListener("click", async () => {
    const text = ttsInput.value.trim();
    if (!text) return;
    await sendCommand(`cmd=speak&text=${encodeURIComponent(text)}`);
  });
}

// === MIC STREAMING === //
if (micBtn) {
  micBtn.addEventListener("mousedown", async () => {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micSource = audioContext.createMediaStreamSource(micStream);
    // TODO: encode and stream PCM/WAV chunks to Mebo speaker endpoint
    console.log("Mic streaming started...");
  });

  micBtn.addEventListener("mouseup", () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      console.log("Mic streaming stopped.");
    }
  });
}

// === AUDIO FROM MEBO MIC === //
async function startMeboAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audio = new Audio(`${MEBO_URL}audio`); // replace with real endpoint
  audio.crossOrigin = "anonymous";
  const track = audioContext.createMediaElementSource(audio);
  speaker = audioContext.createGain();
  track.connect(speaker).connect(audioContext.destination);
  audio.play();
  console.log("Mebo mic audio playing...");
}
if (volumeSlider) {
  volumeSlider.addEventListener("input", (e) => {
    if (speaker) speaker.gain.value = e.target.value;
  });
}

// === AI TAB === //
if (aiToggle) {
  aiToggle.addEventListener("change", (e) => {
    usingAI = e.target.value;
    console.log("AI mode set:", usingAI);
  });
}

if (aiSendBtn && aiChatInput) {
  aiSendBtn.addEventListener("click", async () => {
    const text = aiChatInput.value.trim();
    if (!text) return;
    aiOutput.innerText += `You: ${text}\n`;

    try {
      if (usingAI === "online") {
        // Example: call local backend (main.js) instead of direct OpenAI here
        const res = await fetch("http://localhost:3000/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        aiOutput.innerText += `Mebo AI: ${data.reply}\n`;
      } else {
        aiOutput.innerText += "Local AI: (stub reply)\n";
      }
    } catch (err) {
      aiOutput.innerText += "Error talking to AI.\n";
    }
  });
}
