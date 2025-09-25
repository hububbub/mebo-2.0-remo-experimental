const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("meboAI", {
  analyzeFrame: (frameBase64) => ipcRenderer.invoke("analyze-frame", frameBase64),
  setProvider: (provider) => ipcRenderer.send("set-ai-provider", provider),
  setLocalApiUrl: (url) => ipcRenderer.send("set-local-api-url", url)
});
