// preload.js — exposes a small safe API to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('meboAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  on: (channel, handler) => {
    const valid = ['ai-mode', 'open-settings', 'open-keyboard'];
    if (!valid.includes(channel)) return;
    ipcRenderer.on(channel, (e, ...args) => handler(...args));
  },
  sendEvent: (channel, payload) => {
    // allow limited sends if necessary
    ipcRenderer.send(channel, payload);
  }
});
