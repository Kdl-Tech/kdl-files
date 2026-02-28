const chokidar = require('chokidar');

const watchers = new Map();

function registerWatcherHandlers(ipcMain, win, db) {

  ipcMain.handle('watch:add', async (_, { path: dirPath, profileId }) => {
    if (watchers.has(dirPath)) return { success: true, already: true };

    const watcher = chokidar.watch(dirPath, {
      persistent:    true,
      ignoreInitial: true,
      depth:         0,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    });

    watcher.on('add',    (p) => win.webContents.send('watch:event', { type: 'add',    path: p, watchDir: dirPath }));
    watcher.on('change', (p) => win.webContents.send('watch:event', { type: 'change', path: p, watchDir: dirPath }));
    watcher.on('unlink', (p) => win.webContents.send('watch:event', { type: 'unlink', path: p, watchDir: dirPath }));

    watchers.set(dirPath, watcher);
    db.run(`INSERT OR REPLACE INTO watched_folders (path, profile_id, active) VALUES (?, ?, 1)`,
      [dirPath, profileId || null]);

    return { success: true };
  });

  ipcMain.handle('watch:remove', async (_, dirPath) => {
    const w = watchers.get(dirPath);
    if (w) { await w.close(); watchers.delete(dirPath); }
    db.run(`DELETE FROM watched_folders WHERE path = ?`, [dirPath]);
    return { success: true };
  });

  ipcMain.handle('watch:list', () =>
    db.getAll(`SELECT wf.*, op.name as profile_name FROM watched_folders wf
               LEFT JOIN organizer_profiles op ON op.id = wf.profile_id
               WHERE wf.active = 1`)
  );

  // Restaurer les watchers actifs au démarrage
  const active = db.getAll(`SELECT * FROM watched_folders WHERE active = 1`);
  for (const f of active) {
    const watcher = chokidar.watch(f.path, {
      persistent: true, ignoreInitial: true, depth: 0,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    });
    watcher.on('add',    (p) => win?.webContents?.send('watch:event', { type: 'add',    path: p, watchDir: f.path }));
    watcher.on('change', (p) => win?.webContents?.send('watch:event', { type: 'change', path: p, watchDir: f.path }));
    watcher.on('unlink', (p) => win?.webContents?.send('watch:event', { type: 'unlink', path: p, watchDir: f.path }));
    watchers.set(f.path, watcher);
  }
}

module.exports = { registerWatcherHandlers };
