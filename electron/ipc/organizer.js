const fs   = require('fs');
const path = require('path');

function evaluateCondition(file, condition) {
  const { field, operator, value } = condition;
  let fileVal;
  switch (field) {
    case 'ext':      fileVal = file.ext      || ''; break;
    case 'type':     fileVal = file.type     || ''; break;
    case 'name':     fileVal = file.name     || ''; break;
    case 'size':     fileVal = file.size     || 0;  break;
    case 'modified': fileVal = file.modified || 0;  break;
    default: return false;
  }
  switch (operator) {
    case 'eq':       return String(fileVal).toLowerCase() === String(value).toLowerCase();
    case 'neq':      return String(fileVal).toLowerCase() !== String(value).toLowerCase();
    case 'in':       return (Array.isArray(value) ? value : [value]).map(v => v.toLowerCase()).includes(String(fileVal).toLowerCase());
    case 'gt':       return Number(fileVal) > Number(value);
    case 'lt':       return Number(fileVal) < Number(value);
    case 'contains': return String(fileVal).toLowerCase().includes(String(value).toLowerCase());
    case 'regex':    try { return new RegExp(value, 'i').test(String(fileVal)); } catch { return false; }
    default: return false;
  }
}

function safeDestPath(dest) {
  if (typeof dest !== 'string' || !dest.trim()) return null;
  const resolved = path.resolve(dest);
  // Doit être un chemin absolu (path.resolve garantit toujours un absolu)
  return resolved;
}

function applyRules(files, rules) {
  const ops = [];
  for (const file of files) {
    for (const rule of rules) {
      if (!rule.enabled) continue;
      const condition = typeof rule.condition === 'string' ? JSON.parse(rule.condition) : rule.condition;
      const action    = typeof rule.action    === 'string' ? JSON.parse(rule.action)    : rule.action;
      if (evaluateCondition(file, condition)) {
        if ((action.type === 'move' || action.type === 'copy') && action.dest) {
          const safeDest = safeDestPath(action.dest);
          if (!safeDest) break;
          const dest = path.join(safeDest, path.basename(file.name));
          ops.push({ src: file.path, dest, action: action.type, rule: rule.id });
        }
        break; // Première règle qui match
      }
    }
  }
  return ops;
}

function registerOrganizerHandlers(ipcMain, win, db) {

  ipcMain.handle('org:getProfiles', () => db.getAll(`SELECT * FROM organizer_profiles ORDER BY created_at DESC`));

  ipcMain.handle('org:createProfile', (_, data) => {
    const { name, description = '', watch_dir = null } = data;
    db.run(`INSERT INTO organizer_profiles (name, description, watch_dir) VALUES (?, ?, ?)`,
      [name.slice(0, 200), description.slice(0, 500), watch_dir]);
    return db.getOne(`SELECT * FROM organizer_profiles ORDER BY id DESC LIMIT 1`);
  });

  ipcMain.handle('org:updateProfile', (_, { id, data }) => {
    const { name, description, watch_dir, active } = data;
    db.run(`UPDATE organizer_profiles SET name=?, description=?, watch_dir=?, active=? WHERE id=?`,
      [name, description, watch_dir, active ? 1 : 0, id]);
    return db.getOne(`SELECT * FROM organizer_profiles WHERE id = ?`, [id]);
  });

  ipcMain.handle('org:deleteProfile', (_, id) => {
    db.run(`DELETE FROM organizer_profiles WHERE id = ?`, [id]);
    return { success: true };
  });

  ipcMain.handle('org:getRules', (_, profileId) =>
    db.getAll(`SELECT * FROM organizer_rules WHERE profile_id = ? ORDER BY order_idx`, [profileId])
  );

  ipcMain.handle('org:saveRule', (_, rule) => {
    const { id, profile_id, order_idx = 0, enabled = 1, condition, action } = rule;
    const cond = JSON.stringify(typeof condition === 'string' ? JSON.parse(condition) : condition);
    const act  = JSON.stringify(typeof action    === 'string' ? JSON.parse(action)    : action);
    if (id) {
      db.run(`UPDATE organizer_rules SET enabled=?, condition=?, action=?, order_idx=? WHERE id=?`,
        [enabled ? 1 : 0, cond, act, order_idx, id]);
      return db.getOne(`SELECT * FROM organizer_rules WHERE id = ?`, [id]);
    } else {
      db.run(`INSERT INTO organizer_rules (profile_id, order_idx, enabled, condition, action) VALUES (?, ?, ?, ?, ?)`,
        [profile_id, order_idx, enabled ? 1 : 0, cond, act]);
      return db.getOne(`SELECT * FROM organizer_rules ORDER BY id DESC LIMIT 1`);
    }
  });

  ipcMain.handle('org:deleteRule', (_, id) => {
    db.run(`DELETE FROM organizer_rules WHERE id = ?`, [id]);
    return { success: true };
  });

  // Dry-run : retourne les opérations sans les effectuer
  ipcMain.handle('org:preview', async (_, { profileId, dir }) => {
    const rules = db.getAll(`SELECT * FROM organizer_rules WHERE profile_id = ? AND enabled = 1 ORDER BY order_idx`, [profileId]);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files = entries.filter(e => e.isFile()).map(e => {
        const fullPath = path.join(dir, e.name);
        try {
          const stat = fs.statSync(fullPath);
          const ext  = path.extname(e.name).slice(1).toLowerCase();
          return { name: e.name, path: fullPath, ext, size: stat.size, modified: Math.floor(stat.mtimeMs / 1000) };
        } catch { return null; }
      }).filter(Boolean);
      return applyRules(files, rules);
    } catch (e) { return { error: e.message }; }
  });

  // Exécution réelle
  ipcMain.handle('org:run', async (_, { profileId, dir }) => {
    const rules = db.getAll(`SELECT * FROM organizer_rules WHERE profile_id = ? AND enabled = 1 ORDER BY order_idx`, [profileId]);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files = entries.filter(e => e.isFile()).map(e => {
        const fullPath = path.join(dir, e.name);
        try {
          const stat = fs.statSync(fullPath);
          const ext  = path.extname(e.name).slice(1).toLowerCase();
          return { name: e.name, path: fullPath, ext, size: stat.size, modified: Math.floor(stat.mtimeMs / 1000) };
        } catch { return null; }
      }).filter(Boolean);

      const ops    = applyRules(files, rules);
      const moved  = [];
      const errors = [];

      for (const op of ops) {
        try {
          fs.mkdirSync(path.dirname(op.dest), { recursive: true });
          if (op.action === 'move') {
            fs.renameSync(op.src, op.dest);
          } else {
            fs.cpSync(op.src, op.dest);
          }
          db.run(`INSERT INTO history (op_type, payload) VALUES (?, ?)`,
            [op.action, JSON.stringify({ src: op.src, dest: op.dest, rule: op.rule })]);
          moved.push(op);
        } catch (e) { errors.push({ ...op, error: e.message }); }
      }

      return { success: true, moved: moved.length, errors };
    } catch (e) { return { error: e.message }; }
  });
}

module.exports = { registerOrganizerHandlers };
