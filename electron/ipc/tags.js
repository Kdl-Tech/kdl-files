function registerTagsHandlers(ipcMain, db) {

  ipcMain.handle('tags:list', () =>
    db.getAll(`SELECT t.*, COUNT(ft.file_path) as usage_count
               FROM tags t LEFT JOIN file_tags ft ON ft.tag_id = t.id
               GROUP BY t.id ORDER BY t.name`)
  );

  ipcMain.handle('tags:create', (_, { name, color }) => {
    if (!name || name.length > 100) return { error: 'Nom invalide' };
    db.run(`INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)`,
      [name.trim(), color || '#6366f1']);
    return db.getOne(`SELECT * FROM tags WHERE name = ?`, [name.trim()]);
  });

  ipcMain.handle('tags:delete', (_, id) => {
    db.run(`DELETE FROM tags WHERE id = ?`, [id]);
    return { success: true };
  });

  ipcMain.handle('tags:getFile', (_, filePath) => {
    const tags = db.getAll(
      `SELECT t.* FROM tags t JOIN file_tags ft ON ft.tag_id = t.id WHERE ft.file_path = ?`,
      [filePath]
    );
    const meta = db.getOne(`SELECT * FROM file_meta WHERE file_path = ?`, [filePath]);
    return { tags, ...(meta || { stars: 0, color: null, note: '', pinned: 0 }) };
  });

  ipcMain.handle('tags:setTags', (_, { path: filePath, tagIds }) => {
    db.run(`DELETE FROM file_tags WHERE file_path = ?`, [filePath]);
    for (const tid of tagIds) {
      db.run(`INSERT OR IGNORE INTO file_tags (file_path, tag_id) VALUES (?, ?)`, [filePath, tid]);
    }
    return { success: true };
  });

  ipcMain.handle('tags:setMeta', (_, { path: filePath, meta }) => {
    const { stars = 0, color = null, note = '', pinned = 0 } = meta;
    db.run(`INSERT INTO file_meta (file_path, stars, color, note, pinned, updated_at)
            VALUES (?, ?, ?, ?, ?, unixepoch())
            ON CONFLICT(file_path) DO UPDATE SET
              stars=excluded.stars, color=excluded.color,
              note=excluded.note, pinned=excluded.pinned, updated_at=excluded.updated_at`,
      [filePath, Math.min(Math.max(Number(stars), 0), 5), color, note.slice(0, 2000), pinned ? 1 : 0]);
    return { success: true };
  });
}

module.exports = { registerTagsHandlers };
