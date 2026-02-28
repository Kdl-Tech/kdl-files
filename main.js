const { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Base de données ──────────────────────────────────────────────────────────
const db = require('./electron/database');

// ── Handlers IPC ─────────────────────────────────────────────────────────────
const { registerFilesHandlers }      = require('./electron/ipc/files');
const { registerIndexHandlers }      = require('./electron/ipc/indexer');
const { registerSearchHandlers }     = require('./electron/ipc/search');
const { registerDuplicatesHandlers } = require('./electron/ipc/duplicates');
const { registerOrganizerHandlers }  = require('./electron/ipc/organizer');
const { registerWatcherHandlers }    = require('./electron/ipc/watcher');
const { registerDisksHandlers }      = require('./electron/ipc/disks');
const { registerTagsHandlers }       = require('./electron/ipc/tags');
const { registerHistoryHandlers }    = require('./electron/ipc/history');

let win;

function createWindow() {
  win = new BrowserWindow({
    width:     1440,
    height:    900,
    minWidth:  1100,
    minHeight: 700,
    frame:     false,
    titleBarStyle: 'hidden',
    backgroundColor: '#050810',
    show: false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
      sandbox:          true,
    }
  });

  // Enregistrement de tous les handlers IPC
  registerFilesHandlers(ipcMain, win, db);
  registerIndexHandlers(ipcMain, win, db);
  registerSearchHandlers(ipcMain, db);
  registerDuplicatesHandlers(ipcMain, win, db);
  registerOrganizerHandlers(ipcMain, win, db);
  registerWatcherHandlers(ipcMain, win, db);
  registerDisksHandlers(ipcMain, win, db);
  registerTagsHandlers(ipcMain, db);
  registerHistoryHandlers(ipcMain, db);

  // ── Contrôles fenêtre ────────────────────────────────────────────────────
  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:maximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('win:close', () => win.close());
  win.on('maximize',   () => win.webContents.send('win:maximized', true));
  win.on('unmaximize', () => win.webContents.send('win:maximized', false));

  // ── Dialogues natifs ─────────────────────────────────────────────────────
  ipcMain.handle('dialog:pickFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:pickFile', async (_, filters) => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || []
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('fs:homedir', () => require('os').homedir());

  // ── Chargement de l'app ──────────────────────────────────────────────────
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'client/dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  try { db.close(); } catch {}
});
