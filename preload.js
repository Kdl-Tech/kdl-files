const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kdlfiles', {

  // ── Fenêtre ───────────────────────────────────────────────────────────────
  window: {
    minimize:   () => ipcRenderer.send('win:minimize'),
    maximize:   () => ipcRenderer.send('win:maximize'),
    close:      () => ipcRenderer.send('win:close'),
    onMaximize: (cb) => {
      ipcRenderer.on('win:maximized', (_, v) => cb(v));
      return () => ipcRenderer.removeAllListeners('win:maximized');
    },
  },

  // ── Disques ───────────────────────────────────────────────────────────────
  disks: {
    list:     ()      => ipcRenderer.invoke('disks:list'),
    analyze:  (mount) => ipcRenderer.invoke('disks:analyze', mount),
    snapshot: (mount) => ipcRenderer.invoke('disks:snapshot', mount),
  },

  // ── Système de fichiers ───────────────────────────────────────────────────
  fs: {
    readDir:      (path)       => ipcRenderer.invoke('fs:readDir', path),
    stat:         (path)       => ipcRenderer.invoke('fs:stat', path),
    readText:     (path)       => ipcRenderer.invoke('fs:readText', path),
    thumbnail:    (path)       => ipcRenderer.invoke('fs:thumbnail', path),
    openExternal: (path)       => ipcRenderer.invoke('fs:openExternal', path),
    showInFolder: (path)       => ipcRenderer.invoke('fs:showInFolder', path),
    copy:         (src, dest)  => ipcRenderer.invoke('fs:copy', { src, dest }),
    move:         (src, dest)  => ipcRenderer.invoke('fs:move', { src, dest }),
    delete:       (paths)      => ipcRenderer.invoke('fs:delete', paths),
    rename:       (src, name)  => ipcRenderer.invoke('fs:rename', { src, name }),
    mkdir:        (path)       => ipcRenderer.invoke('fs:mkdir', path),
    batchRename:  (ops)        => ipcRenderer.invoke('fs:batchRename', ops),
    pickFolder:   ()           => ipcRenderer.invoke('dialog:pickFolder'),
    pickFile:     (filters)    => ipcRenderer.invoke('dialog:pickFile', filters),
    homedir:      ()           => ipcRenderer.invoke('fs:homedir'),
  },

  // ── Indexation ────────────────────────────────────────────────────────────
  index: {
    start:          (rootPaths) => ipcRenderer.invoke('index:start', rootPaths),
    stop:           ()          => ipcRenderer.send('index:stop'),
    status:         ()          => ipcRenderer.invoke('index:status'),
    onProgress:     (cb)        => {
      ipcRenderer.on('index:progress', (_, data) => cb(data));
      return () => ipcRenderer.removeAllListeners('index:progress');
    },
  },

  // ── Recherche ─────────────────────────────────────────────────────────────
  search: {
    query: (params) => ipcRenderer.invoke('search:query', params),
  },

  // ── Doublons ──────────────────────────────────────────────────────────────
  duplicates: {
    scan:       (rootPath) => ipcRenderer.invoke('duplicates:scan', rootPath),
    getGroups:  ()         => ipcRenderer.invoke('duplicates:getGroups'),
    deleteFiles:(paths)    => ipcRenderer.invoke('duplicates:delete', paths),
    onProgress: (cb)       => {
      ipcRenderer.on('duplicates:progress', (_, d) => cb(d));
      return () => ipcRenderer.removeAllListeners('duplicates:progress');
    },
  },

  // ── Organisateur ──────────────────────────────────────────────────────────
  organizer: {
    getProfiles:   ()               => ipcRenderer.invoke('org:getProfiles'),
    createProfile: (data)           => ipcRenderer.invoke('org:createProfile', data),
    updateProfile: (id, data)       => ipcRenderer.invoke('org:updateProfile', { id, data }),
    deleteProfile: (id)             => ipcRenderer.invoke('org:deleteProfile', id),
    getRules:      (profileId)      => ipcRenderer.invoke('org:getRules', profileId),
    saveRule:      (rule)           => ipcRenderer.invoke('org:saveRule', rule),
    deleteRule:    (id)             => ipcRenderer.invoke('org:deleteRule', id),
    preview:       (profileId, dir) => ipcRenderer.invoke('org:preview', { profileId, dir }),
    run:           (profileId, dir) => ipcRenderer.invoke('org:run', { profileId, dir }),
  },

  // ── Surveillance dossiers ─────────────────────────────────────────────────
  watcher: {
    add:     (path, profileId) => ipcRenderer.invoke('watch:add', { path, profileId }),
    remove:  (path)            => ipcRenderer.invoke('watch:remove', path),
    list:    ()                => ipcRenderer.invoke('watch:list'),
    onEvent: (cb)              => {
      ipcRenderer.on('watch:event', (_, e) => cb(e));
      return () => ipcRenderer.removeAllListeners('watch:event');
    },
  },

  // ── Tags & Métadonnées ────────────────────────────────────────────────────
  tags: {
    list:    ()              => ipcRenderer.invoke('tags:list'),
    create:  (name, color)   => ipcRenderer.invoke('tags:create', { name, color }),
    delete:  (id)            => ipcRenderer.invoke('tags:delete', id),
    getFile: (path)          => ipcRenderer.invoke('tags:getFile', path),
    setTags: (path, tagIds)  => ipcRenderer.invoke('tags:setTags', { path, tagIds }),
    setMeta: (path, meta)    => ipcRenderer.invoke('tags:setMeta', { path, meta }),
  },

  // ── Historique / Undo ─────────────────────────────────────────────────────
  history: {
    list:  (limit) => ipcRenderer.invoke('history:list', limit),
    undo:  (id)    => ipcRenderer.invoke('history:undo', id),
    clear: ()      => ipcRenderer.invoke('history:clear'),
  },
});
