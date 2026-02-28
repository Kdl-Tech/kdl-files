const fs   = require('fs');
const path = require('path');

function registerHistoryHandlers(ipcMain, db) {

  ipcMain.handle('history:list', (_, limit = 50) =>
    db.getAll(`SELECT * FROM history WHERE reversed = 0 ORDER BY created_at DESC LIMIT ?`,
      [Math.min(Number(limit), 200)])
  );

  ipcMain.handle('history:undo', async (_, id) => {
    const entry = db.getOne(`SELECT * FROM history WHERE id = ? AND reversed = 0`, [id]);
    if (!entry) return { error: 'Opération introuvable ou déjà annulée' };

    const payload = JSON.parse(entry.payload);
    try {
      switch (entry.op_type) {
        case 'move':
        case 'rename':
          if (fs.existsSync(payload.dest)) {
            fs.renameSync(payload.dest, payload.src);
          } else {
            return { error: 'Fichier destination introuvable' };
          }
          break;
        case 'copy':
          if (fs.existsSync(payload.dest)) {
            fs.rmSync(payload.dest, { recursive: true, force: true });
          }
          break;
        case 'delete':
          return { error: 'Annulation d\'une suppression non supportée (fichier dans la corbeille)' };
        default:
          return { error: `Type d'opération non annulable : ${entry.op_type}` };
      }
      db.run(`UPDATE history SET reversed = 1 WHERE id = ?`, [id]);
      return { success: true };
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('history:clear', () => {
    db.run(`DELETE FROM history`);
    return { success: true };
  });
}

module.exports = { registerHistoryHandlers };
