// === Utility ===
function sendCommand(endpoint) {
  fetch(`http://192.168.10.1/${endpoint}`)
    .then(() => console.log("Sent:", endpoint))
    .catch(err => console.error("Error sending command:", err));
}

// === Default Shortcuts ===
let keyBindings = {
  forward: "w",
  backward: "s",
  left: "a",
  right: "d",
  armUp: "ArrowUp",
  armDown: "ArrowDown",
  clawOpen: "o",
  clawClose: "c",
  camUp: "PageUp",
  camDown: "PageDown"
};

// Load saved shortcuts
if (localStorage.getItem("meboKeyBindings")) {
  keyBindings = JSON.parse(localStorage.getItem("meboKeyBindings"));
}

// === Update Key Table ===
function refreshKeyTable() {
  document.querySelectorAll(".keyCell").forEach(cell => {
    const action = cell.dataset.action;
    cell.textContent = keyBindings[action];
  });
}
refreshKeyTable();

// === Rebinding Logic ===
document.querySelectorAll(".keyCell").forEach(cell => {
  cell.addEventListener("click", () => {
    cell.textContent = "Press a key...";
    const listener = (e) => {
      keyBindings[cell.dataset.action] = e.key;
      localStorage.setItem("meboKeyBindings", JSON.stringify(keyBindings));
      refreshKeyTable();
      document.removeEventListener("keydown", listener, true);
    };
    document.addEventListener("keydown", listener, true);
  });
});

// === Keyboard Shortcuts ===
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case keyBindings.forward: sendCommand("moveForward"); break;
    case keyBindings.backward: sendCommand("moveBackward"); break;
    case keyBindings.left: sendCommand("turnLeft"); break;
    case keyBindings.right: sendCommand("turnRight"); break;
    case keyBindings.armUp: sendCommand("armUp"); break;
    case keyBindings.armDown: sendCommand("armDown"); break;
    case keyBindings.clawOpen: sendCommand("clawOpen"); break;
    case keyBindings.clawClose: sendCommand("clawClose"); break;
    case keyBindings.camUp: sendCommand("camUp"); break;
    case keyBindings.camDown: sendCommand("camDown"); break;
  }
});

// === Button Clicks ===
document.getElementById("forwardBtn").onclick = () => sendCommand("moveForward");
document.getElementById("backwardBtn").onclick = () => sendCommand("moveBackward");
document.getElementById("leftBtn").onclick = () => sendCommand("turnLeft");
document.getElementById("rightBtn").onclick = () => sendCommand("turnRight");
document.getElementById("armUpBtn").onclick = () => sendCommand("armUp");
document.getElementById("armDownBtn").onclick = () => sendCommand("armDown");
document.getElementById("clawOpenBtn").onclick = () => sendCommand("clawOpen");
document.getElementById("clawCloseBtn").onclick = () => sendCommand("clawClose");
document.getElementById("camUpBtn").onclick = () => sendCommand("camUp");
document.getElementById("camDownBtn").onclick = () => sendCommand("camDown");

// === Video Feed ===
document.getElementById("videoFeed").src = "http://192.168.10.1:8080/?action=stream";

// === Audio Feed ===
document.getElementById("meboAudio").src = "http://192.168.10.1:8080/audio";

// === TTS ===
document.getElementById("speakBtn").onclick = () => {
  const text = document.getElementById("ttsInput").value;
  if (!text) return;
  console.log("Speaking:", text);
  // TODO: TTS → send to robot speaker
};

// === Mic Streaming ===
let micActive = false;
let micStream = null;
document.getElementById("micBtn").onclick = async () => {
  if (!micActive) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // TODO: send micStream to robot’s speaker endpoint
      document.getElementById("micBtn").textContent = "🎤 Mic (On)";
      micActive = true;
    } catch (err) {
      console.error("Mic error:", err);
    }
  } else {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById("micBtn").textContent = "🎤 Mic (Off)";
    micActive = false;
  }
};

// === AI Assistant ===
function tryExecuteJSONCommand(text) {
  try {
    const json = JSON.parse(text);
    if (json.action) {
      sendCommand(json.action);
      return `[Executed action: ${json.action}]`;
    }
  } catch (e) {
    return null;
  }
  return null;
}

document.getElementById("sendAiBtn").onclick = async () => {
  const mode = document.getElementById("aiMode").value;
  const query = document.getElementById("aiInput").value;
  const output = document.getElementById("aiOutput");

  if (!query) return;

  output.innerHTML += `<div>> ${query}</div>`;

  let reply;
  if (mode === "online") {
    // Placeholder: replace with actual OpenAI API call
    reply = `{ "action": "moveForward" }`; // simulate response
  } else {
    reply = "Sure, I'll move backward! {\"action\":\"moveBackward\"}";
  }

  // Check for JSON command inside reply
  const executed = tryExecuteJSONCommand(reply);
  if (executed) {
    output.innerHTML += `<div style="color:#0af">${executed}</div>`;
  } else {
    output.innerHTML += `<div style="color:#0af">${reply}</div>`;
  }

  output.scrollTop = output.scrollHeight;
};
