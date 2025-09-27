const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// Config file persistence
const configPath = path.join(app.getPath("userData"), "config.json");
let config = {
  speed: 100,
  keyboardShortcuts: {}
};

// Load or create default config
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath));
  } catch (err) {
    console.error("Error loading config, using defaults:", err);
  }
} else {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  win.loadFile("index.html");

  // Custom Menu
  const template = [
    {
      label: "Mebo",
      submenu: [
        { role: "reload" },
        { role: "quit" }
      ]
    },
    {
      label: "Controls",
      submenu: [
        { label: "Keyboard Shortcuts", click: () => win.webContents.send("open-keyboard-settings") },
        { label: "Settings", click: () => win.webContents.send("open-settings") }
      ]
    },
    {
      label: "AI",
      submenu: [
        { label: "AI Settings", click: () => win.webContents.send("open-ai-settings") }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: "About", click: () => win.webContents.send("show-about") }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

// Mac behavior
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Export config save for renderer
module.exports = { config, saveConfig };
