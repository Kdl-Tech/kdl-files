import { useState, useRef } from 'react';
import FileIcon from './FileIcon';
import useExplorerStore from '../../store/useExplorerStore';
import { useFileOps }   from '../../hooks/useFileOps';

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes === 0) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FileItem({ file, style, onContextMenu }) {
  const { selected, setSelected, toggleSelected, rangeSelect, setPreviewFile, previewFile } = useExplorerStore();
  const { open } = useFileOps();
  const [renaming, setRenaming] = useState(false);
  const [newName,  setNewName]  = useState('');
  const inputRef = useRef();
  const { rename } = useFileOps();

  const isSelected  = selected.includes(file.path);
  const isPreviewed = previewFile?.path === file.path;

  const handleClick = (e) => {
    if (e.shiftKey) {
      rangeSelect(file.path);
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelected(file.path);
    } else {
      setSelected([file.path]);
    }
    setPreviewFile(file);
  };

  const handleDblClick = () => open(file);

  const handleRenameStart = () => {
    setNewName(file.name);
    setRenaming(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleRenameCommit = async () => {
    if (newName.trim() && newName !== file.name) {
      await rename(file.path, newName.trim());
    }
    setRenaming(false);
  };

  const handleRenameKey = (e) => {
    if (e.key === 'Enter')  handleRenameCommit();
    if (e.key === 'Escape') setRenaming(false);
    e.stopPropagation();
  };

  return (
    <div
      style={style}
      onContextMenu={(e) => { e.preventDefault(); handleClick(e); onContextMenu(e, file); }}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
      className={`file-row ${isSelected ? 'selected' : ''} ${isPreviewed && !isSelected ? 'bg-dark-800/60' : ''}`}
    >
      {/* Icône */}
      <div className="shrink-0">
        <FileIcon file={file} />
      </div>

      {/* Nom */}
      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={handleRenameKey}
            onClick={e => e.stopPropagation()}
            className="w-full bg-dark-600 border border-brand/50 rounded px-1.5 py-0.5 text-sm text-slate-100 outline-none"
            style={{ userSelect: 'text' }}
          />
        ) : (
          <span className="block truncate">{file.name}</span>
        )}
      </div>

      {/* Type */}
      <span className="w-20 shrink-0 text-xs text-slate-500 text-right capitalize hidden sm:block">
        {file.isDir ? 'Dossier' : (file.type || file.ext || '—')}
      </span>

      {/* Taille */}
      <span className="w-20 shrink-0 text-xs text-slate-500 text-right hidden md:block">
        {file.isDir ? '—' : formatSize(file.size)}
      </span>

      {/* Date */}
      <span className="w-28 shrink-0 text-xs text-slate-500 text-right hidden lg:block">
        {formatDate(file.modified)}
      </span>
    </div>
  );
}

// Exposer handleRenameStart pour l'appeler depuis l'extérieur via ref
export { FileItem };
