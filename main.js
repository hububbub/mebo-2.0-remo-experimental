const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
const configPath = path.join(__dirname, '../config.json');
let config = JSON.parse(fs.readFileSync(configPath));

// Create the main window
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

// Listen for config updates
ipcMain.on('save-config', (event, newConfig) => {
  config = newConfig;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
