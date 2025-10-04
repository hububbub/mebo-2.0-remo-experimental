/* renderer.js — UI logic (runs in renderer, uses meboAPI from preload) */
/* Features:
   - Loads/saves config via meboAPI
   - Auto-loads camera feed into <video>
   - Movement, arm, claw buttons wired to HTTP endpoints on Mebo
   - Mic streaming: captures microphone, POSTs PCM (16-bit LE) to Mebo mic endpoint
   - TTS: posts text to Mebo speak endpoint or uses speechSynthesis fallback
   - AI: sends messages to local LLM server (http://localhost:3030/ai) or online via configured endpoint
   - Keyboard shortcuts persisted and editable
   - Log panel with export
*/

(async () => {
  // Elements
  const get = id => document.getElementById(id);
  const videoEl = get('cameraFeed');
  const logArea = get('logArea');
  const toggleLogBtn = get('toggleLog');
  const exportLogBtn = get('exportLog');

  // UI IDs must match index.html below.
  const btns = {
    forward: get('forward'),
    backward: get('backward'),
    left: get('left'),
    right: get('right'),
    armUp: get('armUp'),
    armDown: get('armDown'),
    clawOpen: get('clawOpen'),
    clawClose: get('clawClose'),
    cameraUp: get('cameraUp'),
    cameraDown: get('cameraDown')
  };

  const ttsInput = get('ttsInput');
  const ttsBtn = get('speakBtn');
  const micBtn = get('micBtn');
  const speedInput = get('speed');
  const baseUrlInput = get('baseUrl');
  const saveSettingsBtn = get('saveSettings');
  const aiModeSelect = get('aiMode');
  const aiInput = get('aiInput');
  const aiSend = get('aiSend');
  const aiOutput = get('aiOutput');
  const volumeSlider = get('volumeSlider');

  let cfg = await window.meboAPI.getConfig();
  if (!cfg) cfg = {};
  // Apply config values to UI
  function applyConfig() {
    baseUrlInput.value = cfg.baseUrl || '';
    speedInput.value = cfg.speed ?? 5;
    aiModeSelect.value = cfg.aiMode || 'local';
    volumeSlider.value = cfg.volume ?? 50;
    // camera preview
    videoEl.src = `${(cfg.baseUrl || '').replace(/\/$/, '')}/${(cfg.cameraPath||'stream')}`;
    if (cfg.logCollapsed) {
      get('logPanel').style.display = 'none';
      toggleLogBtn.textContent = 'Show Log';
    } else {
      get('logPanel').style.display = 'block';
      toggleLogBtn.textContent = 'Hide Log';
    }
  }
  applyConfig();

  // Helpers
  function log(text) {
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
    logArea.appendChild(line);
    // keep length
    if (logArea.children.length > 1000) logArea.removeChild(logArea.firstChild);
  }

  function exportLog() {
    let txt = '';
    for (const child of logArea.children) txt += child.textContent + '\n';
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mebo-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  exportLogBtn.addEventListener('click', exportLog);

  toggleLogBtn.addEventListener('click', () => {
    const panel = get('logPanel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      cfg.logCollapsed = false;
      toggleLogBtn.textContent = 'Hide Log';
    } else {
      panel.style.display = 'none';
      cfg.logCollapsed = true;
      toggleLogBtn.textContent = 'Show Log';
    }
    window.meboAPI.saveConfig(cfg);
  });

  // HTTP send helper (renderer performs fetch to Mebo)
  async function sendToMebo(path, opts={}) {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base) {
      log('No base URL configured.');
      return;
    }
    const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\/+/, '')}`;
    try {
      const res = await fetch(url, opts);
      log(`HTTP ${opts.method||'GET'} ${url} → ${res.status}`);
      return res;
    } catch (err) {
      log(`Network error: ${err.message}`);
      throw err;
    }
  }

  // Map endpoints (user-editable in settings UI)
  const endpoints = {
    move: cfg.endpoints?.move || 'move?dir=__dir__&spd=__speed__',
    arm: cfg.endpoints?.arm || 'arm?dir=__dir__',
    claw: cfg.endpoints?.claw || 'claw?action=__action__',
    camera: cfg.endpoints?.camera || 'stream',
    speak: cfg.endpoints?.speak || 'speak?text=__text__',
    mic: cfg.endpoints?.mic || 'mic'
  };

  function renderCameraPath() {
    videoEl.src = `${(cfg.baseUrl||'').replace(/\/$/, '')}/${endpoints.camera}`;
  }

  // Wire buttons
  function move(dir) {
    const path = endpoints.move.replace(/__dir__/g, dir).replace(/__speed__/g, cfg.speed || 5);
    sendToMebo(path).catch(()=>{});
  }
  function arm(dir) {
    const path = endpoints.arm.replace(/__dir__/g, dir);
    sendToMebo(path).catch(()=>{});
  }
  function claw(action) {
    const path = endpoints.claw.replace(/__action__/g, action);
    sendToMebo(path).catch(()=>{});
  }

  btns.forward?.addEventListener('click', () => move('forward'));
  btns.backward?.addEventListener('click', () => move('backward'));
  btns.left?.addEventListener('click', () => move('left'));
  btns.right?.addEventListener('click', () => move('right'));
  btns.armUp?.addEventListener('click', () => arm('up'));
  btns.armDown?.addEventListener('click', () => arm('down'));
  btns.clawOpen?.addEventListener('click', () => claw('open'));
  btns.clawClose?.addEventListener('click', () => claw('close'));

  // Camera tilt
  get('cameraUp')?.addEventListener('click', () => sendToMebo('camera?tilt=up'));
  get('cameraDown')?.addEventListener('click', () => sendToMebo('camera?tilt=down'));

  // Save settings button
  saveSettingsBtn.addEventListener('click', async () => {
    cfg.baseUrl = baseUrlInput.value.trim();
    cfg.speed = Number(speedInput.value) || 5;
    cfg.volume = Number(volumeSlider.value) || 50;
    cfg.aiMode = aiModeSelect.value;
    // update endpoints from UI fields if you add them (not shown)
    const res = await window.meboAPI.saveConfig(cfg);
    if (res && res.ok) {
      log('Settings saved.');
      // refresh camera
      renderCameraPath();
    } else {
      log('Failed to save settings.');
    }
  });

  // Keyboard mapping & execution
  function executeMappedKeyAction(key) {
    // check keyboard map
    const km = cfg.keyboard || {};
    for (const action in km) {
      if (km[action] && km[action].toLowerCase() === key.toLowerCase()) {
        // map action names to functions above
        switch(action) {
          case 'forward': move('forward'); return;
          case 'backward': move('backward'); return;
          case 'left': move('left'); return;
          case 'right': move('right'); return;
          case 'armUp': arm('up'); return;
          case 'armDown': arm('down'); return;
          case 'clawOpen': claw('open'); return;
          case 'clawClose': claw('close'); return;
          case 'mic': toggleMic(); return;
          case 'tts': ttsBtn.click(); return;
        }
      }
    }
  }
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    executeMappedKeyAction(e.key);
  });

  // TTS speak button
  ttsBtn.addEventListener('click', () => {
    const text = ttsInput.value.trim();
    if (!text) return;
    if (endpoints.speak) {
      // use robot speak endpoint if configured
      const path = endpoints.speak.replace(/__text__/g, encodeURIComponent(text));
      sendToMebo(path).catch(()=>{});
    } else if (window.speechSynthesis) {
      // fallback local speech
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  });

  // Mic streaming: capture audio and POST PCM16 little-endian chunks to robot mic endpoint
  let micStream = null;
  let micProcessor = null;
  let audioCtx = null;
  async function startMic() {
    if (!endpoints.mic) {
      log('No mic endpoint configured.');
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(micStream);
      micProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      src.connect(micProcessor);
      micProcessor.connect(audioCtx.destination);
      micProcessor.onaudioprocess = async (e) => {
        const ch = e.inputBuffer.getChannelData(0);
        // convert to 16-bit PCM
        const buffer = new ArrayBuffer(ch.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < ch.length; i++) {
          let s = Math.max(-1, Math.min(1, ch[i]));
          view.setInt16(i*2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        try {
          await fetch(`${(cfg.baseUrl||'').replace(/\/$/, '')}/${endpoints.mic}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buffer
          });
        } catch (err) {
          // ignore intermittent errors
        }
      };
      micBtn.textContent = 'Mic (On)';
      log('Mic streaming started.');
    } catch (err) {
      log('Mic start failed: ' + err.message);
    }
  }
  function stopMic() {
    try {
      if (micProcessor) micProcessor.disconnect();
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      micProcessor = null;
      micStream = null;
      audioCtx = null;
      micBtn.textContent = 'Mic';
      log('Mic stopped.');
    } catch (e) {}
  }
  function toggleMic() {
    if (micStream) stopMic(); else startMic();
  }
  micBtn.addEventListener('click', toggleMic);

  // Live audio playback from Mebo microphone (robot->app)
  const audioPlayback = new Audio();
  audioPlayback.autoplay = true;
  audioPlayback.controls = false;
  // playback source is robot mic stream endpoint if provided
  function updateAudioPlayback() {
    if (cfg.baseUrl && endpoints.camera) {
      audioPlayback.src = `${(cfg.baseUrl||'').replace(/\/$/, '')}/${(cfg.endpoints?.audio||'audio')}`;
    }
  }
  updateAudioPlayback();
  volumeSlider.addEventListener('input', () => {
    audioPlayback.volume = Number(volumeSlider.value) / 100;
    cfg.volume = Number(volumeSlider.value);
    window.meboAPI.saveConfig(cfg);
  });
  // append audio element hidden
  document.body.appendChild(audioPlayback);

  // AI chat: send to local LLM HTTP server (if available) or online endpoint
  async function sendToLLM(prompt) {
    // prefer local server at http://localhost:3030/ai
    try {
      if (cfg.aiMode === 'local') {
        const res = await fetch('http://localhost:3030/ai', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prompt })
        });
        const json = await res.json();
        return json;
      } else if (cfg.aiMode === 'online') {
        // online mode - user must configure a proxy or provide API endpoint in settings
        if (cfg.onlineApiUrl) {
          const res = await fetch(cfg.onlineApiUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.onlineApiKey || ''}`},
            body: JSON.stringify({ prompt })
          });
          return await res.json();
        } else {
          throw new Error('No online API configured.');
        }
      } else {
        throw new Error('Human mode - no AI call.');
      }
    } catch (err) {
      log('LLM request failed: ' + err.message);
      return { error: err.message };
    }
  }

  aiSend.addEventListener('click', async () => {
    const text = aiInput.value.trim();
    if (!text) return;
    aiOutput.value += `You: ${text}\n`;
    const reply = await sendToLLM(text);
    aiOutput.value += `AI: ${reply?.reply || JSON.stringify(reply)}\n`;
    // try to parse JSON commands from AI reply to execute
    try {
      const match = (reply?.reply || '').match(/\{[\s\S]*\}/);
      if (match) {
        const cmd = JSON.parse(match[0]);
        executeAICommand(cmd);
      }
    } catch (e) {
      // ignore
    }
  });

  // Execute simple AI JSON commands
  async function executeAICommand(cmd) {
    // Example cmd: { "action": "move", "direction": "forward", "duration": 2000 }
    if (!cmd || !cmd.action) return;
    log('AI command: ' + JSON.stringify(cmd));
    if (cmd.action === 'move' && cmd.direction) {
      move(cmd.direction);
      if (cmd.duration) {
        setTimeout(() => sendToMebo('move?dir=stop'), cmd.duration);
      }
    } else if (cmd.action === 'speak' && cmd.text) {
      const path = endpoints.speak.replace(/__text__/g, encodeURIComponent(cmd.text));
      await sendToMebo(path);
    } else if (cmd.action === 'sequence' && Array.isArray(cmd.steps)) {
      for (const step of cmd.steps) {
        await executeAICommand(step);
        if (step.duration) await new Promise(r => setTimeout(r, step.duration));
      }
    }
  }

  // Simple Mebo auto-detect (tries configured URLs)
  async function autodetectMebo() {
    const candidates = cfg.meboBaseUrls || ['http://192.168.4.1','http://192.168.10.1','http://192.168.0.1'];
    for (const c of candidates) {
      try {
        const res = await fetch(`${c}/status`, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          cfg.baseUrl = c;
          window.meboAPI.saveConfig(cfg);
          applyConfig();
          log('Detected Mebo at ' + c);
          return c;
        }
      } catch (e) {
        // ignore
      }
    }
    log('Auto-detect failed.');
    return null;
  }

  // Initial render
  renderCameraPath();
  updateAudioPlayback();

  // expose some functions for console/test
  window._mebo = { cfg, move, arm, claw, sendToMebo, executeAICommand, autodetectMebo, log };

})();
