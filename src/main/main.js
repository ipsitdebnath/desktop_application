const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Window creation ──────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    title: 'PII Shield',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // security: isolate renderer
      nodeIntegration: false,   // security: no Node in renderer
      sandbox: false,
    },
    backgroundColor: '#060a14',
    show: false,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC Handlers ─────────────────────────────────────────────────

// Open a native file-picker limited to our supported types
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Supported Documents', extensions: ['txt', 'pdf', 'png', 'jpg', 'jpeg'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);

  return {
    canceled: false,
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    ext: path.extname(filePath).toLowerCase(),
  };
});

// Scan-history persistence (stores metadata only — never stores document content)
const historyFilePath = () => path.join(app.getPath('userData'), 'scan-history.json');

ipcMain.handle('history:load', async () => {
  try {
    if (fs.existsSync(historyFilePath())) {
      return JSON.parse(fs.readFileSync(historyFilePath(), 'utf-8'));
    }
  } catch {
    // corrupted file — return empty
  }
  return [];
});

ipcMain.handle('history:save', async (_event, history) => {
  fs.writeFileSync(historyFilePath(), JSON.stringify(history, null, 2), 'utf-8');
});

ipcMain.handle('history:clear', async () => {
  if (fs.existsSync(historyFilePath())) fs.unlinkSync(historyFilePath());
});
