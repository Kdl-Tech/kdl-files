const { Worker } = require('worker_threads');
const path = require('path');
const fs   = require('fs');

function registerDuplicatesHandlers(ipcMain, win, db) {
  let dupWorker = null;

  ipcMain.handle('duplicates:scan', async (_, rootPath) => {
    if (dupWorker) { try { dupWorker.terminate(); } catch {} }

    dupWorker = new Worker(
      path.join(__dirname, '../workers/hashWorker.js'),
      { workerData: { rootPath, dbPath: db.path } }
    );

    dupWorker.on('message', (msg) => {
      win.webContents.send('duplicates:progress', msg);
      if (msg.type === 'done') dupWorker = null;
    });

    dupWorker.on('error', (err) => {
      console.error('[DUPLICATES] Worker error:', err.message);
      dupWorker = null;
    });

    return { started: true };
  });

  ipcMain.handle('duplicates:getGroups', () => {
    try {
      const rows = db.getAll(`
        SELECT hash_md5, size, COUNT(*) as cnt,
               GROUP_CONCAT(path, '|||') as paths,
               GROUP_CONCAT(modified, '|||') as dates
        FROM files_index
        WHERE hash_md5 IS NOT NULL AND is_dir = 0 AND size > 0
        GROUP BY hash_md5, size
        HAVING cnt > 1
        ORDER BY size DESC, cnt DESC
        LIMIT 500
      `);

      return rows.map(row => ({
        hash:  row.hash_md5,
        size:  row.size,
        count: row.cnt,
        files: row.paths.split('|||').map((p, i) => ({
          path:     p,
          modified: Number(row.dates.split('|||')[i] || 0),
          name:     path.basename(p),
        }))
      }));
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('duplicates:delete', async (_, paths) => {
    const { shell } = require('electron');
    const errors = [];
    for (const p of paths) {
      try {
        db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
          ['delete', JSON.stringify({ path: p, reason: 'duplicate' })]);
        await shell.trashItem(p);
      } catch {
        try { fs.rmSync(p, { force: true }); }
        catch (e) { errors.push({ path: p, error: e.message }); }
      }
    }
    // Nettoyer l'index
    for (const p of paths) {
      try { db.run(`DELETE FROM files_index WHERE path = ?`, [p]); } catch {}
    }
    return { success: errors.length === 0, errors };
  });
}

module.exports = { registerDuplicatesHandlers };
