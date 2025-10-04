// main.js — Electron main process
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG_NAME = 'config.json';
const CONFIG_PATH = path.join(app.getPath('userData'), CONFIG_NAME);

// Default configuration
const DEFAULT_CONFIG = {
  meboBaseUrls: [ "http://192.168.4.1", "http://192.168.10.1", "http://192.168.0.1" ], // tried addresses
  baseUrl: "http://192.168.4.1",
  speed: 5,
  volume: 50,
  aiMode: "local", // local | online | human
  lastModel: "local",
  keyboard: {
    forward: "ArrowUp",
    backward: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    armUp: "w",
    armDown: "s",
    clawOpen: "a",
    clawClose: "d",
    mic: "m",
    tts: "t"
  },
  logCollapsed: true
};

let mainWindow;
let config = DEFAULT_CONFIG;

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      config = Object.assign({}, DEFAULT_CONFIG, parsed);
    } else {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      config = DEFAULT_CONFIG;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
    config = DEFAULT_CONFIG;
  }
}

// Save config
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save config:', err);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // Menu with shortcuts to settings
  const template = [
    {
      label: 'Mebo',
      submenu: [
        { label: 'Settings', click: () => mainWindow.webContents.send('open-settings') },
        { label: 'Keyboard Shortcuts', click: () => mainWindow.webContents.send('open-keyboard') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        { label: 'AI Mode: Local', click: () => { config.aiMode = 'local'; saveConfig(); mainWindow.webContents.send('ai-mode', 'local'); } },
        { label: 'AI Mode: Online', click: () => { config.aiMode = 'online'; saveConfig(); mainWindow.webContents.send('ai-mode', 'online'); } },
        { label: 'AI Mode: Human (Manual)', click: () => { config.aiMode = 'human'; saveConfig(); mainWindow.webContents.send('ai-mode', 'human'); } }
      ]
    },
    { role: 'help' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// IPC: get config
ipcMain.handle('get-config', async () => {
  return config;
});

// IPC: save config
ipcMain.handle('save-config', async (_, newCfg) => {
  config = Object.assign({}, config, newCfg);
  const ok = saveConfig();
  return { ok, config };
});

// Shutdown
app.on('window-all-closed', () => {
  app.quit();
});
