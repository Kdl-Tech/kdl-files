import { useState, useMemo } from 'react';
import { fs } from '../api/ipc';
import FileIcon from '../components/explorer/FileIcon';

// Applique un pattern à un fichier
function applyPattern(pattern, file, index, total) {
  const d   = new Date(file.modified * 1000);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return pattern
    .replace(/\{n\}/g,    String(index + 1))
    .replace(/\{nn\}/g,   pad(index + 1))
    .replace(/\{nnn\}/g,  pad(index + 1, 3))
    .replace(/\{name\}/g, file.nameBase)
    .replace(/\{ext\}/g,  file.ext || '')
    .replace(/\{date\}/g, `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`)
    .replace(/\{year\}/g, String(d.getFullYear()))
    .replace(/\{month\}/g,pad(d.getMonth()+1))
    .replace(/\{day\}/g,  pad(d.getDate()));
}

const SEP = (path) => path.includes('/') ? '/' : '\\';

export default function Rename() {
  const [files,      setFiles]    = useState([]);
  const [pattern,   setPattern]  = useState('{name}');
  const [prefix,    setPrefix]   = useState('');
  const [suffix,    setSuffix]   = useState('');
  const [search,    setSearch]   = useState('');
  const [replace,   setReplace]  = useState('');
  const [useRegex,  setUseRegex] = useState(false);
  const [keepExt,   setKeepExt]  = useState(true);
  const [running,   setRunning]  = useState(false);
  const [done,      setDone]     = useState(false);

  // Charger des fichiers
  const pickFiles = async () => {
    const picked = await window.kdlfiles.fs.pickFolder();
    if (!picked) return;
    const entries = await window.kdlfiles.fs.readDir(picked);
    if (!entries || entries.error) return;
    const fileEntries = entries
      .filter(e => !e.isDir)
      .map(e => ({
        ...e,
        nameBase: e.ext ? e.name.slice(0, -(e.ext.length + 1)) : e.name,
      }));
    setFiles(fileEntries);
    setDone(false);
  };

  // Calcul du prévisualisation en temps réel
  const previews = useMemo(() => {
    return files.map((file, i) => {
      try {
        let newName = applyPattern(pattern, file, i, files.length);
        // Préfixe / suffixe
        newName = prefix + newName + suffix;
        // Rechercher / Remplacer
        if (search) {
          if (useRegex) {
            try {
              newName = newName.replace(new RegExp(search, 'g'), replace);
            } catch { /* regex invalide */ }
          } else {
            newName = newName.split(search).join(replace);
          }
        }
        // Extension
        if (keepExt && file.ext) {
          // Retire l'extension si elle est déjà dans le nom final, puis la rajoute
          if (!newName.endsWith(`.${file.ext}`)) {
            newName = `${newName}.${file.ext}`;
          }
        }
        const dir  = file.path.split(SEP(file.path)).slice(0, -1).join(SEP(file.path));
        const dest = dir + SEP(file.path) + newName;
        return { src: file.path, dest, newName, changed: newName !== file.name };
      } catch {
        return { src: file.path, dest: file.path, newName: file.name, changed: false };
      }
    });
  }, [files, pattern, prefix, suffix, search, replace, useRegex, keepExt]);

  const changedCount = previews.filter(p => p.changed).length;

  const doRename = async () => {
    const ops = previews.filter(p => p.changed).map(p => ({ src: p.src, dest: p.dest }));
    if (ops.length === 0) return;
    setRunning(true);
    await window.kdlfiles.fs.batchRename(ops);
    setRunning(false);
    setDone(true);
    setFiles([]);
  };

  const inputCls = 'input text-sm py-2';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panneau de configuration */}
      <div className="shrink-0 border-b border-white/5 bg-dark-900/30 p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={pickFiles} className="btn-secondary text-sm">📂 Choisir un dossier</button>
          {files.length > 0 && <span className="text-xs text-slate-500">{files.length} fichier(s) chargé(s)</span>}
        </div>

        {files.length > 0 && (
          <>
            {/* Pattern */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-48">
                <label className="text-xs text-slate-500 mb-1 block">Pattern de nom</label>
                <input value={pattern} onChange={e => setPattern(e.target.value)}
                  className={inputCls} style={{ userSelect: 'text' }}
                  placeholder="{name} ou {nn}_{date}" />
                <p className="text-[10px] text-slate-600 mt-1">
                  Variables : {'{n}'} numéro · {'{nn}'} num. padded · {'{name}'} nom original · {'{date}'} date · {'{year}'}/{'{month}'}/{'{day}'}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Préfixe</label>
                <input value={prefix} onChange={e => setPrefix(e.target.value)} className={`${inputCls} w-32`} style={{ userSelect: 'text' }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Suffixe</label>
                <input value={suffix} onChange={e => setSuffix(e.target.value)} className={`${inputCls} w-32`} style={{ userSelect: 'text' }} />
              </div>
            </div>

            {/* Rechercher / Remplacer */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rechercher</label>
                <input value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} w-40`} style={{ userSelect: 'text' }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Remplacer par</label>
                <input value={replace} onChange={e => setReplace(e.target.value)} className={`${inputCls} w-40`} style={{ userSelect: 'text' }} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} className="accent-brand" />
                Regex
              </label>
              <label className="flex items-center gap-2 pb-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={keepExt} onChange={e => setKeepExt(e.target.checked)} className="accent-brand" />
                Garder l'extension
              </label>
            </div>

            {/* Action */}
            <div className="flex items-center gap-3">
              <button onClick={doRename} disabled={running || changedCount === 0}
                className="btn-primary">
                {running ? '⏳ Renommage…' : `✏️ Renommer ${changedCount} fichier(s)`}
              </button>
              {done && <span className="text-xs text-emerald-400">✅ Renommage terminé !</span>}
            </div>
          </>
        )}
      </div>

      {/* Prévisualisation */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <p className="text-5xl mb-4">✏️</p>
            <p className="text-sm">Choisissez un dossier pour renommer des fichiers en lot</p>
          </div>
        )}

        {previews.length > 0 && (
          <>
            {/* En-tête */}
            <div className="grid grid-cols-2 gap-4 px-4 py-2 border-b border-white/5 bg-dark-900/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom original</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouveau nom</p>
            </div>
            <div className="divide-y divide-white/5">
              {previews.map((p, i) => (
                <div key={p.src} className={`grid grid-cols-2 gap-4 px-4 py-2.5 items-center ${p.changed ? 'bg-brand/5' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon file={files[i]} />
                    <span className="text-sm text-slate-400 truncate">{files[i].name}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {p.changed && <span className="text-brand-light text-xs">→</span>}
                    <span className={`text-sm truncate ${p.changed ? 'text-brand-light font-medium' : 'text-slate-600'}`}>
                      {p.newName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
