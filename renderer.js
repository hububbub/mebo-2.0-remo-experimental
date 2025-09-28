const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();

let settings = store.get('settings') || {};
let micStreaming = false;
let aiMode = 'local'; // local, online, dual

// Auto-load camera feed
const cameraFeed = document.getElementById('camera-feed');
function updateCamera() {
  cameraFeed.src = 'http://192.168.4.1:8080/video'; // Mebo local camera stream
  setTimeout(updateCamera, 1000);
}
updateCamera();

// Robot control buttons
const controls = ['forward','backward','left','right','armUp','armDown','clawOpen','clawClose','cameraUp','cameraDown'];
controls.forEach(btn => {
  const el = document.getElementById(btn);
  if(el) {
    el.addEventListener('click', () => {
      ipcRenderer.send('robot-command', btn, { speed: settings.speed || 50 });
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const keyMap = store.get('keyboardShortcuts') || {};
  for (let action in keyMap) {
    if(e.key.toLowerCase() === keyMap[action].toLowerCase()) {
      ipcRenderer.send('robot-command', action, { speed: settings.speed || 50 });
      e.preventDefault();
    }
  }
});

// AI tab commands
ipcRenderer.on('toggle-llm', (event, mode) => {
  aiMode = mode;
  console.log('AI mode set to:', mode);
});

// Settings menu
ipcRenderer.on('open-settings', () => {
  document.getElementById('settings-modal').style.display = 'block';
});
ipcRenderer.on('open-keyboard', () => {
  document.getElementById('keyboard-modal').style.display = 'block';
});
document.getElementById('save-settings').addEventListener('click', () => {
  settings.speed = parseInt(document.getElementById('speed').value);
  store.set('settings', settings);
  document.getElementById('settings-modal').style.display = 'none';
});

// TTS & mic streaming
document.getElementById('mic-btn').addEventListener('click', () => {
  micStreaming = !micStreaming;
  ipcRenderer.send('mic-stream', micStreaming ? 'start' : 'stop');
});
document.getElementById('speak-btn').addEventListener('click', () => {
  const text = document.getElementById('tts-input').value;
  ipcRenderer.send('speak-text', text);
});

// Handle robot commands from main (for AI autonomous control)
ipcRenderer.on('send-command', (event, { command, payload }) => {
  // Execute robot command
  console.log('Robot command received:', command, payload);
  // Send HTTP request to Mebo API
  fetch(`http://192.168.4.1/api/${command}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).catch(err => console.error('Error sending command:', err));
});

// Persistent keyboard shortcut changes
document.getElementById('save-keyboard').addEventListener('click', () => {
  const newMap = {};
  controls.forEach(btn => {
    const val = document.getElementById('key-' + btn).value;
    if(val) newMap[btn] = val;
  });
  store.set('keyboardShortcuts', newMap);
  document.getElementById('keyboard-modal').style.display = 'none';
});

// Audio streaming from Mebo mic
const audioElement = document.getElementById('robot-audio');
let audioStream = new Audio();
audioStream.src = 'http://192.168.4.1:8081/audio'; // Mebo mic stream
audioStream.autoplay = true;
audioElement.appendChild(audioStream);

// Volume control
document.getElementById('volume-slider').addEventListener('input', (e) => {
  audioStream.volume = e.target.value / 100;
});

// Auto-save settings periodically
setInterval(() => {
  store.set('settings', settings);
}, 5000);
