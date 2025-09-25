// === Utility ===
function sendCommand(endpoint, duration = 0) {
  fetch(`http://192.168.10.1/${endpoint}`)
    .then(() => console.log("Sent:", endpoint))
    .catch(err => console.error("Error sending command:", err));

  if (duration > 0) {
    setTimeout(() => {
      fetch(`http://192.168.10.1/stop`)
        .then(() => console.log("Stopped after", duration))
        .catch(err => console.error("Error stopping:", err));
    }, duration);
  }
}

// === JSON Command Executor ===
async function executeCommand(obj) {
  if (obj.action) {
    const action = obj.action;
    const duration = obj.duration || 0;
    sendCommand(action, duration);
    return `[Executed: ${action}${duration ? " for " + duration + "ms" : ""}]`;
  }

  if (obj.sequence && Array.isArray(obj.sequence)) {
    for (let step of obj.sequence) {
      const action = step.action;
      const duration = step.duration || 0;
      sendCommand(action, duration);
      await new Promise(res => setTimeout(res, duration + 500)); // wait before next
    }
    return `[Executed sequence of ${obj.sequence.length} steps]`;
  }

  return "[Unknown command format]";
}

// === AI Parser ===
async function tryExecuteJSONCommand(text) {
  try {
    const json = JSON.parse(text);
    return await executeCommand(json);
  } catch (e) {
    // Not pure JSON? try extracting { ... } inside text
    const match = text.match(/\{.*\}/s);
    if (match) {
      try {
        const json = JSON.parse(match[0]);
        return await executeCommand(json);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// === AI Assistant ===
document.getElementById("sendAiBtn").onclick = async () => {
  const mode = document.getElementById("aiMode").value;
  const query = document.getElementById("aiInput").value;
  const output = document.getElementById("aiOutput");

  if (!query) return;

  output.innerHTML += `<div>> ${query}</div>`;

  let reply;
  if (mode === "online") {
    // TODO: Replace with OpenAI call
    reply = `{
      "sequence": [
        { "action": "moveForward", "duration": 1500 },
        { "action": "turnRight", "duration": 1000 },
        { "action": "clawOpen", "duration": 500 }
      ]
    }`;
  } else {
    reply = "Okay, I'll try a move. {\"action\":\"moveBackward\",\"duration\":2000}";
  }

  const executed = await tryExecuteJSONCommand(reply);
  if (executed) {
    output.innerHTML += `<div style="color:#0af">${executed}</div>`;
  } else {
    output.innerHTML += `<div style="color:#0af">${reply}</div>`;
  }

  output.scrollTop = output.scrollHeight;
};
