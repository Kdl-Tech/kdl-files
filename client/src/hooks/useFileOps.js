import { useCallback } from 'react';
import { fs, history } from '../api/ipc';
import useExplorerStore from '../store/useExplorerStore';

export function useFileOps() {
  const { selected, clipboard, currentPath, refresh, setClipboard, clearClipboard, clearSelected } = useExplorerStore();

  const copy = useCallback(() => {
    if (selected.length === 0) return;
    setClipboard('copy', [...selected]);
  }, [selected, setClipboard]);

  const cut = useCallback(() => {
    if (selected.length === 0) return;
    setClipboard('cut', [...selected]);
  }, [selected, setClipboard]);

  const paste = useCallback(async () => {
    if (!clipboard || !currentPath) return;
    const { mode, paths } = clipboard;
    for (const src of paths) {
      if (mode === 'copy') {
        await fs.copy(src, currentPath);
      } else {
        await fs.move(src, currentPath);
      }
    }
    if (mode === 'cut') clearClipboard();
    refresh();
  }, [clipboard, currentPath, refresh, clearClipboard]);

  const deleteSelected = useCallback(async () => {
    if (selected.length === 0) return;
    const result = await fs.delete([...selected]);
    clearSelected();
    refresh();
    return result;
  }, [selected, clearSelected, refresh]);

  const rename = useCallback(async (filePath, newName) => {
    const result = await fs.rename(filePath, newName);
    refresh();
    return result;
  }, [refresh]);

  const mkdir = useCallback(async (name) => {
    if (!currentPath || !name?.trim()) return;
    const sep  = currentPath.includes('/') ? '/' : '\\';
    const dest = currentPath.endsWith(sep)
      ? `${currentPath}${name.trim()}`
      : `${currentPath}${sep}${name.trim()}`;
    const result = await fs.mkdir(dest);
    refresh();
    return result;
  }, [currentPath, refresh]);

  const undo = useCallback(async () => {
    const entries = await history.list(1);
    if (!entries?.length) return;
    await history.undo(entries[0].id);
    refresh();
  }, [refresh]);

  const open = useCallback(async (file) => {
    if (file.isDir) {
      useExplorerStore.getState().navigate(file.path);
    } else {
      await fs.openExternal(file.path);
    }
  }, []);

  return { copy, cut, paste, deleteSelected, rename, mkdir, undo, open };
}
