import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { disks, fs } from '../api/ipc';

function formatSize(bytes) {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

// ── Treemap D3 ──────────────────────────────────────────────────────────────
function Treemap({ data, width, height, onNodeClick }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !width || !height) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const root = d3.hierarchy(data)
      .sum(d => d.size || 0)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(4)
      .round(true)(root);

    const color = d3.scaleOrdinal()
      .domain(['image','video','audio','doc','archive','code','other','folder'])
      .range(['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#64748b','#3b82f6']);

    const cell = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cell.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill',   d => color(d.data.type || 'other'))
      .attr('rx', 4)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function() { d3.select(this).attr('opacity', 1); })
      .on('mouseleave', function() { d3.select(this).attr('opacity', 0.8); })
      .on('click', (_, d) => onNodeClick?.(d.data));

    // Labels (si assez grand)
    cell.filter(d => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 24)
      .append('text')
      .attr('x', 5)
      .attr('y', 15)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('font-size', 11)
      .attr('pointer-events', 'none')
      .text(d => {
        const w   = d.x1 - d.x0;
        const name = d.data.name || '';
        const max  = Math.floor(w / 7);
        return name.length > max ? name.slice(0, max - 1) + '…' : name;
      });

    cell.filter(d => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 38)
      .append('text')
      .attr('x', 5)
      .attr('y', 28)
      .attr('fill', 'rgba(255,255,255,0.55)')
      .attr('font-size', 9)
      .attr('pointer-events', 'none')
      .text(d => formatSize(d.data.size));

  }, [data, width, height, onNodeClick]);

  return <svg ref={svgRef} width={width} height={height} />;
}

// ── Page DiskMap ─────────────────────────────────────────────────────────────
export default function DiskMap() {
  const containerRef = useRef();
  const [dims,      setDims]      = useState({ w: 0, h: 0 });
  const [diskList,  setDiskList]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis,  setAnalysis]  = useState(null);
  const [tooltip,   setTooltip]   = useState(null);

  // Charger les disques
  useEffect(() => {
    disks.list().then(d => setDiskList(d || []));
  }, []);

  // Observer la taille du conteneur pour la treemap
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const analyze = async (disk) => {
    setSelected(disk);
    setAnalyzing(true);
    setAnalysis(null);
    const result = await disks.analyze(disk.mount);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleNodeClick = (node) => {
    if (node.isDir) {
      // On pourrait re-analyser ce sous-dossier
    } else {
      fs.showInFolder(node.path);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar disques */}
      <div className="w-56 shrink-0 border-r border-white/5 bg-dark-900/30 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Volumes</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {diskList.map(disk => {
            const pct = disk.total ? Math.round(disk.used / disk.total * 100) : 0;
            const isSel = selected?.mount === disk.mount;
            return (
              <button
                key={disk.mount}
                onClick={() => analyze(disk)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                  isSel ? 'bg-brand/20 border border-brand/30' : 'hover:bg-dark-700 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💾</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-300 truncate">{disk.name || disk.mount}</p>
                    <p className="text-[10px] text-slate-600">{disk.mount}</p>
                  </div>
                </div>
                {disk.total > 0 && (
                  <>
                    <div className="w-full bg-dark-700 rounded-full h-1 mb-1">
                      <div
                        className={`h-1 rounded-full ${pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-brand'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600">{formatSize(disk.free)} libres</p>
                  </>
                )}
              </button>
            );
          })}

          <button
            onClick={async () => {
              const picked = await window.kdlfiles.fs.pickFolder();
              if (picked) analyze({ mount: picked, name: picked });
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-dark-700 transition-colors border border-dashed border-white/10"
          >
            + Choisir un dossier
          </button>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && !analyzing && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <p className="text-5xl mb-4">💾</p>
            <p className="text-sm">Sélectionnez un volume pour visualiser l'espace disque</p>
          </div>
        )}

        {analyzing && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="w-10 h-10 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
            <p className="text-sm">Analyse en cours de {selected?.name}…</p>
          </div>
        )}

        {analysis && !analyzing && (
          <>
            {/* Stats barre */}
            <div className="shrink-0 flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-dark-900/30">
              <p className="font-semibold text-slate-200 text-sm">{selected?.name || selected?.mount}</p>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Total : <strong className="text-slate-300">{formatSize(analysis.total)}</strong></span>
                <span>Utilisé : <strong className="text-rose-400">{formatSize(analysis.used)}</strong></span>
                <span>Libre : <strong className="text-emerald-400">{formatSize(analysis.free)}</strong></span>
                <span>{analysis.fileCount?.toLocaleString()} fichiers analysés</span>
              </div>
            </div>

            {/* Treemap + Top 20 */}
            <div className="flex flex-1 overflow-hidden gap-0">
              {/* Treemap */}
              <div ref={containerRef} className="flex-1 overflow-hidden bg-dark-950/50 p-2">
                {dims.w > 0 && analysis.tree && (
                  <Treemap
                    data={analysis.tree}
                    width={dims.w - 16}
                    height={dims.h - 16}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </div>

              {/* Top 20 fichiers */}
              {analysis.top20?.length > 0 && (
                <div className="w-72 shrink-0 border-l border-white/5 bg-dark-900/30 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Top 20 fichiers</p>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                    {analysis.top20.map((f, i) => (
                      <div key={f.path} className="flex items-center gap-2 px-3 py-2.5 hover:bg-dark-800/50 transition-colors group">
                        <span className="text-xs text-slate-600 w-5 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-300 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{f.path}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-rose-400">{formatSize(f.size)}</p>
                        </div>
                        <button
                          onClick={() => fs.showInFolder(f.path)}
                          className="text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all text-sm"
                        >📁</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Légende types */}
            <div className="shrink-0 flex flex-wrap gap-3 px-4 py-2 border-t border-white/5 bg-dark-900/30">
              {[
                { type: 'image',   color: '#6366f1', label: 'Images' },
                { type: 'video',   color: '#8b5cf6', label: 'Vidéos' },
                { type: 'audio',   color: '#06b6d4', label: 'Audio' },
                { type: 'doc',     color: '#10b981', label: 'Documents' },
                { type: 'archive', color: '#f59e0b', label: 'Archives' },
                { type: 'code',    color: '#ef4444', label: 'Code' },
                { type: 'other',   color: '#64748b', label: 'Autres' },
              ].map(item => (
                <div key={item.type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
