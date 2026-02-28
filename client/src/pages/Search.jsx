import { useState, useCallback } from 'react';
import { search as searchApi, fs } from '../api/ipc';
import useExplorerStore from '../store/useExplorerStore';
import FileIcon from '../components/explorer/FileIcon';
import { useNavigate } from 'react-router-dom';

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

const FILE_TYPES = ['', 'image', 'video', 'audio', 'doc', 'archive', 'code', 'other'];

export default function Search() {
  const navigate          = useNavigate();
  const { navigate: explorerNav } = useExplorerStore();

  const [q,        setQ]        = useState('');
  const [ext,      setExt]      = useState('');
  const [type,     setType]     = useState('');
  const [sizeMin,  setSizeMin]  = useState('');
  const [sizeMax,  setSizeMax]  = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState([]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSelected([]);
    const params = {
      q:        q.trim()   || undefined,
      ext:      ext.trim() || undefined,
      type:     type       || undefined,
      sizeMin:  sizeMin ? Number(sizeMin) * 1024 * 1024 : undefined,
      sizeMax:  sizeMax ? Number(sizeMax) * 1024 * 1024 : undefined,
      dateFrom: dateFrom ? Math.floor(new Date(dateFrom).getTime() / 1000) : undefined,
      dateTo:   dateTo   ? Math.floor(new Date(dateTo).getTime()   / 1000) : undefined,
    };
    const res = await searchApi.query(params);
    setResults(Array.isArray(res) ? res : []);
    setLoading(false);
  }, [q, ext, type, sizeMin, sizeMax, dateFrom, dateTo]);

  const handleKey = (e) => { if (e.key === 'Enter') doSearch(); };

  const toggleSelect = (path) =>
    setSelected(s => s.includes(path) ? s.filter(p => p !== path) : [...s, path]);

  const openInExplorer = (file) => {
    const sep = file.path.includes('/') ? '/' : '\\';
    const dir = file.path.split(sep).slice(0, -1).join(sep) || '/';
    explorerNav(dir);
    navigate('/explorer');
  };

  const inputCls = 'input text-sm py-2';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barre de recherche */}
      <div className="shrink-0 p-4 border-b border-white/5 bg-dark-900/30 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey}
              placeholder="Nom de fichier, contenu…"
              className={`${inputCls} pl-9`} style={{ userSelect: 'text' }}
            />
          </div>
          <button onClick={doSearch} disabled={loading} className="btn-primary px-6">
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input value={ext} onChange={e => setExt(e.target.value)} placeholder="Extension (ex: pdf)"
            className={`${inputCls} w-36`} style={{ userSelect: 'text' }} />

          <select value={type} onChange={e => setType(e.target.value)} className="input text-sm py-2 w-36">
            {FILE_TYPES.map(t => <option key={t} value={t}>{t || 'Tous types'}</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Taille :</span>
            <input value={sizeMin} onChange={e => setSizeMin(e.target.value)} placeholder="Min Mo"
              type="number" min="0" className={`${inputCls} w-20`} />
            <span className="text-slate-600">—</span>
            <input value={sizeMax} onChange={e => setSizeMax(e.target.value)} placeholder="Max Mo"
              type="number" min="0" className={`${inputCls} w-20`} />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Date :</span>
            <input value={dateFrom} onChange={e => setDateFrom(e.target.value)} type="date" className={`${inputCls} w-36`} />
            <span className="text-slate-600">—</span>
            <input value={dateTo}   onChange={e => setDateTo(e.target.value)}   type="date" className={`${inputCls} w-36`} />
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="flex-1 overflow-y-auto">
        {results === null && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-sm">Lancez une recherche pour trouver vos fichiers</p>
            <p className="text-xs mt-1 text-slate-700">L'index doit d'abord être construit depuis le tableau de bord</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="w-8 h-8 border-2 border-brand/40 border-t-brand rounded-full animate-spin mb-3" />
            <p className="text-sm">Recherche en cours…</p>
          </div>
        )}

        {results !== null && !loading && (
          <>
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-3">
              <p className="text-sm text-slate-400">
                {results.length === 0 ? 'Aucun résultat' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
              </p>
              {selected.length > 0 && <p className="text-xs text-brand-light">{selected.length} sélectionné(s)</p>}
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm">Aucun fichier trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {results.map(file => (
                  <div
                    key={file.path}
                    onClick={() => toggleSelect(file.path)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      selected.includes(file.path) ? 'bg-brand/10' : 'hover:bg-dark-800/50'
                    }`}
                  >
                    <FileIcon file={file} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 truncate">{file.path}</p>
                      {file.content_snippet && (
                        <p className="text-xs text-slate-600 truncate mt-0.5 font-mono">{file.content_snippet.slice(0, 100)}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500 space-y-0.5">
                      <p>{formatSize(file.size)}</p>
                      <p>{formatDate(file.modified)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); fs.openExternal(file.path); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-dark-700 text-sm" title="Ouvrir">↗</button>
                      <button onClick={e => { e.stopPropagation(); openInExplorer(file); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-dark-700 text-sm" title="Ouvrir dans l'explorateur">📁</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
