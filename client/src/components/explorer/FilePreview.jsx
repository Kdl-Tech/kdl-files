import { useEffect, useState } from 'react';
import FileIcon from './FileIcon';
import { fs, tags as tagsApi } from '../../api/ipc';
import useExplorerStore from '../../store/useExplorerStore';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','tiff'];
const TEXT_EXTS  = ['txt','md','json','yaml','yml','log','sh','csv','js','ts','py','html','css','xml','sql','ini','env'];

export default function FilePreview() {
  const { previewFile } = useExplorerStore();
  const [thumbnail, setThumbnail] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [fileTags, setFileTags] = useState([]);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    setThumbnail(null);
    setTextContent(null);
    setFileTags([]);
    setMeta(null);

    if (!previewFile) return;

    // Chargement asynchrone du contenu
    if (!previewFile.isDir && IMAGE_EXTS.includes(previewFile.ext)) {
      fs.thumbnail(previewFile.path).then(setThumbnail);
    } else if (!previewFile.isDir && TEXT_EXTS.includes(previewFile.ext)) {
      fs.readText(previewFile.path).then(r => setTextContent(r?.content?.slice(0, 1500) ?? null));
    }

    // Tags et métadonnées
    tagsApi.getFile(previewFile.path).then(data => {
      if (data) {
        setFileTags(data.tags || []);
        setMeta(data.meta || null);
      }
    });
  }, [previewFile?.path]);

  if (!previewFile) {
    return (
      <aside className="w-64 shrink-0 border-l border-white/5 bg-dark-900/30 flex flex-col items-center justify-center text-slate-600 text-center p-4">
        <p className="text-4xl mb-3">👆</p>
        <p className="text-xs">Sélectionnez un fichier<br/>pour voir l'aperçu</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-l border-white/5 bg-dark-900/30 flex flex-col overflow-hidden">
      {/* Miniature / Icône */}
      <div className="flex items-center justify-center bg-dark-800/50 border-b border-white/5 p-4 shrink-0" style={{ minHeight: 140 }}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className="max-w-full max-h-32 rounded-lg object-contain shadow-lg" />
        ) : (
          <FileIcon file={previewFile} size="lg" />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Nom */}
        <div>
          <p className="text-sm font-semibold text-slate-200 break-all leading-tight">{previewFile.name}</p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{previewFile.isDir ? 'Dossier' : (previewFile.type || previewFile.ext || '—')}</p>
        </div>

        {/* Métadonnées */}
        <div className="space-y-2">
          {!previewFile.isDir && (
            <Row label="Taille" value={formatSize(previewFile.size)} />
          )}
          <Row label="Modifié"  value={formatDate(previewFile.modified)} />
          <Row label="Créé"     value={formatDate(previewFile.created)} />
          {previewFile.ext && <Row label="Extension" value={`.${previewFile.ext}`} />}
        </div>

        {/* Tags */}
        {fileTags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {fileTags.map(t => (
                <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: t.color + '33', border: `1px solid ${t.color}55`, color: t.color }}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Étoiles */}
        {meta?.stars > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Note</p>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < meta.stars ? 'text-amber-400' : 'text-slate-700'}>★</span>
              ))}
            </div>
          </div>
        )}

        {/* Note textuelle */}
        {meta?.note && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Note</p>
            <p className="text-xs text-slate-400 break-words" style={{ userSelect: 'text' }}>{meta.note}</p>
          </div>
        )}

        {/* Aperçu texte */}
        {textContent && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Aperçu</p>
            <pre className="text-[10px] text-slate-400 bg-dark-800/50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all"
                 style={{ userSelect: 'text', maxHeight: 200, overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
              {textContent}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs text-slate-300 text-right break-all">{value}</span>
    </div>
  );
}
