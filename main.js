const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// The ONE allowlisted IPC channel. app.getVersion() is the single version authority
// (the packaged bundle version; the renderer never reads package.json). Any new
// channel added here is a reviewed governance change, never an incidental edit.
const APP_VERSION_CHANNEL = 'app:get-version';

function registerIpcHandlers() {
  // removeHandler-first makes registration idempotent (double-registration guard).
  ipcMain.removeHandler(APP_VERSION_CHANNEL);
  ipcMain.handle(APP_VERSION_CHANNEL, () => app.getVersion());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0b1120',
    title: 'Racing Setup Analyzer',
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
