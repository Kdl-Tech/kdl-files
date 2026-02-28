import Breadcrumb      from './Breadcrumb';
import useExplorerStore from '../../store/useExplorerStore';
import { useFileOps }   from '../../hooks/useFileOps';
import { fs }           from '../../api/ipc';

export default function Toolbar({ onNewFolder, onRenameRequest }) {
  const { viewMode, sortBy, sortDir, showPreview, selected, clipboard,
          setViewMode, setSort, togglePreview, refresh } = useExplorerStore();
  const { copy, cut, paste, deleteSelected } = useFileOps();

  const btn    = 'h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors';
  const btnNav = `${btn} text-slate-400 hover:text-slate-200 hover:bg-dark-700`;
  const btnAct = `${btn} text-brand-light bg-brand/15 hover:bg-brand/25`;

  const SortBtn = ({ by, label }) => (
    <button
      onClick={() => setSort(by)}
      className={`${btn} ${sortBy === by ? 'text-brand-light bg-brand/15' : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700'}`}
    >
      {label}
      {sortBy === by && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-dark-900/40 shrink-0">
      {/* Fil d'ariane + navigation */}
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>

      {/* Séparateur */}
      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Tri */}
      <div className="flex items-center gap-0.5 shrink-0">
        <SortBtn by="name"     label="Nom" />
        <SortBtn by="size"     label="Taille" />
        <SortBtn by="modified" label="Date" />
        <SortBtn by="type"     label="Type" />
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Actions contextuelles */}
      {selected.length > 0 && (
        <>
          <button onClick={copy}           className={btnNav} title="Copier (Ctrl+C)">📋 Copier</button>
          <button onClick={cut}            className={btnNav} title="Couper (Ctrl+X)">✂️ Couper</button>
          {selected.length === 1 && (
            <button onClick={() => onRenameRequest?.(selected[0])} className={btnNav} title="Renommer (F2)">✏️</button>
          )}
          <button onClick={deleteSelected} className={`${btn} text-rose-400 hover:text-rose-300 hover:bg-rose-500/10`} title="Supprimer (Suppr)">🗑</button>
          <div className="w-px h-5 bg-white/10 shrink-0" />
        </>
      )}

      {clipboard && (
        <>
          <button onClick={paste} className={btnAct} title="Coller (Ctrl+V)">📌 Coller ({clipboard.paths.length})</button>
          <div className="w-px h-5 bg-white/10 shrink-0" />
        </>
      )}

      {/* Nouveau dossier */}
      <button onClick={onNewFolder} className={btnNav} title="Nouveau dossier">+ Dossier</button>

      {/* Actualiser */}
      <button onClick={refresh} className={btnNav} title="Actualiser (F5)">↻</button>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Vue liste / grille */}
      <button
        onClick={() => setViewMode('list')}
        className={`${btn} ${viewMode === 'list' ? btnAct : btnNav}`}
        title="Vue liste"
      >☰</button>
      <button
        onClick={() => setViewMode('grid')}
        className={`${btn} ${viewMode === 'grid' ? btnAct : btnNav}`}
        title="Vue grille"
      >⊞</button>

      {/* Aperçu */}
      <button
        onClick={togglePreview}
        className={`${btn} ${showPreview ? btnAct : btnNav}`}
        title="Panneau d'aperçu"
      >▣</button>
    </div>
  );
}
