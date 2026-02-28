const fs      = require('fs');
const path    = require('path');
const { shell, nativeImage } = require('electron');

const TYPE_MAP = {
  image:   ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff','avif','heic'],
  video:   ['mp4','avi','mkv','mov','webm','flv','wmv','m4v','3gp'],
  audio:   ['mp3','flac','wav','ogg','aac','m4a','opus','wma'],
  doc:     ['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','txt','rtf','md','csv','epub'],
  archive: ['zip','tar','gz','rar','7z','bz2','xz','tar.gz','tar.bz2'],
  code:    ['js','ts','jsx','tsx','py','java','c','cpp','cs','go','rs','php','html','css','scss','json','yaml','yml','sh','bat','xml','sql'],
};

function getType(ext) {
  for (const [type, exts] of Object.entries(TYPE_MAP)) {
    if (exts.includes(ext.toLowerCase())) return type;
  }
  return 'other';
}

function safeEntry(fullPath, entry) {
  try {
    const stat = fs.statSync(fullPath);
    const ext  = entry.isFile() ? path.extname(entry.name).slice(1).toLowerCase() : '';
    return {
      name:     entry.name,
      path:     fullPath,
      isDir:    entry.isDirectory(),
      size:     stat.size,
      modified: Math.floor(stat.mtimeMs / 1000),
      created:  Math.floor((stat.birthtimeMs || stat.mtimeMs) / 1000),
      ext,
      type: entry.isDirectory() ? 'folder' : getType(ext),
    };
  } catch { return null; }
}

// Normalise et valide un chemin (résout ../ sans restreindre la racine)
function norm(p) {
  if (typeof p !== 'string' || !p.trim()) throw new Error('Chemin invalide');
  return path.resolve(p);
}

