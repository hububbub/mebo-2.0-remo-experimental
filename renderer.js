// renderer.js - UI logic (no external libs, uses fetch + electronAPI)
(() => {
  // Helpers
  function $(id) { return document.getElementById(id); }
  let config = null;

  // Build mebo URL from template replacing placeholders
  function urlFromTemplate(template, params = {}) {
    let t = template;
    Object.entries(params).forEach(([k, v]) => {
      t = t.replace(new RegExp(`__${k}__`, "g"), encodeURIComponent(v));
    });
    return t;
  }

  async function sendToMebo(pathOrTemplate, params = {}) {
    if (!config) return;
    const base = config.meboBaseUrl.replace(/\/$/, "");
    const path = urlFromTemplate(pathOrTemplate, params);
    const url = path.startsWith("http") ? path : `${base}/${path}`;
    try {
      const res = await fetch(url, { method: "GET" });
      appendLog(`→ ${url} [${res.status}]`);
      return res;
    } catch (err) {
      appendLog(`ERROR sending ${url}: ${err.message}`);
      console.error(err);
      throw err;
    }
  }

  // UI wiring
  async function loadConfigAndApply() {
    config = await window.electronAPI.getConfig();
    // Apply UI values
    $("baseUrl").value = config.meboBaseUrl || "";
    $("speed").value = config.speed || 5;
    $("cameraUrlPreview").src = `${config.meboBaseUrl.replace(/\/$/, "")}/${config.endpoints.cameraStream}`;
    // shortcuts display
    document.querySelectorAll(".keyCell").forEach(cell => {
      const action = cell.dataset.action;
      cell.textContent = config.shortcuts[action] || "";
    });
    if (config.logCollapsed) {
      $("logPanel").style.display = "none";
      $("toggleLog").textContent = "Show Log";
    }
  }

  async function saveConfigFromUI() {
    config.meboBaseUrl = $("baseUrl").value.trim();
    config.speed = parseInt($("speed").value, 10) || 5;
    // endpoints editable fields
    config.endpoints.move = $("endpointMove").value.trim();
    config.endpoints.arm = $("endpointArm").value.trim();
    config.endpoints.claw = $("endpointClaw").value.trim();
    config.endpoints.speak = $("endpointSpeak").value.trim();
    config.endpoints.mic = $("endpointMic").value.trim();
    config.endpoints.cameraStream = $("endpointStream").value.trim();
    const result = await window.electronAPI.saveConfig(config);
    if (result && result.ok) appendLog("Config saved.");
    else appendLog("Config save failed.");
    // update preview
    $("cameraUrlPreview").src = `${config.meboBaseUrl.replace(/\/$/, "")}/${config.endpoints.cameraStream}`;
  }

  // Logging
  function appendLog(text) {
    const el = $("logArea");
    const line = document.createElement("div");
    line.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
    el.appendChild(line);
    // keep limited size
    if (el.children.length > 1000) el.removeChild(el.firstChild);
  }

  function exportLog() {
    const el = $("logArea");
    let txt = "";
    for (const node of el.children) txt += node.textContent + "\n";
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mebo-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Movement / Controls
  function move(dir) {
    sendToMebo(config.endpoints.move, { dir, speed: config.speed }).catch(()=>{});
  }
  function arm(dir) {
    sendToMebo(config.endpoints.arm, { dir }).catch(()=>{});
  }
  function claw(action) {
    sendToMebo(config.endpoints.claw, { action }).catch(()=>{});
  }

  // TTS - simple: if speak endpoint configured use it, otherwise fallback to speechSynthesis
  async function speakText(text) {
    if (!text) return;
    if (config.endpoints.speak) {
      await sendToMebo(config.endpoints.speak, { text });
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    }
  }

  // Mic streaming: convert Float32 to 16-bit PCM and POST to mebo mic endpoint
  let micProcessor = null;
  let micStream = null;
  async function startMicStream() {
    if (!config.endpoints.mic) {
      appendLog("No mic endpoint configured.");
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(micStream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      src.connect(processor);
      processor.connect(ctx.destination);
      processor.onaudioprocess = async (e) => {
        const channel = e.inputBuffer.getChannelData(0);
        // convert to 16-bit PCM
        const buffer = new ArrayBuffer(channel.length * 2);
        const view = new DataView(buffer);
        for (let i = 0, o = 0; i < channel.length; i++, o += 2) {
          let s = Math.max(-1, Math.min(1, channel[i]));
          view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        try {
          await fetch(`${config.meboBaseUrl.replace(/\/$/, "")}/${config.endpoints.mic}`, {
            method: "POST",
            body: buffer,
            headers: { "Content-Type": "application/octet-stream" }
          });
        } catch (err) {
          // ignore intermittent network errors, but log occasionally
        }
      };
      micProcessor = processor;
      appendLog("Mic streaming started.");
    } catch (err) {
      appendLog("Mic start failed: " + err.message);
    }
  }
  function stopMicStream() {
    try {
      if (micProcessor) {
        micProcessor.disconnect();
        micProcessor = null;
      }
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
      }
      appendLog("Mic streaming stopped.");
    } catch (e) {}
  }

  // Keyboard rebind UI
  function attachKeyCells() {
    document.querySelectorAll(".keyCell").forEach(cell => {
      cell.addEventListener("click", () => {
        cell.textContent = "Press key...";
        const action = cell.dataset.action;
        const onKey = (ev) => {
          config.shortcuts[action] = ev.key;
          cell.textContent = ev.key;
          window.electronAPI.saveConfig(config);
          document.removeEventListener("keydown", onKey, true);
        };
        document.addEventListener("keydown", onKey, true);
      });
    });
  }

  // Keyboard shortcuts runtime
  document.addEventListener("keydown", (e) => {
    if (!config) return;
    const s = config.shortcuts;
    if (e.key === s.forward) move("forward");
    else if (e.key === s.backward) move("backward");
    else if (e.key === s.left) move("left");
    else if (e.key === s.right) move("right");
    else if (e.key === s.armUp) arm("up");
    else if (e.key === s.armDown) arm("down");
    else if (e.key === s.clawOpen) claw("open");
    else if (e.key === s.clawClose) claw("close");
    else if (e.key === s.camUp) sendToMebo(config.endpoints.cameraStream, {});
    else if (e.key === s.camDown) sendToMebo(config.endpoints.cameraStream, {});
  });

  // AI tab: uses local helper server if available at http://localhost:3030/ai
  async function sendAiMessage(text) {
    try {
      const res = await fetch("http://localhost:3030/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode: config.aiMode })
      });
      const data = await res.json();
      appendLog("AI → " + (data.reply || JSON.stringify(data)));
      $("aiOutput").value += "\nAI: " + (data.reply || "[no reply]");
      // try to extract and execute JSON commands inside AI reply
      tryExecuteAICommands(data.reply);
    } catch (err) {
      appendLog("AI request failed: " + err.message);
      $("aiOutput").value += "\nAI Error.";
    }
  }

  // Try parse JSON command and execute (supports action + duration + sequence)
  async function tryExecuteAICommands(replyText) {
    if (!replyText) return;
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); } catch(_) { return; }
    if (parsed.action) {
      // single action
      if (parsed.duration) {
        sendToMebo(parsed.action, {}).catch(()=>{});
        // schedule stop
        setTimeout(() => sendToMebo("stop"), parsed.duration);
      } else {
        sendToMebo(parsed.action);
      }
      appendLog("Executed AI action: " + parsed.action);
    } else if (Array.isArray(parsed.sequence)) {
      for (const step of parsed.sequence) {
        if (step.action) {
          sendToMebo(step.action);
          await new Promise(r => setTimeout(r, (step.duration || 1000) + 200));
        }
      }
      appendLog("Executed AI sequence.");
    }
  }

  // UI wiring after DOM ready
  window.addEventListener("DOMContentLoaded", async () => {
    // Buttons
    $("btnForward").addEventListener("click", () => move("forward"));
    $("btnBackward").addEventListener("click", () => move("backward"));
    $("btnLeft").addEventListener("click", () => move("left"));
    $("btnRight").addEventListener("click", () => move("right"));
    $("btnArmUp").addEventListener("click", () => arm("up"));
    $("btnArmDown").addEventListener("click", () => arm("down"));
    $("btnClawOpen").addEventListener("click", () => claw("open"));
    $("btnClawClose").addEventListener("click", () => claw("close"));

    $("saveConfig").addEventListener("click", saveConfigFromUI);
    $("speakBtn").addEventListener("click", () => speakText($("ttsInput").value));
    $("micBtn").addEventListener("click", () => {
      if (micProcessor || micStream) stopMicStream();
      else startMicStream();
    });

    $("toggleLog").addEventListener("click", () => {
      const panel = $("logPanel");
      if (panel.style.display === "none") {
        panel.style.display = "block";
        $("toggleLog").textContent = "Hide Log";
        config.logCollapsed = false;
      } else {
        panel.style.display = "none";
        $("toggleLog").textContent = "Show Log";
        config.logCollapsed = true;
      }
      window.electronAPI.saveConfig(config);
    });

    $("exportLog").addEventListener("click", exportLog);

    $("aiSend").addEventListener("click", () => {
      const msg = $("aiInput").value.trim();
      if (!msg) return;
      $("aiOutput").value += "\nYou: " + msg;
      sendAiMessage(msg);
    });

    attachKeyCells();
    await loadConfigAndApply();
  });

})();
