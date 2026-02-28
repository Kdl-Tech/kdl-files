const { workerData, parentPort } = require('worker_threads');
const { Database } = require('node-sqlite3-wasm');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const { rootPath, dbPath } = workerData;
const db = new Database(dbPath);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`);

// Lire les premiers 1 Mo pour le hash partiel
function hashPartial(filePath) {
  const CHUNK = 1024 * 1024;
  const buf   = Buffer.alloc(CHUNK);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const read = fs.readSync(fd, buf, 0, CHUNK, 0);
    return crypto.createHash('md5').update(buf.slice(0, read)).digest('hex');
  } catch { return null; }
  finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
}

// Hash SHA256 complet
function hashFull(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch { return null; }
}

try {
  // Étape 1 : grouper par taille (depuis l'index existant)
  const stmtSize = db.prepare(`
    SELECT path, size FROM files_index
    WHERE parent LIKE ? AND is_dir = 0 AND size > 0
    ORDER BY size
  `);
  const bySize = stmtSize.all([rootPath + '%']);
  stmtSize.finalize();

  // Trouver les tailles avec doublons potentiels
  const sizeMap = new Map();
  for (const row of bySize) {
    const key = row.size;
    if (!sizeMap.has(key)) sizeMap.set(key, []);
    sizeMap.get(key).push(row.path);
  }

  const candidates = [];
  for (const [, paths] of sizeMap) {
    if (paths.length > 1) candidates.push(...paths);
  }

  parentPort.postMessage({ type: 'progress', step: 'hashing', total: candidates.length, done: 0 });

  const updateMd5 = db.prepare(`UPDATE files_index SET hash_md5 = ? WHERE path = ?`);
  const updateSha = db.prepare(`UPDATE files_index SET hash_sha = ? WHERE path = ?`);

  // Étape 2 : hash partiel sur les candidats
  const md5Groups = new Map();
  for (let i = 0; i < candidates.length; i++) {
    const p    = candidates[i];
    const hash = hashPartial(p);
    if (hash) {
      updateMd5.run([hash, p]);
      if (!md5Groups.has(hash)) md5Groups.set(hash, []);
      md5Groups.get(hash).push(p);
    }
    if (i % 50 === 0) {
      parentPort.postMessage({ type: 'progress', step: 'hashing', total: candidates.length, done: i });
    }
  }

  // Étape 3 : hash complet sur les vrais doublons MD5
  for (const [, paths] of md5Groups) {
    if (paths.length > 1) {
      for (const p of paths) {
        const sha = hashFull(p);
        if (sha) updateSha.run([sha, p]);
      }
    }
  }

  try { updateMd5.finalize(); updateSha.finalize(); } catch {}
  parentPort.postMessage({ type: 'done', candidates: candidates.length });
} catch (e) {
  parentPort.postMessage({ type: 'error', message: e.message });
} finally {
  try { db.close(); } catch {}
}