function registerFilesHandlers(ipcMain, win, db) {

  // Lire un dossier
  ipcMain.handle('fs:readDir', async (_, dirPath) => {
    try {
      const safe = norm(dirPath);
      const entries = fs.readdirSync(safe, { withFileTypes: true });
      return entries
        .map(e => safeEntry(path.join(safe, e.name), e))
        .filter(Boolean);
    } catch (e) {
      return { error: e.message };
    }
  });

  // Stat d'un fichier
  ipcMain.handle('fs:stat', async (_, filePath) => {
    try {
      const safe = norm(filePath);
      const stat = fs.statSync(safe);
      const ext  = path.extname(safe).slice(1).toLowerCase();
      return {
        name:     path.basename(safe),
        path:     safe,
        isDir:    stat.isDirectory(),
        size:     stat.size,
        modified: Math.floor(stat.mtimeMs / 1000),
        created:  Math.floor((stat.birthtimeMs || stat.mtimeMs) / 1000),
        ext,
        type: stat.isDirectory() ? 'folder' : getType(ext),
      };
    } catch (e) { return { error: e.message }; }
  });

  // Lire le contenu texte (max 500 Ko)
  ipcMain.handle('fs:readText', async (_, filePath) => {
    try {
      const safe = norm(filePath);
      const stat = fs.statSync(safe);
      if (stat.size > 500 * 1024) return { error: 'Fichier trop grand pour l\'aperçu' };
      return { content: fs.readFileSync(safe, 'utf8') };
    } catch (e) { return { error: e.message }; }
  });

  // Miniature image via nativeImage
  ipcMain.handle('fs:thumbnail', async (_, filePath) => {
    try {
      const img = nativeImage.createFromPath(norm(filePath));
      if (img.isEmpty()) return null;
      const resized = img.resize({ width: 200, height: 200, quality: 'good' });
      return resized.toDataURL();
    } catch { return null; }
  });

  // Ouvrir avec l'app par défaut
  ipcMain.handle('fs:openExternal', async (_, filePath) => {
    await shell.openPath(norm(filePath));
  });

  // Révéler dans le gestionnaire de fichiers natif
  ipcMain.handle('fs:showInFolder', async (_, filePath) => {
    shell.showItemInFolder(norm(filePath));
  });

  // Copier
  ipcMain.handle('fs:copy', async (_, { src, dest }) => {
    try {
      const safeSrc  = norm(src);
      const safeDest = norm(dest);
      const target = fs.existsSync(safeDest) && fs.statSync(safeDest).isDirectory()
        ? path.join(safeDest, path.basename(safeSrc))
        : safeDest;
      fs.cpSync(safeSrc, target, { recursive: true });
      db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
        ['copy', JSON.stringify({ src, dest: target })]);
      return { success: true, dest: target };
    } catch (e) { return { error: e.message }; }
  });

  // Déplacer
  ipcMain.handle('fs:move', async (_, { src, dest }) => {
    try {
      const safeSrc  = norm(src);
      const safeDest = norm(dest);
      const target = fs.existsSync(safeDest) && fs.statSync(safeDest).isDirectory()
        ? path.join(safeDest, path.basename(safeSrc))
        : safeDest;
      fs.renameSync(safeSrc, target);
      db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
        ['move', JSON.stringify({ src: safeSrc, dest: target })]);
      return { success: true, dest: target };
    } catch (e) {
      // Cross-device : fallback copy + delete
      try {
        const safeSrc  = norm(src);
        const safeDest = norm(dest);
        const target = fs.existsSync(safeDest) && fs.statSync(safeDest).isDirectory()
          ? path.join(safeDest, path.basename(safeSrc))
          : safeDest;
        fs.cpSync(safeSrc, target, { recursive: true });
        fs.rmSync(safeSrc, { recursive: true, force: true });
        db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
          ['move', JSON.stringify({ src: safeSrc, dest: target })]);
        return { success: true, dest: target };
      } catch (e2) { return { error: e2.message }; }
    }
  });

  // Supprimer (vers corbeille ou hard delete)
  ipcMain.handle('fs:delete', async (_, paths) => {
    const list = Array.isArray(paths) ? paths : [paths];
    const errors = [];
    for (const raw of list) {
      try {
        const p = norm(raw);
        db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
          ['delete', JSON.stringify({ path: p })]);
        await shell.trashItem(p);
      } catch {
        try { fs.rmSync(norm(raw), { recursive: true, force: true }); }
        catch (e) { errors.push({ path: raw, error: e.message }); }
      }
    }
    return { success: errors.length === 0, errors };
  });

  // Renommer
  ipcMain.handle('fs:rename', async (_, { src, name }) => {
    try {
      const safeSrc = norm(src);
      // name est juste un nom de fichier (pas un chemin) — on strip les séparateurs
      const safeName = path.basename(name);
      if (!safeName) return { error: 'Nom invalide' };
      const dest = path.join(path.dirname(safeSrc), safeName);
      fs.renameSync(safeSrc, dest);
      db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
        ['rename', JSON.stringify({ src: safeSrc, dest })]);
      return { success: true, dest };
    } catch (e) { return { error: e.message }; }
  });

  // Créer un dossier
  ipcMain.handle('fs:mkdir', async (_, dirPath) => {
    try {
      fs.mkdirSync(norm(dirPath), { recursive: true });
      return { success: true };
    } catch (e) { return { error: e.message }; }
  });

  // Batch rename
  ipcMain.handle('fs:batchRename', async (_, ops) => {
    const errors = [];
    for (const { src, dest } of ops) {
      try {
        const safeSrc  = norm(src);
        const safeDest = norm(dest);
        fs.renameSync(safeSrc, safeDest);
        db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
          ['rename', JSON.stringify({ src: safeSrc, dest: safeDest })]);
      } catch (e) { errors.push({ src, error: e.message }); }
    }
    return { success: errors.length === 0, errors };
  });
}

module.exports = { registerFilesHandlers, getType, TYPE_MAP };
