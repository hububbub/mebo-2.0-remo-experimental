const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath));

// Helper to save config
function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Movement commands
function move(direction) {
  const speed = config.speed;
  // Send HTTP request to Mebo robot
  fetch(`http://192.168.10.1/move?dir=${direction}&speed=${speed}`);
}

// Hook buttons
document.getElementById('btnForward').onclick = () => move('forward');
document.getElementById('btnBack').onclick = () => move('backward');
document.getElementById('btnLeft').onclick = () => move('left');
document.getElementById('btnRight').onclick = () => move('right');

// Arm & Claw
document.getElementById('armUp').onclick = () => fetch('http://192.168.10.1/arm/up');
document.getElementById('armDown').onclick = () => fetch('http://192.168.10.1/arm/down');
document.getElementById('clawOpen').onclick = () => fetch('http://192.168.10.1/claw/open');
document.getElementById('clawClose').onclick = () => fetch('http://192.168.10.1/claw/close');

// TTS / Mic
let micStream, audioContext, micNode, destNode;
document.getElementById('btnMic').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    micNode = audioContext.createMediaStreamSource(micStream);
    destNode = audioContext.createMediaStreamDestination();
    micNode.connect(destNode);
    // Stream to Mebo TTS endpoint (example)
    const reader = destNode.stream.getAudioTracks()[0];
    fetch('http://192.168.10.1/speak', { method: 'POST', body: reader });
  }
};

// AI Mode
document.getElementById('toggleAI').onclick = () => {
  config.aiEnabled = !config.aiEnabled;
  saveConfig();
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'w': move('forward'); break;
    case 's': move('backward'); break;
    case 'a': move('left'); break;
    case 'd': move('right'); break;
    case 'ArrowUp': fetch('http://192.168.10.1/arm/up'); break;
    case 'ArrowDown': fetch('http://192.168.10.1/arm/down'); break;
    case 'o': fetch('http://192.168.10.1/claw/open'); break;
    case 'c': fetch('http://192.168.10.1/claw/close'); break;
  }
});
