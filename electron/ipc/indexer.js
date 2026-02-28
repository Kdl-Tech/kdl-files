const { Worker } = require('worker_threads');
const path = require('path');

function registerIndexHandlers(ipcMain, win, db) {
  let indexWorker = null;
  let indexStats = { total: 0, indexed: 0, running: false, lastRun: null };

  ipcMain.handle('index:start', async (_, rootPaths) => {
    if (indexWorker) { try { indexWorker.terminate(); } catch {} }
    indexStats = { ...indexStats, running: true, indexed: 0, total: 0 };

    indexWorker = new Worker(
      path.join(__dirname, '../workers/indexWorker.js'),
      { workerData: { rootPaths, dbPath: db.path } }
    );

    indexWorker.on('message', (msg) => {
      if (msg.type === 'progress') {
        indexStats.indexed = msg.indexed;
        indexStats.total   = msg.total || indexStats.total;
        win.webContents.send('index:progress', {
          indexed:     msg.indexed,
          total:       msg.total,
          currentPath: msg.path,
          percent:     msg.total ? Math.round((msg.indexed / msg.total) * 100) : 0
        });
      }
      if (msg.type === 'done') {
        indexStats = { running: false, lastRun: Date.now(), indexed: msg.total, total: msg.total };
        win.webContents.send('index:progress', { done: true, total: msg.total });
        indexWorker = null;
      }
    });

    indexWorker.on('error', (err) => {
      console.error('[INDEX] Worker error:', err.message);
      indexStats.running = false;
      indexWorker = null;
    });

    return { started: true };
  });

  ipcMain.handle('index:status', () => indexStats);
  ipcMain.on('index:stop', () => {
    if (indexWorker) { try { indexWorker.terminate(); } catch {} indexWorker = null; }
    indexStats.running = false;
  });
}

module.exports = { registerIndexHandlers };
