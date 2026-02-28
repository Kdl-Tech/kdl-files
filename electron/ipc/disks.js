const { execSync } = require('child_process');
const os   = require('os');
const path = require('path');
const fs   = require('fs');

function getDisks() {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const raw = execSync(
        'powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free | ConvertTo-Json"',
        { encoding: 'utf8', timeout: 5000 }
      );
      const drives = JSON.parse(raw);
      return (Array.isArray(drives) ? drives : [drives]).map(d => ({
        mount: `${d.Name}:\\`,
        name:  `Disque ${d.Name}`,
        total: (d.Used || 0) + (d.Free || 0),
        used:  d.Used  || 0,
        free:  d.Free  || 0,
        type:  'local',
      })).filter(d => d.total > 0);
    }

    // Linux / macOS
    const raw = execSync('df -k', { encoding: 'utf8', timeout: 5000 });
    const lines = raw.trim().split('\n').slice(1);
    const SKIP = ['tmpfs','devtmpfs','udev','none','overlay','squashfs','efivarfs'];

    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) return null;
      const [source, blocks, used, avail, , mount] = parts;
      if (SKIP.some(s => source.startsWith(s))) return null;
      if (!mount) return null;

      const total = Number(blocks) * 1024;
      const usedB = Number(used) * 1024;
      const freeB = Number(avail) * 1024;
      if (total === 0) return null;

      const label = mount === '/'
        ? 'Disque principal'
        : path.basename(mount) || mount;

      return { mount, name: label, total, used: usedB, free: freeB, type: 'local', source };
    }).filter(Boolean);

  } catch (e) {
    console.error('[DISKS]', e.message);
    return [];
  }
}

function analyzeDirSize(dirPath, maxDepth = 3, depth = 0) {
  let size = 0;
  const children = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory() && depth < maxDepth) {
          const child = analyzeDirSize(fullPath, maxDepth, depth + 1);
          size += child.size;
          children.push({ name: entry.name, path: fullPath, ...child });
        } else if (entry.isFile()) {
          const s = fs.statSync(fullPath).size;
          size += s;
          if (depth === maxDepth) {
            children.push({ name: entry.name, path: fullPath, size: s, children: [] });
          }
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip */ }
  return { size, children: children.sort((a, b) => b.size - a.size).slice(0, 20) };
}

function registerDisksHandlers(ipcMain, win, db) {

  ipcMain.handle('disks:list', () => {
    const disks = getDisks();
    // Snapshot en BDD pour l'historique
    for (const d of disks) {
      try {
        db.run(
          `INSERT INTO disk_snapshots (disk, total, used, free) VALUES (?, ?, ?, ?)`,
          [d.mount, d.total, d.used, d.free]
        );
      } catch {}
    }
    return disks;
  });

  ipcMain.handle('disks:analyze', async (_, mount) => {
    // Arbre récursif des tailles
    const rawTree = analyzeDirSize(mount, 3);
    const tree    = { name: path.basename(mount) || mount, path: mount, ...rawTree };

    // Info disque courante
    const allDisks = getDisks();
    const diskInfo = allDisks.find(d => d.mount === mount) || {};

    // Top 20 fichiers les plus lourds (depuis l'index si disponible)
    let top20 = [];
    try {
      top20 = db.getAll(`
        SELECT path, name, size, type FROM files_index
        WHERE path LIKE ? AND is_dir = 0
        ORDER BY size DESC LIMIT 20
      `, [mount + '%']);
    } catch {}

    // Répartition par type
    let byType = [];
    try {
      byType = db.getAll(`
        SELECT type, COUNT(*) as count, SUM(size) as total_size
        FROM files_index
        WHERE path LIKE ? AND is_dir = 0
        GROUP BY type ORDER BY total_size DESC
      `, [mount + '%']);
    } catch {}

    // Nombre de fichiers scannés
    let fileCount = 0;
    try {
      const row = db.getOne(`SELECT COUNT(*) as c FROM files_index WHERE path LIKE ? AND is_dir = 0`, [mount + '%']);
      fileCount = row?.c || 0;
    } catch {}

    return {
      tree,
      top20,
      byType,
      fileCount,
      total: diskInfo.total || 0,
      used:  diskInfo.used  || rawTree.size,
      free:  diskInfo.free  || 0,
    };
  });

  ipcMain.handle('disks:snapshot', async (_, mount) => {
    return db.getAll(
      `SELECT used, free, total, snapped_at FROM disk_snapshots
       WHERE disk = ? ORDER BY snapped_at DESC LIMIT 30`,
      [mount]
    );
  });
}

module.exports = { registerDisksHandlers };
