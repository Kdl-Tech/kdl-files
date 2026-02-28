import { useEffect, useState } from 'react';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const unsub = window.kdlfiles?.window?.onMaximize?.((v) => setMaximized(v));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  return (
    <div className="h-10 flex items-center justify-between px-4 bg-dark-900/80 border-b border-white/5 shrink-0 drag-region">
      {/* Logo */}
      <div className="flex items-center gap-2 no-drag">
        <div className="w-5 h-5 rounded-md bg-gradient-brand flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2h3v3H2zM7 2h3v3H7zM2 7h3v3H2zM7 7h3v3H7z" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-300 tracking-wide">KDL Files</span>
      </div>

      {/* Titre centré */}
      <span className="text-xs text-slate-600 absolute left-1/2 -translate-x-1/2">
        Organiseur de fichiers
      </span>

      {/* Contrôles fenêtre */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => window.kdlfiles?.window?.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-dark-600 transition-colors"
          title="Réduire"
        >
          <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor"><rect width="10" height="2" rx="1"/></svg>
        </button>
        <button
          onClick={() => window.kdlfiles?.window?.maximize()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-dark-600 transition-colors"
          title={maximized ? 'Restaurer' : 'Agrandir'}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="1" width="6" height="6" rx="1"/>
              <path d="M1 3v5a1 1 0 001 1h5"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="8" height="8" rx="1"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => window.kdlfiles?.window?.close()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Fermer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
