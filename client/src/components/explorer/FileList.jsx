import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import FileItem from './FileItem';
import useExplorerStore from '../../store/useExplorerStore';

const ROW_HEIGHT = 40;

// En-têtes de colonne
function ListHeader() {
  const { sortBy, sortDir, setSort } = useExplorerStore();
  const col = (label, by, cls = '') => (
    <button
      onClick={() => setSort(by)}
      className={`flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wide ${cls}`}
    >
      {label}
      {sortBy === by && <span className="text-brand-light">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 shrink-0 text-xs bg-dark-900/30">
      <div className="w-5 shrink-0" />
      <div className="flex-1">{col('Nom', 'name')}</div>
      <div className="w-20 text-right hidden sm:block">{col('Type', 'type', 'justify-end')}</div>
      <div className="w-20 text-right hidden md:block">{col('Taille', 'size', 'justify-end')}</div>
      <div className="w-28 text-right hidden lg:block">{col('Modifié', 'modified', 'justify-end')}</div>
    </div>
  );
}

export default function FileList({ onContextMenu }) {
  const { entries, loading, error } = useExplorerStore();
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count:           entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => ROW_HEIGHT,
    overscan:        10,
  });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
        <span className="text-sm">Chargement…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center text-rose-400">
      <div className="text-center">
        <p className="text-2xl mb-2">⚠</p>
        <p className="text-sm">{error}</p>
      </div>
    </div>
  );

  if (entries.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-slate-600">
      <div className="text-center">
        <p className="text-4xl mb-3">📂</p>
        <p className="text-sm">Dossier vide</p>
      </div>
    </div>
  );

  const items = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ListHeader />
      <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map(vRow => (
            <div
              key={vRow.key}
              style={{
                position: 'absolute',
                top:    vRow.start,
                left:   0,
                right:  0,
                height: ROW_HEIGHT,
              }}
            >
              <FileItem
                file={entries[vRow.index]}
                onContextMenu={onContextMenu}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
