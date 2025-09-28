const { ipcRenderer } = require('electron');

// Elements
const videoEl = document.getElementById('cameraFeed');
const speedSlider = document.getElementById('speedSlider');
const volumeSlider = document.getElementById('volumeSlider');
const micButton = document.getElementById('micBtn');
const ttsInput = document.getElementById('ttsInput');
const ttsBtn = document.getElementById('ttsBtn');

// Config
let config = {};
async function loadConfig() {
  config = await ipcRenderer.invoke('get-config');
  speedSlider.value = config.speed;
  volumeSlider.value = config.volume;
}
loadConfig();

// Save config changes
speedSlider.addEventListener('input', () => saveConfig());
volumeSlider.addEventListener('input', () => saveConfig());
function saveConfig() {
  config.speed = Number(speedSlider.value);
  config.volume = Number(volumeSlider.value);
  ipcRenderer.send('save-config', config);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  switch (e.code) {
    case 'ArrowUp': sendCommand('forward'); break;
    case 'ArrowDown': sendCommand('backward'); break;
    case 'ArrowLeft': sendCommand('left'); break;
    case 'ArrowRight': sendCommand('right'); break;
    case 'KeyW': sendCommand('arm_up'); break;
    case 'KeyS': sendCommand('arm_down'); break;
    case 'KeyA': sendCommand('claw_open'); break;
    case 'KeyD': sendCommand('claw_close'); break;
  }
});

// Send command to Mebo robot
function sendCommand(cmd) {
  fetch(`http://mebo.local/api/${cmd}?speed=${config.speed}`, { method: 'POST' }).catch(console.error);
}

// Camera feed
videoEl.src = 'http://mebo.local/camera';

// TTS
ttsBtn.addEventListener('click', () => {
  fetch(`http://mebo.local/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: ttsInput.value })
  }).catch(console.error);
});

// Mic streaming
micButton.addEventListener('mousedown', startMicStream);
micButton.addEventListener('mouseup', stopMicStream);

let mediaStream;
async function startMicStream() {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(2048, 1, 1);

  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = e => {
    const input = e.inputBuffer.getChannelData(0);
    // send WAV chunk to Mebo API
    fetch('http://mebo.local/api/mic', {
      method: 'POST',
      body: input.buffer
    }).catch(console.error);
  };
}

function stopMicStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}
