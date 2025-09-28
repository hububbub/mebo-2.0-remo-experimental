const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const configPath = path.join(app.getPath('userData'), 'config.json');
let config = { speed: 50, volume: 50, aiEnabled: true, keymap: {} };

// Load or create config
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath));
  } else {
    fs.writeFileSync(configPath, JSON.stringify(config));
  }
} catch (e) {
  console.error('Failed to load config:', e);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  // Custom menu
  const template = [
    {
      label: 'Mebo',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Controls',
      submenu: [
        { label: 'Keyboard Shortcuts', click: () => mainWindow.webContents.send('open-shortcuts') },
        { label: 'AI Settings', click: () => mainWindow.webContents.send('open-ai') }
      ]
    },
    { role: 'help' }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// IPC for saving config
ipcMain.on('save-config', (_, newConfig) => {
  config = { ...config, ...newConfig };
  fs.writeFileSync(configPath, JSON.stringify(config));
});

// IPC to request config
ipcMain.handle('get-config', () => config);
