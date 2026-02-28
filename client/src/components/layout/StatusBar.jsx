export default function StatusBar() {
  return (
    <div className="h-6 flex items-center justify-between px-4 bg-dark-900/60 border-t border-white/5 text-xs text-slate-600 shrink-0">
      <span>KDL Files v1.0.0</span>
      <a
        href="https://github.com/Kdl-Tech/kdl-files"
        target="_blank"
        rel="noreferrer"
        className="hover:text-slate-400 transition-colors"
        onClick={e => { e.preventDefault(); window.kdlfiles?.fs?.openExternal?.('https://github.com/Kdl-Tech/kdl-files'); }}
      >
        github.com/Kdl-Tech/kdl-files
      </a>
      <span>MIT License — Open Source</span>
    </div>
  );
}
