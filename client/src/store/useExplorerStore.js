import { create } from 'zustand';
import { fs } from '../api/ipc';

// Tri des entrées
function sortEntries(entries, by, dir) {
  return [...entries].sort((a, b) => {
    // Dossiers toujours en premier
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    let va, vb;
    switch (by) {
      case 'size':     va = a.size;     vb = b.size;     break;
      case 'modified': va = a.modified; vb = b.modified; break;
      case 'type':     va = a.type;     vb = b.type;     break;
      default:         va = a.name.toLowerCase(); vb = b.name.toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

const useExplorerStore = create((set, get) => ({
  // ── État navigation ──────────────────────────────────────────────────────
  currentPath:  null,
  navHistory:   [],
  navIndex:     -1,
  entries:      [],
  loading:      false,
  error:        null,

  // ── Sélection ────────────────────────────────────────────────────────────
  selected:     [],       // tableau de paths sélectionnés
  lastSelected: null,     // pour range-select (Shift+click)

  // ── Presse-papier ────────────────────────────────────────────────────────
  clipboard:    null,     // { mode: 'copy'|'cut', paths: [] }

  // ── Affichage ────────────────────────────────────────────────────────────
  viewMode:     'list',   // 'list' | 'grid'
  sortBy:       'name',
  sortDir:      'asc',
  showPreview:  true,
  previewFile:  null,

  // ── Navigation ───────────────────────────────────────────────────────────
  navigate: async (newPath) => {
    const { navHistory, navIndex, sortBy, sortDir } = get();

    // Tronque l'historique avant d'ajouter le nouveau chemin
    const newHistory = navHistory.slice(0, navIndex + 1);
    newHistory.push(newPath);

    set({
      currentPath:  newPath,
      navHistory:   newHistory,
      navIndex:     newHistory.length - 1,
      loading:      true,
      error:        null,
      selected:     [],
      lastSelected: null,
      previewFile:  null,
    });

    const result = await fs.readDir(newPath);
    if (!result || result.error) {
      set({ loading: false, error: result?.error || 'Erreur de lecture' });
    } else {
      set({ entries: sortEntries(result, sortBy, sortDir), loading: false });
    }
  },

  refresh: async () => {
    const { currentPath, sortBy, sortDir } = get();
    if (!currentPath) return;
    set({ loading: true, error: null });
    const result = await fs.readDir(currentPath);
    if (!result || result.error) {
      set({ loading: false, error: result?.error || 'Erreur de lecture' });
    } else {
      set({ entries: sortEntries(result, sortBy, sortDir), loading: false });
    }
  },

  goBack: () => {
    const { navHistory, navIndex } = get();
    if (navIndex <= 0) return;
    const newIndex = navIndex - 1;
    const path     = navHistory[newIndex];
    set({ navIndex: newIndex, currentPath: path, loading: true, selected: [], previewFile: null });
    fs.readDir(path).then(result => {
      const { sortBy, sortDir } = get();
      if (!result || result.error) set({ loading: false, error: result?.error });
      else set({ entries: sortEntries(result, sortBy, sortDir), loading: false });
    });
  },

  goForward: () => {
    const { navHistory, navIndex } = get();
    if (navIndex >= navHistory.length - 1) return;
    const newIndex = navIndex + 1;
    const path     = navHistory[newIndex];
    set({ navIndex: newIndex, currentPath: path, loading: true, selected: [], previewFile: null });
    fs.readDir(path).then(result => {
      const { sortBy, sortDir } = get();
      if (!result || result.error) set({ loading: false, error: result?.error });
      else set({ entries: sortEntries(result, sortBy, sortDir), loading: false });
    });
  },

  goUp: () => {
    const { currentPath, navigate } = get();
    if (!currentPath) return;
    // Remonte d'un niveau (compatible Linux/Windows/macOS)
    const sep   = currentPath.includes('/') ? '/' : '\\';
    const parts = currentPath.split(sep).filter(Boolean);
    if (parts.length === 0) return;
    parts.pop();
    const parent = parts.length === 0
      ? (currentPath.startsWith('/') ? '/' : currentPath.slice(0, 3))
      : (currentPath.startsWith('/') ? '/' + parts.join('/') : parts.join(sep));
    navigate(parent);
  },

  // ── Sélection ────────────────────────────────────────────────────────────
  setSelected: (paths) => set({ selected: paths }),

  toggleSelected: (path) => {
    const { selected } = get();
    if (selected.includes(path)) {
      set({ selected: selected.filter(p => p !== path), lastSelected: path });
    } else {
      set({ selected: [...selected, path], lastSelected: path });
    }
  },

  rangeSelect: (path) => {
    const { entries, lastSelected, selected } = get();
    if (!lastSelected) {
      set({ selected: [path], lastSelected: path });
      return;
    }
    const paths = entries.map(e => e.path);
    const a = paths.indexOf(lastSelected);
    const b = paths.indexOf(path);
    if (a === -1 || b === -1) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const range = paths.slice(lo, hi + 1);
    set({ selected: [...new Set([...selected, ...range])] });
  },

  clearSelected: () => set({ selected: [], lastSelected: null }),

  selectAll: () => {
    const { entries } = get();
    set({ selected: entries.map(e => e.path) });
  },

  setPreviewFile: (file) => set({ previewFile: file }),

  // ── Presse-papier ────────────────────────────────────────────────────────
  setClipboard: (mode, paths) => set({ clipboard: { mode, paths } }),
  clearClipboard: () => set({ clipboard: null }),

  // ── Affichage ────────────────────────────────────────────────────────────
  setViewMode: (mode) => set({ viewMode: mode }),
  togglePreview: () => set(s => ({ showPreview: !s.showPreview })),

  setSort: (by, dir) => {
    const { entries, sortBy, sortDir } = get();
    const newDir = by === sortBy && !dir ? (sortDir === 'asc' ? 'desc' : 'asc') : (dir || 'asc');
    set({ sortBy: by, sortDir: newDir, entries: sortEntries(entries, by, newDir) });
  },
}));

export default useExplorerStore;
