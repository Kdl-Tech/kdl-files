const { workerData, parentPort } = require('worker_threads');
const { Database } = require('node-sqlite3-wasm');
const fs   = require('fs');
const path = require('path');

const { rootPaths, dbPath } = workerData;
const db = new Database(dbPath);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`);

const TYPE_MAP = {
  image:   ['jpg','jpeg','png','gif','webp','svg','bmp','ico','tiff','avif'],
  video:   ['mp4','avi','mkv','mov','webm','flv','wmv','m4v'],
  audio:   ['mp3','flac','wav','ogg','aac','m4a','opus'],
  doc:     ['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','txt','rtf','md','csv','epub'],
  archive: ['zip','tar','gz','rar','7z','bz2','xz'],
  code:    ['js','ts','jsx','tsx','py','java','c','cpp','cs','go','rs','php','html','css','json','yaml','sh','sql'],
};
function getType(ext) {
  for (const [t, exts] of Object.entries(TYPE_MAP)) if (exts.includes(ext)) return t;
  return 'other';
}

const upsert = db.prepare(`
  INSERT OR REPLACE INTO files_index
    (path, name, ext, type, size, modified, created, is_dir, parent, indexed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
`);

const TEXT_EXTS = new Set(['txt','md','json','yaml','yml','csv','log','sh','ini','conf']);
const MAX_SNIPPET = 300;

const counter = { indexed: 0 };

function scanDir(dirPath) {
  let entries;
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      const isDir = entry.isDirectory();
      const ext   = isDir ? '' : path.extname(entry.name).slice(1).toLowerCase();
      const type  = isDir ? 'folder' : getType(ext);

      let snippet = null;
      if (!isDir && TEXT_EXTS.has(ext) && stat.size < 50 * 1024) {
        try { snippet = fs.readFileSync(fullPath, 'utf8').slice(0, MAX_SNIPPET); } catch {}
      }

      upsert.run([
        fullPath, entry.name, ext, type,
        stat.size,
        Math.floor(stat.mtimeMs / 1000),
        Math.floor((stat.birthtimeMs || stat.mtimeMs) / 1000),
        isDir ? 1 : 0,
        dirPath,
      ]);

      counter.indexed++;
      if (counter.indexed % 200 === 0) {
        parentPort.postMessage({ type: 'progress', indexed: counter.indexed, path: fullPath });
      }

      if (isDir) scanDir(fullPath);
    } catch { /* skip inaccessible */ }
  }
}

try {
  for (const root of rootPaths) scanDir(root);
  parentPort.postMessage({ type: 'done', total: counter.indexed });
} catch (e) {
  parentPort.postMessage({ type: 'error', message: e.message });
} finally {
  try { upsert.finalize(); db.close(); } catch {}
}
