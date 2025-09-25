// renderer.js

// ============ BUTTON + KEYBOARD CONTROL ============
function sendCommand(endpoint) {
  fetch(`http://192.168.10.1:80/${endpoint}`)
    .then(() => console.log("Sent command:", endpoint))
    .catch(err => console.error("Command error:", err));
}

// Movement buttons
document.getElementById("forwardBtn")?.addEventListener("click", () => sendCommand("move?dir=forward"));
document.getElementById("backwardBtn")?.addEventListener("click", () => sendCommand("move?dir=backward"));
document.getElementById("leftBtn")?.addEventListener("click", () => sendCommand("move?dir=left"));
document.getElementById("rightBtn")?.addEventListener("click", () => sendCommand("move?dir=right"));

// Arm + claw
document.getElementById("armUpBtn")?.addEventListener("click", () => sendCommand("arm?dir=up"));
document.getElementById("armDownBtn")?.addEventListener("click", () => sendCommand("arm?dir=down"));
document.getElementById("clawOpenBtn")?.addEventListener("click", () => sendCommand("claw?dir=open"));
document.getElementById("clawCloseBtn")?.addEventListener("click", () => sendCommand("claw?dir=close"));

// Camera tilt
document.getElementById("camUpBtn")?.addEventListener("click", () => sendCommand("cam?dir=up"));
document.getElementById("camDownBtn")?.addEventListener("click", () => sendCommand("cam?dir=down"));

// Keyboard mapping
document.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "w": sendCommand("move?dir=forward"); break;
    case "s": sendCommand("move?dir=backward"); break;
    case "a": sendCommand("move?dir=left"); break;
    case "d": sendCommand("move?dir=right"); break;
    case "u": sendCommand("arm?dir=up"); break;
    case "j": sendCommand("arm?dir=down"); break;
    case "o": sendCommand("claw?dir=open"); break;
    case "p": sendCommand("claw?dir=close"); break;
    case "i": sendCommand("cam?dir=up"); break;
    case "k": sendCommand("cam?dir=down"); break;
  }
});

// ============ VIDEO STREAM ============
document.getElementById("videoFeed").src = "http://192.168.10.1:80/stream";

// ============ AUDIO STREAM ============
const audioElement = document.getElementById("meboAudio");
audioElement.src = "http://192.168.10.1:80/audio"; // replace if different
audioElement.volume = 0.7;

// ============ TTS (send text to speaker) ============
document.getElementById("speakBtn")?.addEventListener("click", () => {
  const text = document.getElementById("ttsInput").value;
  if (!text) return;
  fetch(`http://192.168.10.1:80/speak?text=${encodeURIComponent(text)}`)
    .catch(err => console.error("TTS error:", err));
});

// ============ MIC STREAM (send voice live to Mebo speaker) ============
let micStream, micRecorder;
const micBtn = document.getElementById("micBtn");

micBtn?.addEventListener("click", async () => {
  if (micRecorder) {
    micRecorder.stop();
    micRecorder = null;
    micBtn.innerText = "🎤 Mic (Off)";
    return;
  }

  micBtn.innerText = "🎤 Mic (On)";
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(micStream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    // Convert float to 16-bit PCM
    const buffer = new ArrayBuffer(inputData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    // Send raw audio chunk
    fetch("http://192.168.10.1:80/mic", {
      method: "POST",
      body: buffer
    }).catch(err => console.error("Mic stream error:", err));
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);
  micRecorder = processor;
});

// ============ AI TAB ============
document.getElementById("sendAiBtn")?.addEventListener("click", async () => {
  const msg = document.getElementById("aiInput").value;
  const mode = document.getElementById("aiMode").value; // "online" or "local"

  try {
    const res = await fetch("http://localhost:3030/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, mode })
    });

    const data = await res.json();
    document.getElementById("aiOutput").innerText = data.reply;
  } catch (err) {
    console.error("AI error:", err);
    document.getElementById("aiOutput").innerText = "❌ AI request failed.";
  }
});
