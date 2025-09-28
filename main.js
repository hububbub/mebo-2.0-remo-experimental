const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  // Load saved window size/position
  const bounds = store.get('windowBounds');
  if (bounds) mainWindow.setBounds(bounds);

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });
}

// App ready
app.whenReady().then(() => {
  createWindow();

  // Register global shortcuts for robot control
  const shortcuts = store.get('keyboardShortcuts') || {};
  for (let action in shortcuts) {
    globalShortcut.register(shortcuts[action], () => {
      mainWindow.webContents.send('keyboard-action', action);
    });
  }

  // Custom menu
  const template = [
    {
      label: 'Mebo',
      submenu: [
        { label: 'Settings', click: () => mainWindow.webContents.send('open-settings') },
        { label: 'Keyboard Shortcuts', click: () => mainWindow.webContents.send('open-keyboard') },
        { type: 'separator' },
        { label: 'Exit', click: () => app.quit() }
      ]
    },
    {
      label: 'AI',
      submenu: [
        { label: 'Enable Local LLM', click: () => mainWindow.webContents.send('toggle-llm', 'local') },
        { label: 'Enable Online LLM', click: () => mainWindow.webContents.send('toggle-llm', 'online') },
        { label: 'Dual Mode', click: () => mainWindow.webContents.send('toggle-llm', 'dual') }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

// IPC listeners for commands from renderer
ipcMain.on('robot-command', (event, command, payload) => {
  // Forward to robot API via HTTP or local API
  mainWindow.webContents.send('send-command', { command, payload });
});

ipcMain.on('save-settings', (event, settings) => {
  store.set('settings', settings);
});

ipcMain.on('load-settings', (event) => {
  event.returnValue = store.get('settings') || {};
});

// TTS / mic streaming
ipcMain.on('speak-text', (event, text) => {
  mainWindow.webContents.send('tts-command', text);
});

ipcMain.on('mic-stream', (event, action) => {
  mainWindow.webContents.send('mic-command', action);
});

// Clean up on all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
