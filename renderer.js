const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');
let config = JSON.parse(fs.readFileSync(configPath));

// Axios workaround: dynamic require
let axios;
try { axios = require('axios'); } 
catch(e){ window.alert('Axios not installed!'); }

// Mebo API helper
const MEBO_BASE_URL = 'http://192.168.4.1'; // auto-detect later
function sendCommand(endpoint, payload) {
  if(!axios) return;
  axios.post(`${MEBO_BASE_URL}/${endpoint}`, payload).catch(console.log);
}

// Movement buttons
['forward','backward','left','right'].forEach(btn => {
  const el = document.getElementById(btn);
  if(el) el.onclick = () => sendCommand('move', {direction: btn, speed: config.speed});
});

// Arm/Claw
['arm-up','arm-down','claw-open','claw-close','claw-turn'].forEach(btn => {
  const el = document.getElementById(btn);
  if(el) el.onclick = () => sendCommand('arm', {action: btn});
});

// Mic button streaming
const micBtn = document.getElementById('mic-btn');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let mediaStream;
micBtn.onclick = async () => {
  if(!mediaStream){
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const processor = audioCtx.createScriptProcessor(4096,1,1);
    source.connect(processor);
    processor.connect(audioCtx.destination);
    processor.onaudioprocess = e => {
      const data = e.inputBuffer.getChannelData(0);
      // TODO: send WAV data to Mebo API
    }
  } else {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
};

// Text-to-speech
document.getElementById('tts-send').onclick = () => {
  const text = document.getElementById('tts-text').value;
  sendCommand('tts', {text});
};

// Save settings
document.getElementById('save-settings').onclick = () => {
  config.speed = Number(document.getElementById('speed').value);
  config.aiMode = document.getElementById('ai-toggle').checked;
  ipcRenderer.send('save-config', config);
};
