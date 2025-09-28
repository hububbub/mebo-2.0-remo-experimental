// Axios workaround: use CDN if not installed
let axios;
try {
  axios = require('axios');
} catch (e) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
  document.head.appendChild(script);
  script.onload = () => { axios = window.axios; init(); };
  return;
}

init();

function init() {
  const baseURL = 'http://192.168.4.1'; // Replace with Mebo's local IP if needed

  const commands = {
    forward: '/api/move?dir=forward',
    backward: '/api/move?dir=backward',
    left: '/api/move?dir=left',
    right: '/api/move?dir=right',
    armUp: '/api/arm?move=up',
    armDown: '/api/arm?move=down',
    clawOpen: '/api/claw?move=open',
    clawClose: '/api/claw?move=close',
    speak: text => `/api/speak?text=${encodeURIComponent(text)}`,
    mic: '/api/mic'
  };

  for (let key in commands) {
    const btn = document.getElementById(key);
    if (!btn) continue;
    btn.addEventListener('click', async () => {
      if (key === 'speak') {
        const text = document.getElementById('ttsText').value;
        await axios.get(baseURL + commands.speak(text));
      } else {
        await axios.get(baseURL + commands[key]);
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp': axios.get(baseURL + commands.forward); break;
      case 'ArrowDown': axios.get(baseURL + commands.backward); break;
      case 'ArrowLeft': axios.get(baseURL + commands.left); break;
      case 'ArrowRight': axios.get(baseURL + commands.right); break;
      case 'w': axios.get(baseURL + commands.armUp); break;
      case 's': axios.get(baseURL + commands.armDown); break;
      case 'a': axios.get(baseURL + commands.clawOpen); break;
      case 'd': axios.get(baseURL + commands.clawClose); break;
    }
  });

  // Mic streaming and volume
  const volumeSlider = document.getElementById('volumeSlider');
  volumeSlider.addEventListener('input', e => {
    // send volume to robot speaker API
    axios.get(baseURL + `/api/volume?level=${e.target.value}`);
  });

  // TODO: Mic streaming setup, live camera feed
}
