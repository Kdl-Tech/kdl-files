import useExplorerStore from '../../store/useExplorerStore';

function splitPath(p) {
  if (!p) return [];
  const isWin = p.match(/^[A-Za-z]:\\/);
  const sep   = p.includes('/') ? '/' : '\\';
  const parts = p.split(sep).filter(Boolean);
  // Sur Linux/macOS, la racine '/' doit apparaître
  const root  = p.startsWith('/') ? '/' : (isWin ? parts.shift() + '\\' : null);
  return root ? [root, ...parts] : parts;
}

function buildPath(parts, index) {
  if (parts.length === 0) return '/';
  const root = parts[0];
  const isWin = root.match(/^[A-Za-z]:\\/);
  const sep   = isWin ? '\\' : '/';
  const slice = parts.slice(0, index + 1);
  if (isWin) return slice.join(sep);
  if (root === '/') return '/' + slice.slice(1).join('/');
  return slice.join('/');
}

export default function Breadcrumb() {
  const { currentPath, navHistory, navIndex, navigate, goBack, goForward, goUp } = useExplorerStore();

  const parts   = splitPath(currentPath);
  const canBack = navIndex > 0;
  const canFwd  = navIndex < navHistory.length - 1;
  const canUp   = parts.length > 1;

  const btn = 'w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-700 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-1 min-w-0">
      {/* Navigation */}
      <button className={btn} onClick={goBack}    disabled={!canBack} title="Précédent (Alt+←)">◀</button>
      <button className={btn} onClick={goForward} disabled={!canFwd}  title="Suivant (Alt+→)">▶</button>
      <button className={btn} onClick={goUp}      disabled={!canUp}   title="Dossier parent (Backspace)">↑</button>

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-0.5 min-w-0 ml-1 overflow-hidden">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-0.5 min-w-0">
            {i > 0 && <span className="text-slate-600 text-xs px-0.5 shrink-0">›</span>}
            <button
              className={`px-2 py-1 rounded-lg text-sm font-medium transition-colors truncate max-w-[160px] ${
                i === parts.length - 1
                  ? 'text-slate-200 bg-dark-700/50 cursor-default'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700'
              }`}
              onClick={() => i < parts.length - 1 && navigate(buildPath(parts, i))}
            >
              {part === '/' ? '⬛ Racine' : part}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
