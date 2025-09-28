const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'config.json');
let config = { speed: 50, aiMode: false, lastModel: 'local' };

// Load saved config
if (fs.existsSync(configPath)) {
  try { config = JSON.parse(fs.readFileSync(configPath)); } 
  catch { console.warn('Config parse error, using defaults'); }
}

// Save config function
function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-config', () => config);
ipcMain.handle('set-config', (_, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig();
  return config;
});

ipcMain.handle('send-command', async (_, command) => {
  // Use native fetch to send HTTP requests to Mebo robot
  try {
    const meboIP = config.meboIP || '192.168.4.1';
    const res = await fetch(`http://${meboIP}/${command}`, { method: 'POST' });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    return { error: err.message };
  }
});
