import { useState, useEffect } from 'react';
import { index, disks, history as historyApi } from '../api/ipc';
import { useNavigate } from 'react-router-dom';
import useExplorerStore from '../store/useExplorerStore';

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Carte stat ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand:   'text-brand-light bg-brand/15',
    emerald: 'text-emerald-400 bg-emerald-500/15',
    amber:   'text-amber-400 bg-amber-500/15',
    rose:    'text-rose-400 bg-rose-500/15',
    cyan:    'text-cyan-400 bg-cyan-500/15',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Lien rapide ─────────────────────────────────────────────────────────────
function QuickLink({ icon, label, desc, to, onClick }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick || (() => navigate(to))}
      className="card text-left hover:border-brand/20 transition-all group"
    >
      <p className="text-2xl mb-2">{icon}</p>
      <p className="font-semibold text-slate-200 text-sm mb-0.5 group-hover:text-brand-light transition-colors">{label}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </button>
  );
}

// ── Disque bar ──────────────────────────────────────────────────────────────
function DiskBar({ disk }) {
  const pct = disk.total ? Math.round(disk.used / disk.total * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">💾</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-300 truncate">{disk.name || disk.mount}</span>
          <span className="text-xs text-slate-500 shrink-0">{pct}%</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-brand'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-slate-600">{formatSize(disk.used)} utilisés</span>
          <span className="text-[10px] text-slate-600">{formatSize(disk.free)} libres</span>
        </div>
      </div>
    </div>
  );
}

// ── Page Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate     = useNavigate();
  const { navigate: explorerNav } = useExplorerStore();

  const [indexStatus,  setIndexStatus]  = useState(null);
  const [indexing,     setIndexing]     = useState(false);
  const [progress,     setProgress]     = useState(null);
  const [diskList,     setDiskList]     = useState([]);
  const [recentOps,    setRecentOps]    = useState([]);

  useEffect(() => {
    index.status().then(setIndexStatus);
    disks.list().then(d => setDiskList(d || []));
    historyApi.list(5).then(h => setRecentOps(h || []));

    // Progression indexation
    const unsub = index.onProgress(p => {
      setProgress(p);
      if (p.done) { setIndexing(false); index.status().then(setIndexStatus); }
    });
    return unsub;
  }, []);

  const startIndex = async () => {
    const picked = await window.kdlfiles.fs.pickFolder();
    if (!picked) return;
    setIndexing(true);
    setProgress(null);
    await index.start([picked]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-gradient mb-1">Tableau de bord</h1>
        <p className="text-sm text-slate-500">Vue d'ensemble de vos fichiers et outils</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Fichiers indexés"
          value={indexStatus?.indexed?.toLocaleString() || '—'}
          sub={indexStatus?.lastRun ? `Indexé le ${formatDate(Math.floor(indexStatus.lastRun / 1000))}` : 'Non indexé'}
          color="brand" />
        <StatCard icon="💾" label="Disques montés" value={diskList.length} color="cyan" />
        <StatCard icon="📁" label="Opérations récentes" value={recentOps.length} color="emerald" />
        <StatCard icon="✅" label="Prêt" value="Opérationnel" color="emerald" />
      </div>

      {/* Indexation */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-200">Indexation des fichiers</h2>
            <p className="text-xs text-slate-500 mt-0.5">Construire l'index pour activer la recherche rapide</p>
          </div>
          <button onClick={startIndex} disabled={indexing} className="btn-primary">
            {indexing ? '⏳ Indexation…' : '🔄 Indexer un dossier'}
          </button>
        </div>

        {indexing && progress && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progress.current || 'En cours…'}</span>
              <span>{progress.indexed?.toLocaleString()} fichiers</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-1.5">
              <div className="h-1.5 bg-brand rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {!indexing && indexStatus?.count > 0 && (
          <div className="flex items-center gap-3">
            <span className="badge-ok">Index actif</span>
            <span className="text-xs text-slate-500">{indexStatus.indexed?.toLocaleString()} fichiers · Dernière mise à jour : {formatDate(Math.floor(indexStatus.lastRun / 1000))}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accès rapides */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-slate-200 mb-3">Accès rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QuickLink icon="📁" label="Explorateur"   desc="Parcourir vos fichiers"     to="/explorer" />
            <QuickLink icon="🔍" label="Recherche"     desc="Trouver un fichier vite"    to="/search" />
            <QuickLink icon="🔁" label="Doublons"      desc="Libérer de l'espace"        to="/duplicates" />
            <QuickLink icon="💾" label="Espace disque" desc="Carte thermique de l'usage" to="/diskmap" />
            <QuickLink icon="⚙️"  label="Organisateur" desc="Trier automatiquement"      to="/organizer" />
            <QuickLink icon="✏️"  label="Renommage lot" desc="Renommer en masse"          to="/rename" />
            <QuickLink icon="🏠" label="Répertoire perso" desc="Aller au dossier personnel"
              onClick={async () => {
                const home = await window.kdlfiles.fs.homedir?.() || '/home';
                explorerNav(home);
                navigate('/explorer');
              }} />
          </div>
        </div>

        {/* Disques */}
        <div>
          <h2 className="font-semibold text-slate-200 mb-3">Volumes</h2>
          <div className="card space-y-4">
            {diskList.length === 0
              ? <p className="text-xs text-slate-600">Aucun volume détecté</p>
              : diskList.map(d => <DiskBar key={d.mount} disk={d} />)
            }
          </div>
        </div>
      </div>

      {/* Historique récent */}
      {recentOps.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-200 mb-3">Opérations récentes</h2>
          <div className="card divide-y divide-white/5 p-0 overflow-hidden">
            {recentOps.map(op => {
              const payload = typeof op.payload === 'string' ? JSON.parse(op.payload) : op.payload;
              const OP_ICONS = { copy: '📋', move: '→', delete: '🗑', rename: '✏️' };
              return (
                <div key={op.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">{OP_ICONS[op.op_type] || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">
                      {op.op_type === 'delete' ? payload.path : (payload.src || payload.path)}
                    </p>
                    {payload.dest && <p className="text-xs text-slate-600 truncate">→ {payload.dest}</p>}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{formatDate(Math.floor(new Date(op.created_at).getTime() / 1000))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
