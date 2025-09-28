const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, '../config.json');
let config = JSON.parse(fs.readFileSync(configPath));

// Axios fallback
let axios;
try { axios = require('axios'); } 
catch(e){ console.log('Axios not installed'); }

// Mebo API
let MEBO_BASE_URL = 'http://192.168.4.1'; // Update auto-detect later
function sendCommand(endpoint, payload) {
  if(!axios) return;
  axios.post(`${MEBO_BASE_URL}/${endpoint}`, payload).catch(console.log);
}

// Movement
['forward','backward','left','right'].forEach(btn => {
  const el = document.getElementById(btn);
  if(el) el.onclick = () => sendCommand('move',{direction:btn,speed:config.speed});
});

// Arm/Claw
['arm-up','arm-down','claw-open','claw-close','claw-turn'].forEach(btn => {
  const el = document.getElementById(btn);
  if(el) el.onclick = () => sendCommand('arm',{action:btn});
});

// Mic streaming
let mediaStream;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.getElementById('mic-btn').onclick = async () => {
  if(!mediaStream){
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const processor = audioCtx.createScriptProcessor(4096,1,1);
    source.connect(processor);
    processor.connect(audioCtx.destination);
    processor.onaudioprocess = e => {
      const data = e.inputBuffer.getChannelData(0);
      // TODO: send WAV to Mebo speaker
    };
  } else {
    mediaStream.getTracks().forEach(t=>t.stop());
    mediaStream=null;
  }
};

// Text-to-speech
document.getElementById('tts-send').onclick = () => {
  const text = document.getElementById('tts-text').value;
  sendCommand('tts',{text});
};

// Save settings
document.getElementById('save-settings').onclick = () => {
  config.speed = Number(document.getElementById('speed').value);
  config.aiMode = document.getElementById('ai-toggle').checked;
  config.volume = Number(document.getElementById('volume').value);
  ipcRenderer.send('save-config',config);
};

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  for(let key in config.keyboard){
    if(e.key===config.keyboard[key]){
      const btn = document.getElementById(key);
      if(btn) btn.click();
    }
  }
});

// Video feed
const videoEl = document.getElementById('video-feed');
videoEl.src = `${MEBO_BASE_URL}/camera`;
videoEl.play().catch(console.log);
