import { useEffect } from 'react';
import useExplorerStore from '../store/useExplorerStore';
import { useFileOps }   from './useFileOps';

export function useExplorerKeyboard(renameCb) {
  const { selected, goBack, goForward, goUp, selectAll, clearSelected, refresh } = useExplorerStore();
  const { copy, cut, paste, deleteSelected, undo } = useFileOps();

  useEffect(() => {
    const handler = async (e) => {
      const tag = document.activeElement?.tagName;
      // Ne pas interférer si un input/textarea est actif
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') { e.preventDefault(); copy(); }
      else if (ctrl && e.key === 'x') { e.preventDefault(); cut(); }
      else if (ctrl && e.key === 'v') { e.preventDefault(); paste(); }
      else if (ctrl && e.key === 'a') { e.preventDefault(); selectAll(); }
      else if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      else if (e.key === 'F5')        { e.preventDefault(); refresh(); }
      else if (e.key === 'Escape')    { e.preventDefault(); clearSelected(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && selected.length === 0) {
          goUp();
        } else if (e.key === 'Delete' && selected.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }
      else if (e.key === 'F2' && selected.length === 1) {
        e.preventDefault();
        renameCb?.(selected[0]);
      }
      else if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [copy, cut, paste, deleteSelected, undo, selectAll, clearSelected, refresh, goBack, goForward, goUp, selected, renameCb]);
}
