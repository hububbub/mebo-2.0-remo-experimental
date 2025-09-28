// main.js - Electron main process (no macOS)
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const USER_DATA = app.getPath("userData");
const CONFIG_PATH = path.join(USER_DATA, "config.json");

const DEFAULT_CONFIG = {
  meboBaseUrl: "http://192.168.10.1:80",
  endpoints: {
    move: "move?dir=__dir__&spd=__speed__",
    arm: "arm?dir=__dir__",
    claw: "claw?action=__action__",
    cameraStream: "stream",
    speak: "speak?text=__text__",
    mic: "mic" 
  },
  speed: 5,
  shortcuts: {
    forward: "w",
    backward: "s",
    left: "a",
    right: "d",
    armUp: "i",
    armDown: "k",
    clawOpen: "o",
    clawClose: "p",
    camUp: "u",
    camDown: "j"
  },
  aiMode: "online", // "online" or "local"
  logCollapsed: true
};

function ensureConfig() {
  try {
    if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true });
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    // Merge missing keys with defaults (simple shallow merge for top-level)
    const conf = Object.assign({}, DEFAULT_CONFIG, parsed);
    if (!conf.endpoints) conf.endpoints = DEFAULT_CONFIG.endpoints;
    if (!conf.shortcuts) conf.shortcuts = DEFAULT_CONFIG.shortcuts;
    return conf;
  } catch (err) {
    console.error("Failed to load/create config:", err);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to save config:", err);
    return false;
  }
}

let mainWindow;
let appConfig = ensureConfig();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.on("ready", createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// IPC handlers for config persistence
ipcMain.handle("get-config", async () => {
  appConfig = ensureConfig();
  return appConfig;
});

ipcMain.handle("save-config", async (event, newCfg) => {
  appConfig = Object.assign({}, appConfig, newCfg);
  const ok = saveConfig(appConfig);
  return { ok };
});
