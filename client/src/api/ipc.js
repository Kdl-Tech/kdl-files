// Wrapper typé autour de window.kdlfiles (contextBridge)
// Utilisé partout dans le client React pour éviter d'accéder directement à window.kdlfiles

const api = window.kdlfiles;

export const fs       = api.fs;
export const disks    = api.disks;
export const index    = api.index;
export const search   = api.search;
export const dups     = api.duplicates;
export const org      = api.organizer;
export const watcher  = api.watcher;
export const tags     = api.tags;
export const history  = api.history;
export const win      = api.window;

export default api;
