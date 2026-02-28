import { useState, useCallback, useEffect } from 'react';
import Toolbar      from '../components/explorer/Toolbar';
import FileList     from '../components/explorer/FileList';
import FileGrid     from '../components/explorer/FileGrid';
import FilePreview  from '../components/explorer/FilePreview';
import ContextMenu  from '../components/explorer/ContextMenu';
import useExplorerStore  from '../store/useExplorerStore';
import { useFileOps }    from '../hooks/useFileOps';
import { useExplorerKeyboard } from '../hooks/useKeyboard';
import { fs, disks }     from '../api/ipc';

// ── Sélecteur de disques (état initial) ──────────────────────────────────────
function DiskPicker({ onPick }) {
  const [diskList, setDiskList] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    disks.list().then(d => { setDiskList(d || []); setLoading(false); });
  }, []);

  function fmtBytes(b) {
    if (!b) return '';
    const GB = b / 1024 / 1024 / 1024;
    return GB >= 1 ? `${GB.toFixed(0)} Go` : `${(b/1024/1024).toFixed(0)} Mo`;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-5xl mb-4">💾</p>
        <h2 className="text-xl font-bold text-slate-200">Choisissez un emplacement</h2>
        <p className="text-sm text-slate-500 mt-1">Sélectionnez un disque ou choisissez un dossier</p>
      </div>

      {/* Disques disponibles */}
      {loading ? (
        <div className="w-8 h-8 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
          {diskList.map(disk => {
            const pct = disk.total ? Math.round(disk.used / disk.total * 100) : 0;
            return (
              <button
                key={disk.mount}
                onClick={() => onPick(disk.mount)}
                className="card text-left hover:border-brand/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">💾</span>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">{disk.name || disk.mount}</p>
                    <p className="text-xs text-slate-500">{disk.mount}</p>
                  </div>
                </div>
                {disk.total > 0 && (
                  <>
                    <div className="w-full bg-dark-700 rounded-full h-1.5 mb-1.5">
                      <div
                        className={`h-1.5 rounded-full ${pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-brand'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {fmtBytes(disk.used)} / {fmtBytes(disk.total)} utilisés ({pct}%)
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Choisir un dossier manuellement */}
      <div className="flex gap-3">
        <button
          className="btn-secondary"
          onClick={async () => {
            const picked = await fs.pickFolder();
            if (picked) onPick(picked);
          }}
        >
          📁 Choisir un dossier…
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            // Répertoire personnel
            const home = await window.kdlfiles.fs.homedir?.() || '/home';
            onPick(home);
          }}
        >
          🏠 Répertoire personnel
        </button>
      </div>
    </div>
  );
}

// ── Boîte de dialogue : nom de dossier ──────────────────────────────────────
function NewFolderDialog({ onConfirm, onCancel }) {
  const [name, setName] = useState('Nouveau dossier');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-80">
        <h3 className="font-semibold text-slate-200 mb-4">Nouveau dossier</h3>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(name); if (e.key === 'Escape') onCancel(); }}
          className="input mb-4"
          style={{ userSelect: 'text' }}
          placeholder="Nom du dossier"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}          className="btn-secondary">Annuler</button>
          <button onClick={() => onConfirm(name)} className="btn-primary">Créer</button>
        </div>
      </div>
    </div>
  );
}

// ── Boîte de dialogue : confirmation suppression ─────────────────────────────
function DeleteConfirm({ count, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-80">
        <h3 className="font-semibold text-slate-200 mb-2">Supprimer {count > 1 ? `${count} fichiers` : 'ce fichier'} ?</h3>
        <p className="text-sm text-slate-400 mb-5">Les fichiers seront envoyés dans la corbeille.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}  className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Explorer() {
  const { currentPath, viewMode, showPreview, selected, navigate } = useExplorerStore();
  const { mkdir, deleteSelected, rename }     = useFileOps();

  const [ctxMenu,     setCtxMenu]     = useState(null);   // { x, y, file }
  const [newFolderDlg, setNewFolderDlg] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);  // path → renaming inline

  // Raccourcis clavier
  useExplorerKeyboard(useCallback((path) => setRenameTarget(path), []));

  const handleContextMenu = useCallback((e, file) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleNewFolder = useCallback(async (name) => {
    if (name?.trim()) await mkdir(name.trim());
    setNewFolderDlg(false);
  }, [mkdir]);

  // Clic sur le fond = désélection + ferme le menu contextuel
  const handleBgClick = (e) => {
    if (e.target === e.currentTarget) {
      useExplorerStore.getState().clearSelected();
    }
  };

  // Pas encore de dossier sélectionné → afficher le disk picker
  if (!currentPath) {
    return <DiskPicker onPick={(path) => navigate(path)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setCtxMenu(null)}>
      {/* Barre d'outils */}
      <Toolbar
        onNewFolder={() => setNewFolderDlg(true)}
        onRenameRequest={(path) => setRenameTarget(path)}
      />

      {/* Zone principale */}
      <div className="flex flex-1 overflow-hidden" onClick={handleBgClick}>
        {/* Liste ou Grille */}
        <div className="flex-1 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          {viewMode === 'list'
            ? <FileList onContextMenu={handleContextMenu} renameTarget={renameTarget} onRenameEnd={() => setRenameTarget(null)} />
            : <FileGrid onContextMenu={handleContextMenu} renameTarget={renameTarget} onRenameEnd={() => setRenameTarget(null)} />
          }
        </div>

        {/* Panneau aperçu */}
        {showPreview && <FilePreview />}
      </div>

      {/* Menu contextuel */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          file={ctxMenu.file}
          onClose={() => setCtxMenu(null)}
          onRenameRequest={(path) => { setRenameTarget(path); setCtxMenu(null); }}
          onNewFolder={() => { setNewFolderDlg(true); setCtxMenu(null); }}
        />
      )}

      {/* Modal nouveau dossier */}
      {newFolderDlg && (
        <NewFolderDialog
          onConfirm={handleNewFolder}
          onCancel={() => setNewFolderDlg(false)}
        />
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <DeleteConfirm
          count={selected.length}
          onConfirm={() => { deleteSelected(); setDeleteConfirm(false); }}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
