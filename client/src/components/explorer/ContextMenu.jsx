import { useEffect, useRef } from 'react';
import { fs } from '../../api/ipc';
import useExplorerStore from '../../store/useExplorerStore';
import { useFileOps }   from '../../hooks/useFileOps';

export default function ContextMenu({ x, y, file, onClose, onRenameRequest, onNewFolder }) {
  const ref  = useRef();
  const { selected, setSelected, clipboard } = useExplorerStore();
  const { copy, cut, paste, deleteSelected, open } = useFileOps();

  // Ferme si clic extérieur
  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Ajuste la position pour ne pas sortir de l'écran
  const posX = Math.min(x, window.innerWidth  - 200);
  const posY = Math.min(y, window.innerHeight - 300);

  const Item = ({ icon, label, onClick, danger, disabled }) => (
    <button
      onClick={() => { if (!disabled) { onClick(); onClose(); } }}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
        disabled ? 'text-slate-600 cursor-not-allowed' :
        danger    ? 'text-rose-400 hover:bg-rose-500/10' :
                    'text-slate-300 hover:text-slate-100 hover:bg-dark-600'
      }`}
    >
      <span className="text-base w-5 text-center leading-none">{icon}</span>
      {label}
    </button>
  );

  const Sep = () => <div className="my-1 border-t border-white/5" />;

  // Fichiers sélectionnés (contexte porte sur `file` ou sur la sélection)
  const targets = selected.includes(file?.path)
    ? selected
    : file ? [file.path] : [];

  return (
    <div
      ref={ref}
      style={{ left: posX, top: posY }}
      className="fixed z-50 w-52 py-1.5 rounded-xl shadow-2xl border border-white/10 bg-dark-800/95 backdrop-blur-xl"
    >
      {file && (
        <>
          <Item icon={file.isDir ? '📂' : '↗'} label={file.isDir ? 'Ouvrir' : 'Ouvrir'}
            onClick={() => open(file)} />
          {!file.isDir && (
            <Item icon="📁" label="Afficher dans l'explorateur"
              onClick={() => fs.showInFolder(file.path)} />
          )}
          <Sep />
        </>
      )}

      <Item icon="📋" label="Copier"   onClick={() => { if (targets.length) { setSelected(targets); copy(); } }} disabled={targets.length === 0} />
      <Item icon="✂️"  label="Couper"   onClick={() => { if (targets.length) { setSelected(targets); cut(); } }}  disabled={targets.length === 0} />
      <Item icon="📌" label="Coller"   onClick={paste}   disabled={!clipboard} />

      <Sep />

      <Item icon="✏️"  label="Renommer (F2)" onClick={() => onRenameRequest?.(targets[0])} disabled={targets.length !== 1} />
      <Item icon="🗑"  label="Supprimer"     onClick={() => { setSelected(targets); deleteSelected(); }} danger disabled={targets.length === 0} />

      <Sep />

      <Item icon="📁"  label="Nouveau dossier" onClick={() => onNewFolder?.()} />
    </div>
  );
}
