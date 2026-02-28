function registerSearchHandlers(ipcMain, db) {
  ipcMain.handle('search:query', async (_, params = {}) => {
    const { q = '', ext, type, sizeMin, sizeMax, dateFrom, dateTo, hasTag, limit = 200 } = params;

    let sql = `
      SELECT f.path, f.name, f.ext, f.type, f.size, f.modified, f.is_dir,
             f.content_snippet,
             GROUP_CONCAT(t.name, ',') as tags
      FROM files_index f
      LEFT JOIN file_tags ft ON ft.file_path = f.path
      LEFT JOIN tags t ON t.id = ft.tag_id
      WHERE 1=1
    `;
    const args = [];

    if (q) {
      sql += ` AND (f.name LIKE ? OR f.content_snippet LIKE ?)`;
      args.push(`%${q}%`, `%${q}%`);
    }
    if (ext)     { sql += ` AND f.ext = ?`;        args.push(ext.toLowerCase()); }
    if (type)    { sql += ` AND f.type = ?`;       args.push(type); }
    if (sizeMin) { sql += ` AND f.size >= ?`;      args.push(Number(sizeMin)); }
    if (sizeMax) { sql += ` AND f.size <= ?`;      args.push(Number(sizeMax)); }
    if (dateFrom){ sql += ` AND f.modified >= ?`;  args.push(Math.floor(new Date(dateFrom).getTime() / 1000)); }
    if (dateTo)  { sql += ` AND f.modified <= ?`;  args.push(Math.floor(new Date(dateTo).getTime()   / 1000)); }
    if (hasTag)  { sql += ` AND ft.tag_id = ?`;     args.push(Number(hasTag)); }

    sql += ` GROUP BY f.path ORDER BY f.modified DESC LIMIT ?`;
    args.push(Math.min(Number(limit) || 200, 500));

    try {
      return db.getAll(sql, args);
    } catch (e) { return { error: e.message }; }
  });
}

module.exports = { registerSearchHandlers };
