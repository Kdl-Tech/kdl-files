import { useState, useEffect } from 'react';
import { tags as tagsApi, fs } from '../api/ipc';

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#ec4899','#84cc16','#f97316','#64748b',
];

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: color, boxShadow: selected ? `0 0 0 2px #fff4, 0 0 0 4px ${color}88` : 'none' }}
      className="w-5 h-5 rounded-full transition-all hover:scale-110"
    />
  );
}

function TagBadge({ tag, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active ? 'ring-2 ring-offset-1 ring-offset-dark-900' : 'hover:opacity-80'
      }`}
      style={{ backgroundColor: tag.color + '22', border: `1px solid ${tag.color}55`, color: tag.color,
               ...(active ? { boxShadow: `0 0 0 2px ${tag.color}88` } : {}) }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </button>
  );
}

export default function Tags() {
  const [tagList,   setTagList]   = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [tagFiles,  setTagFiles]  = useState([]);
  const [newName,   setNewName]   = useState('');
  const [newColor,  setNewColor]  = useState(PRESET_COLORS[0]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    tagsApi.list().then(t => setTagList(t || []));
  }, []);

  const createTag = async () => {
    if (!newName.trim()) return;
    await tagsApi.create(newName.trim(), newColor);
    const updated = await tagsApi.list();
    setTagList(updated || []);
    setNewName('');
  };

  const deleteTag = async (id) => {
    await tagsApi.delete(id);
    setTagList(t => t.filter(x => x.id !== id));
    if (activeTag?.id === id) { setActiveTag(null); setTagFiles([]); }
  };

  // Fichiers portant ce tag (via une recherche dans l'index)
  const selectTag = async (tag) => {
    setActiveTag(tag);
    setLoading(true);
    // Récupérer les fichiers via search:query avec hasTag
    const res = await window.kdlfiles.search.query({ hasTag: tag.id });
    setTagFiles(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar tags */}
      <div className="w-64 shrink-0 border-r border-white/5 bg-dark-900/30 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouveau tag</p>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Nom du tag" className="input text-sm py-2" style={{ userSelect: 'text' }} />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map(c => (
              <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
            ))}
          </div>
          <button onClick={createTag} className="btn-primary w-full text-sm py-2">+ Créer le tag</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {tagList.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">Aucun tag créé</p>
          )}
          {tagList.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 group">
              <div className="flex-1" onClick={() => selectTag(tag)}>
                <TagBadge tag={tag} active={activeTag?.id === tag.id} />
              </div>
              <button onClick={() => deleteTag(tag.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-rose-400 transition-all w-5 h-5 flex items-center justify-center rounded">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Zone fichiers du tag */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeTag ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <p className="text-5xl mb-4">🏷️</p>
            <p className="text-sm">Sélectionnez un tag pour voir les fichiers associés</p>
            <p className="text-xs text-slate-700 mt-1">Les tags sont assignés depuis l'aperçu d'un fichier dans l'explorateur</p>
          </div>
        ) : (
          <>
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-dark-900/30">
              <TagBadge tag={activeTag} />
              <span className="text-sm text-slate-500">{tagFiles.length} fichier(s)</span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
              </div>
            ) : tagFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">Aucun fichier avec ce tag dans l'index</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {tagFiles.map(file => (
                  <div key={file.path} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-800/50 transition-colors">
                    <span className="text-base">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 truncate">{file.path}</p>
                    </div>
                    <button onClick={() => fs.openExternal(file.path)}
                      className="text-slate-500 hover:text-slate-300 text-sm transition-colors">↗</button>
                    <button onClick={() => fs.showInFolder(file.path)}
                      className="text-slate-500 hover:text-slate-300 text-sm transition-colors">📁</button>
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
