import { useState, useEffect, useRef } from 'react';
import { dups, fs } from '../api/ipc';
import FileIcon from '../components/explorer/FileIcon';

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Un groupe de fichiers dupliqués
function DupGroup({ group, checkedPaths, onToggle }) {
  const [open, setOpen] = useState(true);
  const wasted = group.size * (group.files.length - 1);

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden mb-3">
      {/* En-tête du groupe */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-dark-800/60 cursor-pointer hover:bg-dark-700/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-slate-400 text-xs">{open ? '▼' : '▶'}</span>
        <span className="text-amber-400 text-base">🔁</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">{group.files[0].name}</p>
          <p className="text-xs text-slate-500">{group.files.length} copies · {formatSize(group.size)} chacun · <span className="text-rose-400">{formatSize(wasted)} gaspillés</span></p>
        </div>
      </div>

      {/* Fichiers du groupe */}
      {open && (
        <div className="divide-y divide-white/5">
          {group.files.map((file, i) => (
            <div
              key={file.path}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                checkedPaths.includes(file.path) ? 'bg-rose-500/8' : 'hover:bg-dark-800/30'
              }`}
            >
              <input
                type="checkbox"
                checked={checkedPaths.includes(file.path)}
                onChange={() => onToggle(file.path)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 accent-brand"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">{file.path}</p>
                <p className="text-xs text-slate-600">{formatDate(file.modified)}</p>
              </div>
              {i === 0 && (
                <span className="badge-ok text-[10px]">Original</span>
              )}
              <button
                onClick={() => fs.showInFolder(file.path)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                title="Afficher dans l'explorateur"
              >📁</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Duplicates() {
  const [groups,    setGroups]    = useState([]);
  const [scanning,  setScanning]  = useState(false);
  const [progress,  setProgress]  = useState(null);
  const [checked,   setChecked]   = useState([]);
  const [deleting,  setDeleting]  = useState(false);
  const [done,      setDone]      = useState(false);
  const scanningRef = useRef(false);

  // Chargement des groupes existants au montage
  useEffect(() => {
    dups.getGroups().then(g => { if (g?.length) setGroups(g); });
  }, []);

  // Écoute de la progression — getGroups appelé quand le worker est done
  useEffect(() => {
    const unsub = dups.onProgress(async (p) => {
      setProgress(p);
      if (p.type === 'done' && scanningRef.current) {
        scanningRef.current = false;
        const g = await dups.getGroups();
        setGroups(g || []);
        setScanning(false);
        setDone(true);
      }
    });
    return unsub;
  }, []);

  const handleScan = async () => {
    const picked = await window.kdlfiles.fs.pickFolder();
    if (!picked) return;
    scanningRef.current = true;
    setScanning(true);
    setProgress(null);
    setGroups([]);
    setChecked([]);
    setDone(false);
    await dups.scan(picked);
    // La suite se passe dans le listener onProgress quand type === 'done'
  };

  const toggleCheck = (path) =>
    setChecked(c => c.includes(path) ? c.filter(p => p !== path) : [...c, path]);

  // Sélectionner automatiquement tous les doublons (sauf le premier de chaque groupe)
  const selectDuplicates = () => {
    const toSelect = groups.flatMap(g => g.files.slice(1).map(f => f.path));
    setChecked(toSelect);
  };

  const deleteChecked = async () => {
    if (checked.length === 0) return;
    setDeleting(true);
    await dups.deleteFiles(checked);
    setGroups(g => g.map(group => ({
      ...group,
      files: group.files.filter(f => !checked.includes(f.path)),
    })).filter(g => g.files.length > 1));
    setChecked([]);
    setDeleting(false);
  };

  // Calculs stats
  const totalGroups = groups.length;
  const totalWasted = groups.reduce((acc, g) => acc + g.size * (g.files.length - 1), 0);
  const checkedSize = groups.reduce((acc, g) =>
    acc + g.files.filter(f => checked.includes(f.path)).length * g.size, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-dark-900/30">
        <button onClick={handleScan} disabled={scanning} className="btn-primary">
          {scanning ? '⏳ Scan en cours…' : '🔍 Scanner un dossier'}
        </button>

        {groups.length > 0 && (
          <>
            <button onClick={selectDuplicates} className="btn-secondary text-xs">
              Sélectionner doublons
            </button>
            {checked.length > 0 && (
              <button
                onClick={deleteChecked}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
              >
                {deleting ? 'Suppression…' : `🗑 Supprimer (${checked.length}) — libérer ${formatSize(checkedSize)}`}
              </button>
            )}
          </>
        )}

        <div className="flex-1" />

        {/* Stats */}
        {totalGroups > 0 && (
          <div className="flex gap-4 text-xs text-slate-500">
            <span><span className="text-amber-400 font-semibold">{totalGroups}</span> groupe(s)</span>
            <span><span className="text-rose-400 font-semibold">{formatSize(totalWasted)}</span> gaspillés</span>
          </div>
        )}
      </div>

      {/* Progression scan */}
      {scanning && progress && (
        <div className="shrink-0 px-4 py-3 bg-brand/10 border-b border-brand/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
            <span className="text-sm text-slate-300">
              {progress.step === 'hashing' && `Calcul des empreintes… (${progress.done || 0}/${progress.total || 0})`}
              {progress.type === 'done'   && 'Analyse terminée'}
            </span>
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-dark-700 rounded-full h-1">
              <div className="h-1 bg-brand rounded-full transition-all"
                   style={{ width: `${Math.round(progress.done / progress.total * 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4">
        {!scanning && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <p className="text-5xl mb-4">🔁</p>
            {done
              ? <p className="text-sm text-emerald-500">✅ Aucun doublon trouvé dans ce dossier !</p>
              : <p className="text-sm">Lancez un scan pour détecter les fichiers dupliqués</p>
            }
          </div>
        )}

        {groups.map((group, i) => (
          <DupGroup key={i} group={group} checkedPaths={checked} onToggle={toggleCheck} />
        ))}
      </div>
    </div>
  );
}
