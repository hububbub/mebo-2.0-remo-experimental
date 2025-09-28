const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
const configPath = path.join(__dirname, '../config.json');

// Load or create default config
let config = {
  speed: 50,
  keyboard: {},
  aiMode: false
};

if (fs.existsSync(configPath)) {
  try { config = JSON.parse(fs.readFileSync(configPath)); } 
  catch(e){ console.log('Invalid config.json, using defaults'); }
} else {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.on('save-config', (event, newConfig) => {
  config = newConfig;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
