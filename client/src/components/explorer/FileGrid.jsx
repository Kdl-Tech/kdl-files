import { useState } from 'react';
import FileIcon from './FileIcon';
import useExplorerStore from '../../store/useExplorerStore';
import { useFileOps }   from '../../hooks/useFileOps';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function GridItem({ file, onContextMenu }) {
  const { selected, setSelected, toggleSelected, rangeSelect, setPreviewFile } = useExplorerStore();
  const { open } = useFileOps();
  const [renaming, setRenaming] = useState(false);
  const [newName,  setNewName]  = useState('');
  const { rename } = useFileOps();

  const isSelected = selected.includes(file.path);

  const handleClick = (e) => {
    if (e.shiftKey)          rangeSelect(file.path);
    else if (e.ctrlKey || e.metaKey) toggleSelected(file.path);
    else                     setSelected([file.path]);
    setPreviewFile(file);
  };

  const handleRenameCommit = async () => {
    if (newName.trim() && newName !== file.name) await rename(file.path, newName.trim());
    setRenaming(false);
  };

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); handleClick(e); onContextMenu(e, file); }}
      onClick={handleClick}
      onDoubleClick={() => open(file)}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all group ${
        isSelected
          ? 'bg-brand/20 border border-brand/30'
          : 'border border-transparent hover:bg-dark-700/60 hover:border-white/5'
      }`}
    >
      <div className="flex items-center justify-center w-14 h-14">
        <FileIcon file={file} size="lg" />
      </div>

      <div className="w-full text-center">
        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(); if (e.key === 'Escape') setRenaming(false); e.stopPropagation(); }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-dark-600 border border-brand/50 rounded px-1 text-xs text-center outline-none"
            style={{ userSelect: 'text' }}
          />
        ) : (
          <p className="text-xs font-medium text-slate-300 truncate leading-tight" title={file.name}>
            {file.name}
          </p>
        )}
        {!file.isDir && (
          <p className="text-[10px] text-slate-600 mt-0.5">{formatSize(file.size)}</p>
        )}
      </div>
    </div>
  );
}

export default function FileGrid({ onContextMenu }) {
  const { entries, loading, error } = useExplorerStore();

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
      <p className="text-sm">{error}</p>
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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
        {entries.map(file => (
          <GridItem key={file.path} file={file} onContextMenu={onContextMenu} />
        ))}
      </div>
    </div>
  );
}
