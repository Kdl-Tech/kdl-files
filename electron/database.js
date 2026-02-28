const { app } = require('electron');
const path    = require('path');
const fs      = require('fs');
const { Database } = require('node-sqlite3-wasm');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'kdl-files.db');

const db = new Database(DB_PATH);
db.path = DB_PATH;

// Performances SQLite
db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA synchronous  = NORMAL`);
db.exec(`PRAGMA cache_size   = -32000`);
db.exec(`PRAGMA temp_store   = MEMORY`);

// ── Schéma complet ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS files_index (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    path            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    ext             TEXT,
    type            TEXT,
    size            INTEGER DEFAULT 0,
    modified        INTEGER,
    created         INTEGER,
    hash_md5        TEXT,
    hash_sha        TEXT,
    is_dir          INTEGER DEFAULT 0,
    parent          TEXT,
    content_snippet TEXT,
    indexed_at      INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_files_name     ON files_index(name);
  CREATE INDEX IF NOT EXISTS idx_files_ext      ON files_index(ext);
  CREATE INDEX IF NOT EXISTS idx_files_type     ON files_index(type);
  CREATE INDEX IF NOT EXISTS idx_files_parent   ON files_index(parent);
  CREATE INDEX IF NOT EXISTS idx_files_size     ON files_index(size);
  CREATE INDEX IF NOT EXISTS idx_files_modified ON files_index(modified);
  CREATE INDEX IF NOT EXISTS idx_files_hash     ON files_index(hash_md5);

  CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS file_tags (
    file_path TEXT NOT NULL,
    tag_id    INTEGER NOT NULL,
    PRIMARY KEY (file_path, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_filetags_path ON file_tags(file_path);
  CREATE INDEX IF NOT EXISTS idx_filetags_tag  ON file_tags(tag_id);

  CREATE TABLE IF NOT EXISTS file_meta (
    file_path  TEXT PRIMARY KEY,
    stars      INTEGER DEFAULT 0,
    color      TEXT,
    note       TEXT,
    pinned     INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS organizer_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    watch_dir   TEXT,
    active      INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS organizer_rules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    order_idx  INTEGER DEFAULT 0,
    enabled    INTEGER DEFAULT 1,
    condition  TEXT NOT NULL,
    action     TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (profile_id) REFERENCES organizer_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    op_type    TEXT NOT NULL,
    payload    TEXT NOT NULL,
    reversed   INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS disk_snapshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    disk       TEXT NOT NULL,
    total      INTEGER,
    used       INTEGER,
    free       INTEGER,
    snapped_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS watched_folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    path       TEXT UNIQUE NOT NULL,
    profile_id INTEGER,
    active     INTEGER DEFAULT 1,
    added_at   INTEGER DEFAULT (unixepoch())
  );
`);

// Helpers
db.getAll  = (sql, params = []) => { const s = db.prepare(sql); const r = s.all(params); s.finalize(); return r; };
db.getOne  = (sql, params = []) => { const s = db.prepare(sql); const r = s.get(params); s.finalize(); return r; };
db.run     = (sql, params = []) => { const s = db.prepare(sql); s.run(params); s.finalize(); };

module.exports = db;
