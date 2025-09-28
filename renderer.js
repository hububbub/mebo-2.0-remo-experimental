const { ipcRenderer } = require('electron');

// Settings
let config = { speed: 50, aiMode: false };

// Load settings on startup
(async () => {
  config = await ipcRenderer.invoke('get-config');
  document.getElementById('speedSlider').value = config.speed;
  document.getElementById('aiToggle').checked = config.aiMode;
})();

// Save settings
function saveConfig() {
  ipcRenderer.invoke('set-config', config);
}

// Movement buttons
const moveButtons = {
  forward: 'moveForward',
  backward: 'moveBackward',
  left: 'turnLeft',
  right: 'turnRight',
};
Object.keys(moveButtons).forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    ipcRenderer.invoke('send-command', `${moveButtons[id]}?speed=${config.speed}`);
  });
});

// Arm & claw
const armButtons = { up: 'armUp', down: 'armDown', open: 'clawOpen', close: 'clawClose', turn: 'clawTurn' };
Object.keys(armButtons).forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    ipcRenderer.invoke('send-command', armButtons[id]);
  });
});

// Keyboard controls
document.addEventListener('keydown', e => {
  switch(e.key.toLowerCase()) {
    case 'w': ipcRenderer.invoke('send-command', `moveForward?speed=${config.speed}`); break;
    case 's': ipcRenderer.invoke('send-command', `moveBackward?speed=${config.speed}`); break;
    case 'a': ipcRenderer.invoke('send-command', 'turnLeft'); break;
    case 'd': ipcRenderer.invoke('send-command', 'turnRight'); break;
    case 'i': ipcRenderer.invoke('send-command', 'armUp'); break;
    case 'k': ipcRenderer.invoke('send-command', 'armDown'); break;
    case 'o': ipcRenderer.invoke('send-command', 'clawOpen'); break;
    case 'p': ipcRenderer.invoke('send-command', 'clawClose'); break;
    case 'l': ipcRenderer.invoke('send-command', 'clawTurn'); break;
  }
});

// TTS & mic streaming
document.getElementById('speakBtn').addEventListener('click', () => {
  const text = document.getElementById('ttsInput').value;
  ipcRenderer.invoke('send-command', `tts?text=${encodeURIComponent(text)}`);
});

// Live video stream
const videoEl = document.getElementById('liveVideo');
const meboIP = config.meboIP || '192.168.4.1';
videoEl.src = `http://${meboIP}/video_feed`;

// Live audio
const audioEl = document.getElementById('liveAudio');
audioEl.src = `http://${meboIP}/audio_feed`;
document.getElementById('volumeSlider').addEventListener('input', e => {
  audioEl.volume = e.target.value / 100;
});

// AI mode toggle
document.getElementById('aiToggle').addEventListener('change', e => {
  config.aiMode = e.target.checked;
  saveConfig();
});
