import { useState, useEffect } from 'react';
import { org, fs } from '../api/ipc';

const FIELDS     = ['ext', 'type', 'name', 'size', 'modified'];
const OPERATORS  = ['eq', 'neq', 'in', 'contains', 'gt', 'lt', 'regex'];
const OP_LABELS  = { eq:'=', neq:'≠', in:'dans', contains:'contient', gt:'>', lt:'<', regex:'regex' };
const ACT_TYPES  = ['move', 'copy'];

function RuleRow({ rule, onSave, onDelete }) {
  const cond = typeof rule.condition === 'string' ? JSON.parse(rule.condition) : rule.condition || {};
  const act  = typeof rule.action    === 'string' ? JSON.parse(rule.action)    : rule.action    || {};

  const [field, setField]   = useState(cond.field    || 'ext');
  const [op,    setOp]      = useState(cond.operator || 'eq');
  const [val,   setVal]     = useState(Array.isArray(cond.value) ? cond.value.join(', ') : (cond.value || ''));
  const [atype, setAtype]   = useState(act.type || 'move');
  const [dest,  setDest]    = useState(act.dest || '');
  const [enabled, setEnabled] = useState(rule.enabled !== 0);
  const [saved, setSaved]   = useState(false);

  const handleSave = () => {
    const value = op === 'in' ? val.split(',').map(v => v.trim()) : val;
    onSave({ ...rule, enabled: enabled ? 1 : 0, condition: { field, operator: op, value }, action: { type: atype, dest } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const pickDest = async () => {
    const picked = await window.kdlfiles.fs.pickFolder();
    if (picked) setDest(picked);
  };

  const s = 'input text-xs py-1.5';

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border transition-colors ${
      enabled ? 'border-white/8 bg-dark-800/40' : 'border-white/4 bg-dark-900/40 opacity-60'
    }`}>
      {/* Activé */}
      <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-brand" />

      {/* Condition */}
      <select value={field} onChange={e => setField(e.target.value)} className={`${s} w-24`}>
        {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <select value={op} onChange={e => setOp(e.target.value)} className={`${s} w-24`}>
        {OPERATORS.map(o => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
      </select>
      <input value={val} onChange={e => setVal(e.target.value)}
        placeholder={op === 'in' ? 'val1, val2…' : 'valeur'} className={`${s} flex-1 min-w-20`} style={{ userSelect: 'text' }} />

      {/* Action */}
      <span className="text-xs text-slate-600">→</span>
      <select value={atype} onChange={e => setAtype(e.target.value)} className={`${s} w-20`}>
        {ACT_TYPES.map(t => <option key={t} value={t}>{t === 'move' ? 'Déplacer' : 'Copier'}</option>)}
      </select>
      <div className="flex flex-1 gap-1 min-w-32">
        <input value={dest} onChange={e => setDest(e.target.value)}
          placeholder="Dossier destination" className={`${s} flex-1`} style={{ userSelect: 'text' }} />
        <button onClick={pickDest} className="px-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-400 text-xs transition-colors">📁</button>
      </div>

      {/* Actions */}
      <button onClick={handleSave}
        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'btn-primary py-1'}`}>
        {saved ? '✓' : 'OK'}
      </button>
      <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors">✕</button>
    </div>
  );
}

export default function Organizer() {
  const [profiles, setProfiles]     = useState([]);
  const [activeProfile, setActive]  = useState(null);
  const [rules, setRules]           = useState([]);
  const [preview, setPreview]       = useState(null);
  const [running, setRunning]       = useState(false);
  const [newName, setNewName]       = useState('');
  const [dir, setDir]               = useState('');

  useEffect(() => { org.getProfiles().then(p => setProfiles(p || [])); }, []);

  const selectProfile = async (p) => {
    setActive(p);
    setPreview(null);
    const r = await org.getRules(p.id);
    setRules(r || []);
  };

  const createProfile = async () => {
    if (!newName.trim()) return;
    const p = await org.createProfile({ name: newName.trim(), description: '' });
    setProfiles(prev => [p, ...prev]);
    setNewName('');
    selectProfile(p);
  };

  const deleteProfile = async (id) => {
    await org.deleteProfile(id);
    setProfiles(p => p.filter(x => x.id !== id));
    if (activeProfile?.id === id) { setActive(null); setRules([]); }
  };

  const saveRule = async (rule) => {
    const saved = await org.saveRule({ ...rule, profile_id: activeProfile.id });
    setRules(r => rule.id ? r.map(x => x.id === rule.id ? saved : x) : [...r, saved]);
  };

  const deleteRule = async (id) => {
    await org.deleteRule(id);
    setRules(r => r.filter(x => x.id !== id));
  };

  const addRule = () => {
    setRules(r => [...r, { profile_id: activeProfile.id, enabled: 1,
      condition: { field: 'ext', operator: 'eq', value: '' },
      action: { type: 'move', dest: '' } }]);
  };

  const doPreview = async () => {
    if (!dir) {
      const picked = await window.kdlfiles.fs.pickFolder();
      if (!picked) return;
      setDir(picked);
      const res = await org.preview(activeProfile.id, picked);
      setPreview(res);
    } else {
      const res = await org.preview(activeProfile.id, dir);
      setPreview(res);
    }
  };

  const doRun = async () => {
    if (!dir) return;
    setRunning(true);
    await org.run(activeProfile.id, dir);
    setRunning(false);
    setPreview(null);
    setDir('');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar profils */}
      <div className="w-56 shrink-0 border-r border-white/5 bg-dark-900/30 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Profils</p>
          <div className="flex gap-1.5">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProfile()}
              placeholder="Nom…" className="input text-xs py-1.5 flex-1" style={{ userSelect: 'text' }} />
            <button onClick={createProfile} className="px-2 rounded-lg bg-brand/20 text-brand-light text-sm hover:bg-brand/30 transition-colors">+</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {profiles.map(p => (
            <div key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer group transition-colors ${
                activeProfile?.id === p.id ? 'bg-brand/20 border border-brand/20' : 'hover:bg-dark-700 border border-transparent'
              }`}
              onClick={() => selectProfile(p)}
            >
              <span className="flex-1 text-sm text-slate-300 truncate">{p.name}</span>
              <button onClick={e => { e.stopPropagation(); deleteProfile(p.id); }}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-rose-400 transition-all">✕</button>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">Aucun profil</p>
          )}
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeProfile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <p className="text-5xl mb-4">⚙️</p>
            <p className="text-sm">Sélectionnez ou créez un profil d'organisation</p>
          </div>
        ) : (
          <>
            {/* Header profil */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-dark-900/30">
              <p className="font-semibold text-slate-200">{activeProfile.name}</p>
              <p className="text-xs text-slate-500">{rules.length} règle(s)</p>
              <div className="flex-1" />

              {/* Dry-run */}
              <div className="flex gap-1.5">
                <input value={dir} onChange={e => setDir(e.target.value)}
                  placeholder="Dossier à organiser…"
                  className="input text-xs py-1.5 w-52" style={{ userSelect: 'text' }} />
                <button onClick={doPreview} className="btn-secondary text-xs py-1.5">Simuler</button>
                <button onClick={doRun} disabled={!dir || running}
                  className="btn-primary text-xs py-1.5">
                  {running ? '⏳ En cours…' : '▶ Exécuter'}
                </button>
              </div>
            </div>

            {/* Règles */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rules.map((rule, i) => (
                <RuleRow key={rule.id || `new-${i}`} rule={rule}
                  onSave={saveRule} onDelete={() => rule.id ? deleteRule(rule.id) : setRules(r => r.filter((_, j) => j !== i))} />
              ))}
              <button onClick={addRule} className="w-full py-2 rounded-xl border border-dashed border-white/10 text-xs text-slate-500 hover:text-slate-300 hover:border-brand/30 transition-colors">
                + Ajouter une règle
              </button>
            </div>

            {/* Résultat dry-run */}
            {preview && (
              <div className="shrink-0 max-h-48 overflow-y-auto border-t border-white/5 bg-dark-900/50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Simulation — {preview.length} opération(s)
                </p>
                {preview.length === 0
                  ? <p className="text-xs text-slate-600">Aucun fichier concerné par ces règles</p>
                  : preview.map((op, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                      <span className={op.action === 'move' ? 'text-amber-400' : 'text-cyan-400'}>{op.action === 'move' ? '→' : '⊕'}</span>
                      <span className="text-slate-400 truncate flex-1">{op.src}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-400 truncate flex-1">{op.dest}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
