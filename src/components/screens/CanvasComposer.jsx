import React, { useState, useEffect, useMemo } from 'react';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

function DebouncedInput({ value, onChange, className, placeholder }) {
  const [localVal, setLocalVal] = useState(value || '');
  
  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  return (
    <input
      type="text"
      placeholder={placeholder}
      className={className}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== (value || '')) onChange(localVal);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
           e.target.blur();
        }
      }}
    />
  );
}

// ─── Numerical Section: Tile Picker ──────────────────────────────────────────
function NumericalEditor({
  canvas, activeQ, criteriaTables, parseNumericalData,
  setCanvasConfigs, setActiveComposerQuestionId,
  startGame, setActiveGameMode, setIsPreviewMode
}) {
  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState({});

  // Flatten all numerical tiles from the chapter tables, preserving full context
  const allNumericalTiles = useMemo(() => {
    const tiles = [];
    (criteriaTables || []).filter(t => t.chapter === canvas.chapter).forEach(table => {
      let lastHeading = '';
      (table.rows || []).forEach(row => {
        if (row.isHeading) {
          lastHeading = (row.cells || []).map(c => c.text).filter(Boolean).join(' / ');
          return;
        }
        (row.cells || []).forEach(cell => {
          (cell.tiles || []).forEach(tile => {
            const allItems = [tile, ...(tile.subtiles || [])];
            allItems.forEach(item => {
              const parsed = parseNumericalData && parseNumericalData(item.label);
              if (parsed) {
                tiles.push({
                  tileId: item.id,
                  label: item.label,
                  parsed,
                  criterionText: cell.text || '',
                  headingText: lastHeading,
                  tableName: table.name,
                  tableId: table.id,
                });
              }
            });
          });
        });
      });
    });
    return tiles;
  }, [criteriaTables, canvas.chapter]);

  // Group by table → heading for the picker
  const grouped = useMemo(() => {
    const groups = {};
    allNumericalTiles.forEach(t => {
      if (!groups[t.tableId]) groups[t.tableId] = { tableName: t.tableName, tableId: t.tableId, headings: {} };
      const hk = t.headingText || '__root__';
      if (!groups[t.tableId].headings[hk]) groups[t.tableId].headings[hk] = { headingText: t.headingText, tiles: [] };
      groups[t.tableId].headings[hk].tiles.push(t);
    });
    return Object.values(groups).map(g => ({ ...g, headings: Object.values(g.headings) }));
  }, [allNumericalTiles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.map(g => ({
      ...g,
      headings: g.headings.map(h => ({
        ...h,
        tiles: h.tiles.filter(t =>
          t.label.toLowerCase().includes(q) ||
          t.criterionText.toLowerCase().includes(q) ||
          t.headingText.toLowerCase().includes(q) ||
          t.tableName.toLowerCase().includes(q)
        )
      })).filter(h => h.tiles.length > 0)
    })).filter(g => g.headings.length > 0);
  }, [grouped, search]);

  const targetTileId = activeQ?.targetTileId || null;
  const decoyTileIds = activeQ?.decoyTileIds || [];

  const getTileRole = (tileId) => {
    if (tileId === targetTileId) return 'target';
    if (decoyTileIds.includes(tileId)) return 'decoy';
    return null;
  };

  const handleTileClick = (tileId) => {
    if (!activeQ) return;
    setCanvasConfigs(prev => prev.map(c => {
      if (c.id !== canvas.id) return c;
      return {
        ...c,
        questions: c.questions.map(q => {
          if (q.id !== activeQ.id) return q;
          const role = getTileRole(tileId);
          if (role === 'target') {
            // Deselect target
            return { ...q, targetTileId: null };
          }
          if (role === 'decoy') {
            // Remove from decoys
            return { ...q, decoyTileIds: (q.decoyTileIds || []).filter(id => id !== tileId) };
          }
          // Not selected — assign role
          if (!q.targetTileId) {
            // Set as target, auto-build prompt
            const tileObj = allNumericalTiles.find(t => t.tileId === tileId);
            let autoPrompt = q.prompt || '';
            if (!autoPrompt && tileObj) {
              const parts = [tileObj.tableName];
              if (tileObj.headingText && tileObj.headingText !== tileObj.tableName) parts.push(tileObj.headingText);
              if (tileObj.criterionText && tileObj.criterionText !== tileObj.headingText) parts.push(tileObj.criterionText);
              if (tileObj.parsed?.redacted) parts.push(tileObj.parsed.redacted);
              autoPrompt = parts.filter(Boolean).join(' — ');
            }
            return { ...q, targetTileId: tileId, prompt: autoPrompt };
          }
          if ((q.decoyTileIds || []).length < 3) {
            return { ...q, decoyTileIds: [...(q.decoyTileIds || []), tileId] };
          }
          return q; // max 3 decoys reached
        })
      };
    }));
  };

  const autoMatchDecoys = () => {
    if (!activeQ?.targetTileId) return;
    const target = allNumericalTiles.find(t => t.tileId === activeQ.targetTileId);
    if (!target) return;
    const exclude = new Set([activeQ.targetTileId, ...(activeQ.decoyTileIds || [])]);
    const needed = 3 - (activeQ.decoyTileIds || []).length;
    if (needed <= 0) return;

    let pool = allNumericalTiles.filter(t => {
      if (exclude.has(t.tileId)) return false;
      return t.parsed?.unitKey === target.parsed?.unitKey;
    });
    if (pool.length < needed) {
      pool = allNumericalTiles.filter(t => {
        if (exclude.has(t.tileId)) return false;
        return t.parsed?.suffix === target.parsed?.suffix;
      });
    }
    if (pool.length < needed) {
      pool = allNumericalTiles.filter(t => !exclude.has(t.tileId));
    }
    const picked = pool.sort(() => Math.random() - 0.5).slice(0, needed);
    setCanvasConfigs(prev => prev.map(c => {
      if (c.id !== canvas.id) return c;
      return {
        ...c,
        questions: c.questions.map(q => {
          if (q.id !== activeQ.id) return q;
          return { ...q, decoyTileIds: [...(q.decoyTileIds || []), ...picked.map(p => p.tileId)] };
        })
      };
    }));
  };

  const clearQuestion = () => {
    setCanvasConfigs(prev => prev.map(c => {
      if (c.id !== canvas.id) return c;
      return {
        ...c,
        questions: c.questions.map(q =>
          q.id === activeQ?.id ? { ...q, targetTileId: null, decoyTileIds: [], prompt: '' } : q
        )
      };
    }));
  };

  const targetObj = allNumericalTiles.find(t => t.tileId === targetTileId);
  const decoyObjs = (decoyTileIds || []).map(id => allNumericalTiles.find(t => t.tileId === id)).filter(Boolean);
  const isComplete = !!targetTileId && decoyObjs.length >= 3;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Active Question Config Panel ─────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 shadow-sm">
        {/* Prompt & Subheading */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest w-24 flex-shrink-0">Question:</span>
            <DebouncedInput
              placeholder={targetObj
                ? `${targetObj.tableName} — ${targetObj.headingText ? targetObj.headingText + ' — ' : ''}${targetObj.criterionText ? targetObj.criterionText + ' — ' : ''}${targetObj.parsed?.redacted}`
                : 'Auto-generated from selected target tile'
              }
              value={activeQ?.prompt || ''}
              onChange={val => setCanvasConfigs(prev => prev.map(c => {
                if (c.id !== canvas.id) return c;
                return { ...c, questions: c.questions.map(q => q.id === activeQ?.id ? { ...q, prompt: val } : q) };
              }))}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest w-24 flex-shrink-0">Subheading:</span>
            <DebouncedInput
              placeholder="e.g. Select the correct numerical value"
              value={activeQ?.subheading || ''}
              onChange={val => setCanvasConfigs(prev => prev.map(c => {
                if (c.id !== canvas.id) return c;
                return { ...c, questions: c.questions.map(q => q.id === activeQ?.id ? { ...q, subheading: val } : q) };
              }))}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>
        </div>

        {/* 4-slot card row: Target + 3 Decoys */}
        <div className="grid grid-cols-4 gap-2">
          {/* Target */}
          <div>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">🎯 Answer</p>
            <div
              onClick={() => targetObj && handleTileClick(targetObj.tileId)}
              className={`rounded-xl border-2 p-2.5 flex flex-col items-center justify-center min-h-[70px] cursor-pointer transition-all ${
                targetObj
                  ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 shadow-md'
                  : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-amber-400'
              }`}
            >
              {targetObj ? (
                <>
                  <span className="text-xl font-black leading-none">{targetObj.parsed?.number}</span>
                  {targetObj.parsed?.suffix && <span className="text-[9px] font-bold text-emerald-100 mt-0.5">{targetObj.parsed.suffix}</span>}
                  <span className="text-[7px] font-black text-emerald-200 mt-1 uppercase">tap to clear</span>
                </>
              ) : (
                <span className="text-[8px] font-black uppercase text-center leading-tight">tap a tile<br/>below</span>
              )}
            </div>
          </div>

          {/* 3 Decoys */}
          {[0, 1, 2].map(di => {
            const decoy = decoyObjs[di];
            return (
              <div key={di}>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">❌ Decoy {di + 1}</p>
                <div
                  onClick={() => decoy && handleTileClick(decoy.tileId)}
                  className={`rounded-xl border-2 p-2.5 flex flex-col items-center justify-center min-h-[70px] cursor-pointer transition-all ${
                    decoy
                      ? 'bg-slate-700 border-slate-600 text-white hover:bg-rose-700 hover:border-rose-600 shadow-md'
                      : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {decoy ? (
                    <>
                      <span className="text-xl font-black leading-none">{decoy.parsed?.number}</span>
                      {decoy.parsed?.suffix && <span className="text-[9px] font-bold text-slate-300 mt-0.5">{decoy.parsed.suffix}</span>}
                      <span className="text-[7px] font-black text-slate-400 mt-1 uppercase">tap to clear</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black uppercase text-center leading-tight text-slate-300">empty</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {targetObj && decoyObjs.length < 3 && (
            <button onClick={autoMatchDecoys}
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase rounded-lg transition-all shadow-sm">
              ⚡ Auto-fill {3 - decoyObjs.length} Decoy{3 - decoyObjs.length !== 1 ? 's' : ''}
            </button>
          )}
          {(targetObj || decoyObjs.length > 0) && (
            <button onClick={clearQuestion}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 font-black text-[9px] uppercase rounded-lg transition-all">
              Clear
            </button>
          )}
          {isComplete && (
            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
              ✓ Ready
            </span>
          )}
        </div>
      </div>

      {/* ── Bottom: Scrollable Tile Picker ───────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-100">
        {/* Search bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search numerical tiles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-xs font-bold bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700 text-xs font-black">✕</button>
          )}
          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {allNumericalTiles.length} tiles
          </span>
        </div>

        {allNumericalTiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <span className="text-4xl block mb-3">🔢</span>
              <p className="text-sm font-black text-slate-600 mb-1">No numerical tiles found</p>
              <p className="text-[11px] text-slate-400">Add tiles with numbers (e.g. "38°C", "120 mmHg") to your chapter's criteria tables first.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filtered.map(group => {
              const isExpanded = expandedTables[group.tableId] !== false; // default expanded
              return (
                <div key={group.tableId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Table header */}
                  <button
                    onClick={() => setExpandedTables(p => ({ ...p, [group.tableId]: !isExpanded }))}
                    className="w-full px-4 py-2.5 flex justify-between items-center bg-indigo-50 hover:bg-indigo-100 transition-colors border-b border-indigo-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">📋 {group.tableName}</span>
                      <span className="text-[9px] font-black text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                        {group.headings.reduce((s, h) => s + h.tiles.length, 0)} nums
                      </span>
                    </div>
                    <span className={`text-indigo-400 text-xs font-black transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100">
                      {group.headings.map((heading, hi) => (
                        <div key={hi}>
                          {heading.headingText && (
                            <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{heading.headingText}</p>
                            </div>
                          )}
                          <div className="p-3 grid grid-cols-1 gap-2">
                            {heading.tiles.map(tile => {
                              const role = getTileRole(tile.tileId);
                              const isTarget = role === 'target';
                              const isDecoy = role === 'decoy';
                              const isMaxed = !role && decoyObjs.length >= 3 && !!targetTileId;

                              return (
                                <button
                                  key={tile.tileId}
                                  onClick={() => !isMaxed && handleTileClick(tile.tileId)}
                                  disabled={isMaxed}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                                    isTarget
                                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-md hover:bg-emerald-600'
                                      : isDecoy
                                      ? 'bg-slate-700 border-slate-600 text-white shadow-md hover:bg-rose-700 hover:border-rose-600'
                                      : isMaxed
                                      ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm'
                                  }`}
                                >
                                  {/* Number chip */}
                                  <div className={`flex flex-col items-center justify-center rounded-lg w-12 h-12 flex-shrink-0 border ${
                                    isTarget ? 'bg-emerald-600 border-emerald-500'
                                    : isDecoy ? 'bg-slate-800 border-slate-600'
                                    : 'bg-amber-50 border-amber-200'
                                  }`}>
                                    <span className={`text-base font-black leading-none ${isTarget || isDecoy ? 'text-white' : 'text-amber-600'}`}>
                                      {tile.parsed?.number}
                                    </span>
                                    {tile.parsed?.suffix && (
                                      <span className={`text-[8px] font-bold leading-tight ${isTarget ? 'text-emerald-200' : isDecoy ? 'text-slate-400' : 'text-slate-400'}`}>
                                        {tile.parsed.suffix}
                                      </span>
                                    )}
                                  </div>

                                  {/* Context text */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] font-black leading-tight truncate ${isTarget || isDecoy ? 'text-white' : 'text-slate-800'}`}>
                                      {tile.label}
                                    </p>
                                    {tile.criterionText && (
                                      <p className={`text-[9px] font-medium leading-tight truncate mt-0.5 ${isTarget ? 'text-emerald-200' : isDecoy ? 'text-slate-400' : 'text-slate-400'}`}>
                                        {tile.criterionText}
                                      </p>
                                    )}
                                  </div>

                                  {/* Role badge */}
                                  {isTarget && <span className="text-[8px] font-black bg-emerald-600 text-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">Target</span>}
                                  {isDecoy && <span className="text-[8px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full flex-shrink-0 uppercase">Decoy</span>}
                                  {!role && !isMaxed && !targetTileId && (
                                    <span className="text-[8px] font-black text-amber-500 flex-shrink-0">→ Target</span>
                                  )}
                                  {!role && !isMaxed && !!targetTileId && decoyObjs.length < 3 && (
                                    <span className="text-[8px] font-black text-slate-400 flex-shrink-0">+ Decoy</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ODD ONE OUT Section (unchanged logic, cleaned up) ────────────────────────
function OddOneOutEditor({ canvas, activeQ, criteriaTables, allTableTiles, setCanvasConfigs, canvasConfigs }) {
  const correctTileObjs = (activeQ?.correctTileIds || []).map(id => allTableTiles.find(t => t.id === id)).filter(Boolean);
  const distractorObj = activeQ?.distractorTileId ? allTableTiles.find(t => t.id === activeQ.distractorTileId) : null;

  const swapDistractor = () => {
    const correctSet = new Set(activeQ?.correctTileIds || []);
    const correctCellIds = new Set(correctTileObjs.map(t => t.cellId));
    
    const hasSubtileTargets = correctTileObjs.some(t => t.parentId !== null);
    const hasMainTileTargets = correctTileObjs.some(t => t.parentId === null);

    const otherCanvasQIds = new Set(
      (canvasConfigs || []).filter(c => c.chapter === canvas.chapter && (!c.type || c.type === 'CANVAS'))
        .flatMap(c => c.questions.filter(q => !q.selectedTileIds?.some(id => correctSet.has(id))).flatMap(q => q.selectedTileIds || []))
    );
    
    const filterDistractor = (t) => {
      if (correctSet.has(t.id)) return false;
      if (correctCellIds.has(t.cellId)) return false;
      if (hasSubtileTargets && !hasMainTileTargets && t.parentId === null) return false;
      if (hasMainTileTargets && !hasSubtileTargets && t.parentId !== null) return false;
      return true;
    };

    const preferred = allTableTiles.filter(t => otherCanvasQIds.has(t.id) && filterDistractor(t));
    const fallback = allTableTiles.filter(t => filterDistractor(t));
    const pool = preferred.length ? preferred : fallback;
    if (!pool.length) return alert('No valid distractors found that satisfy hierarchy/cell rules.');
    
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : {
      ...c, questions: c.questions.map(q => q.id !== activeQ?.id ? q : { ...q, distractorTileId: pick.id })
    }));
  };

  return (
    <div className="col-span-full space-y-3">
      {activeQ?.sourceCanvasQuestionId && (
        <div className="bg-indigo-950/40 border border-indigo-700/30 rounded-lg px-3 py-1.5">
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
            Source: Canvas Q — {activeQ.prompt || 'Auto-generated from canvas question'}
          </p>
        </div>
      )}
      <div>
        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">
          ✅ Correct Tiles ({correctTileObjs.length}) — these all belong together
        </p>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {correctTileObjs.length === 0 ? (
            <span className="text-[9px] text-slate-500 italic">None yet — tap tiles in the tables below, or click 🎲 Auto-Generate</span>
          ) : correctTileObjs.map(tile => (
            <div key={tile.id} className="flex items-center gap-1 bg-emerald-700/60 border border-emerald-500/40 text-emerald-100 px-2 py-1 rounded-lg">
              <span className="text-[10px] font-bold">{tile.label}</span>
              <button onClick={() => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : {
                ...c, questions: c.questions.map(q => q.id !== activeQ?.id ? q : { ...q, correctTileIds: (q.correctTileIds || []).filter(id => id !== tile.id) })
              }))} className="text-rose-400 hover:text-rose-200 font-black text-[9px] ml-0.5">✕</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">
          ❌ Odd One Out (Distractor) — player must tap this
        </p>
        <div className="flex items-center gap-3">
          <div className={`flex-1 rounded-xl border-2 p-2.5 flex items-center justify-between transition-all ${distractorObj ? 'bg-rose-700/60 border-rose-500/60 text-white' : 'bg-slate-800/50 border-dashed border-slate-600 text-slate-500'}`}>
            {distractorObj ? (
              <>
                <span className="text-sm font-black">{distractorObj.label}</span>
                <button onClick={() => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : {
                  ...c, questions: c.questions.map(q => q.id !== activeQ?.id ? q : { ...q, distractorTileId: null })
                }))} className="text-rose-300 hover:text-white text-[9px] font-black">✕ clear</button>
              </>
            ) : <span className="text-[9px] font-black uppercase">tap a tile below to set distractor</span>}
          </div>
          <button onClick={swapDistractor}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] uppercase rounded-lg shadow-sm transition-all whitespace-nowrap">
            🔀 Swap
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CanvasComposer ──────────────────────────────────────────────────────
export default function CanvasComposer({
  canvasConfigs, setCanvasConfigs,
  selectedCanvasId,
  criteriaTables,
  activeComposerQuestionId, setActiveComposerQuestionId,
  parseNumericalData,
  startGame, setActiveGameMode, setIsPreviewMode,
  expandedNodes, setExpandedNodes
}) {
  // ── ALL HOOKS MUST COME FIRST — before any early returns ─────────────────
  const canvas = (canvasConfigs || []).find(c => c.id === selectedCanvasId) || null;

  // All table tiles for CANVAS / ODD_ONE_OUT (safe when canvas is null)
  const allTableTiles = useMemo(() => {
    if (!canvas) return [];
    return (criteriaTables || []).filter(t => t.chapter === canvas.chapter)
      .flatMap(t => (t.rows || []).filter(r => !r.isHeading)
        .flatMap(r => (r.cells || []).flatMap((c, cellIdx) => (c.tiles || []).flatMap(tile => {
          const baseTile = { ...tile, cellId: `${r.id}_${cellIdx}`, parentId: null };
          const subs = (tile.subtiles || []).map(sub => ({ ...sub, cellId: `${r.id}_${cellIdx}`, parentId: tile.id }));
          return [baseTile, ...subs];
        }))));
  }, [criteriaTables, canvas?.chapter, canvas]);

  // ── After all hooks — safe to early return ────────────────────────────────
  if (!canvas) return null;

  const type = canvas.type || 'CANVAS';
  const activeQ = canvas.questions?.find(q => q.id === activeComposerQuestionId) || canvas.questions?.[0];

  // ── Auto-generate ─────────────────────────────────────────────────────────
  const autoGenerateArcadeConfig = (canvasId) => {
    const canvasObj = (canvasConfigs || []).find(c => c.id === canvasId);
    if (!canvasObj) return;

    const tables = (criteriaTables || []).filter(t => t.chapter === canvasObj.chapter);
    const allTiles = [];
    tables.forEach(t => {
      let lastHeadingText = '';
      (t.rows || []).forEach(r => {
        if (r.isHeading) {
          lastHeadingText = (r.cells || []).map(c => c.text).filter(Boolean).join(' / ');
          return;
        }
        (r.cells || []).forEach((c, cellIdx) => {
          (c.tiles || []).forEach(tile => {
            const base = { tileId: tile.id, label: tile.label, criterionFullText: c.text || '', criterionCategory: t.name || '', headingText: lastHeadingText, tableName: t.name || '', cellId: `${r.id}_${cellIdx}`, parentId: null };
            allTiles.push(base);
            (tile.subtiles || []).forEach(s => allTiles.push({ ...base, tileId: s.id, label: s.label, parentId: tile.id }));
          });
        });
      });
    });

    let generatedQuestions = [];

    if (canvasObj.type === 'NUMERICAL') {
      const numTiles = allTiles.filter(t => parseNumericalData && parseNumericalData(t.label));
      if (numTiles.length < 4) return alert('Not enough numerical tiles in this chapter (Need at least 4).');

      const findAutoDistractors = (target) => {
        const targetData = parseNumericalData(target.label);
        if (!targetData) return [];
        const exclude = new Set([target.tileId]);
        // Strict matching: unitKey or suffix
        let pool = numTiles.filter(t => { 
          if (exclude.has(t.tileId)) return false; 
          const d = parseNumericalData(t.label); 
          return d && (d.unitKey === targetData.unitKey || d.suffix === targetData.suffix); 
        });
        return pool.sort(() => Math.random() - 0.5).slice(0, 3);
      };

      const buildStem = (tile, data) => {
        const parts = [tile.criterionCategory];
        if (tile.headingText && tile.headingText !== tile.criterionCategory) parts.push(tile.headingText);
        if (tile.criterionFullText && tile.criterionFullText !== tile.headingText) parts.push(tile.criterionFullText);
        parts.push(data?.redacted || tile.label);
        return parts.filter(Boolean).join(' — ');
      };

      const validTargets = numTiles.filter(t => findAutoDistractors(t).length >= 3);
      if (validTargets.length === 0) {
        return alert('Need more data! You need at least 4 numericals which match the exact suffix/unit to auto-generate.');
      }

      const usedTargetIds = new Set();
      const count = Math.min(validTargets.length, 20); // generate up to 20 questions or however many tiles exist
      for (let i = 0; i < count; i++) {
        const available = validTargets.filter(t => !usedTargetIds.has(t.tileId));
        if (!available.length) break;
        const target = available[Math.floor(Math.random() * available.length)];
        usedTargetIds.add(target.tileId);
        const targetData = parseNumericalData(target.label);
        const distractors = findAutoDistractors(target);
        generatedQuestions.push({
          id: uid('cq'),
          prompt: buildStem(target, targetData),
          subheading: 'Select the correct numerical value',
          targetTileId: target.tileId,
          decoyTileIds: distractors.map(d => d.tileId)
        });
      }
    } else if (canvasObj.type === 'ODD_ONE_OUT') {
      const chapterCanvases = (canvasConfigs || []).filter(c => c.chapter === canvasObj.chapter && (!c.type || c.type === 'CANVAS'));
      const playableQs = chapterCanvases.flatMap(c =>
        (c.questions || []).filter(q => q.selectedTileIds && q.selectedTileIds.length >= 2).map(q => ({ canvasName: c.name, question: q }))
      );
      if (playableQs.length === 0) return alert('No Canvas questions with ≥2 tiles found in this chapter.');

      const usedQIds = new Set();
      for (const { canvasName, question: srcQ } of playableQs) {
        if (usedQIds.has(srcQ.id)) continue;
        usedQIds.add(srcQ.id);
        const correctIds = srcQ.selectedTileIds || [];
        const correctObjs = correctIds.map(id => allTiles.find(t => t.tileId === id)).filter(Boolean);
        const correctCellIds = new Set(correctObjs.map(t => t.cellId));
        const hasSub = correctObjs.some(t => t.parentId !== null);
        const hasMain = correctObjs.some(t => t.parentId === null);

        const otherQIds = new Set(playableQs.filter(pq => pq.question.id !== srcQ.id).flatMap(pq => pq.question.selectedTileIds || []));
        
        const filterD = (t) => {
          if (correctIds.includes(t.tileId)) return false;
          if (correctCellIds.has(t.cellId)) return false;
          if (hasSub && !hasMain && t.parentId === null) return false;
          if (hasMain && !hasSub && t.parentId !== null) return false;
          return true;
        };

        const distractorPool = allTiles.filter(t => otherQIds.has(t.tileId) && filterD(t));
        const fallback = allTiles.filter(t => filterD(t));
        const pool = distractorPool.length ? distractorPool : fallback;
        if (!pool.length) continue;
        const distractor = pool[Math.floor(Math.random() * pool.length)];
        generatedQuestions.push({
          id: uid('cq'),
          prompt: srcQ.prompt || `${canvasName}: Which tile does NOT belong here?`,
          subheading: 'Tap the tile that does NOT fit this category',
          correctTileIds: correctIds,
          distractorTileId: distractor.tileId,
          sourceCanvasQuestionId: srcQ.id
        });
      }
      if (generatedQuestions.length === 0) return alert('Could not generate Odd-One-Out questions.');
    }

    if (generatedQuestions.length > 0) {
      setCanvasConfigs(p => p.map(c => c.id === canvasId ? { ...c, questions: generatedQuestions } : c));
      setActiveComposerQuestionId(generatedQuestions[0].id);
    }
  };

  const toggleTileInCanvas = (tileId, canvasId, questionId) => {
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        questions: (c.questions || []).map(q => {
          if (q.id !== questionId) return q;
          if (!c.type || c.type === 'CANVAS') {
            const ids = q.selectedTileIds || [];
            return { ...q, selectedTileIds: ids.includes(tileId) ? ids.filter(i => i !== tileId) : [...ids, tileId] };
          } else if (c.type === 'ODD_ONE_OUT') {
            if ((q.correctTileIds || []).includes(tileId)) return { ...q, correctTileIds: q.correctTileIds.filter(i => i !== tileId) };
            if (q.distractorTileId === tileId) return { ...q, distractorTileId: null };
            if (!q.distractorTileId) return { ...q, distractorTileId: tileId };
            return { ...q, correctTileIds: [...(q.correctTileIds || []), tileId] };
          }
          return q;
        })
      };
    }));
  };

  const addQuestionToCanvas = (canvasId) => {
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      let newQ = { id: uid('cq'), prompt: `Question ${(c.questions || []).length + 1}` };
      if (!c.type || c.type === 'CANVAS') newQ.selectedTileIds = [];
      else if (c.type === 'NUMERICAL') { newQ.targetTileId = null; newQ.decoyTileIds = []; }
      else if (c.type === 'ODD_ONE_OUT') { newQ.correctTileIds = []; newQ.distractorTileId = null; }
      setActiveComposerQuestionId(newQ.id);
      return { ...c, questions: [...(c.questions || []), newQ] };
    }));
  };

  const deleteQuestion = () => {
    if ((canvas.questions || []).length <= 1) { alert("Can't delete the last question!"); return; }
    const remaining = canvas.questions.filter(q => q.id !== activeQ?.id);
    setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: remaining }));
    setActiveComposerQuestionId(remaining[0]?.id || null);
  };

  const selectedIds = activeQ?.selectedTileIds || [];
  const orderedSelectedTiles = allTableTiles.filter(t => selectedIds.includes(t.id));
  const strayTileIds = selectedIds.filter(id => !orderedSelectedTiles.find(t => t.id === id));
  const selectedTileObjects = [...orderedSelectedTiles, ...strayTileIds.map(id => ({ id, label: 'Deleted tile' }))];
  const max = activeQ?.maxTargets || 6;
  const totalSelectedTiles = selectedTileObjects.length;

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">

      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center z-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">{type === 'CANVAS' ? '🧩' : type === 'NUMERICAL' ? '🔢' : '❌'}</span>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type} Composer</p>
            <DebouncedInput
              placeholder="Canvas Name"
              value={canvas.name}
              onChange={val => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, name: val }))}
              className="font-black text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-amber-400 text-lg w-48"
            />
          </div>
        </div>

        {/* Question tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {(canvas.questions || []).map((q, i) => {
            const isDone = (type === 'NUMERICAL' && q.targetTileId && (q.decoyTileIds || []).length >= 3)
              || (type === 'CANVAS' && (q.selectedTileIds || []).length > 0)
              || (type === 'ODD_ONE_OUT' && q.distractorTileId);
            return (
              <button key={q.id} onClick={() => setActiveComposerQuestionId(q.id)}
                className={`relative w-8 h-8 rounded-lg flex justify-center items-center font-bold text-xs transition-all ${activeQ?.id === q.id ? (type === 'NUMERICAL' ? 'bg-amber-500 text-white shadow-md' : 'bg-clinical-blue text-white shadow-md') : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'}`}>
                {i + 1}
                {isDone && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>}
              </button>
            );
          })}
          <button onClick={() => addQuestionToCanvas(canvas.id)}
            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs flex justify-center items-center ml-1 border border-slate-300 transition-colors">+</button>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <button onClick={deleteQuestion}
            className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold text-xs flex justify-center items-center border border-rose-200 transition-colors" title="Delete question">Del</button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(type === 'NUMERICAL' || type === 'ODD_ONE_OUT') && (
            <button onClick={() => autoGenerateArcadeConfig(canvas.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase rounded-lg shadow-sm transition-all">
              🎲 Auto-Generate All
            </button>
          )}
          <button onClick={() => {
            const modeMap = { CANVAS: 'CANVAS', NUMERICAL: 'NUMERICAL', ODD_ONE_OUT: 'ODD_ONE_OUT' };
            const mode = modeMap[type] || 'CANVAS';
            
            if (mode === 'NUMERICAL') {
              const allDone = (canvas.questions || []).every(q => q.targetTileId && (q.decoyTileIds || []).length >= 3);
              if (!allDone && (canvas.questions || []).length > 0) {
                return alert('Cannot preview: Please ensure all Numerical questions have a target and at least 3 matching decoys (4 options total).');
              }
            } else if (mode === 'ODD_ONE_OUT') {
              const allDone = (canvas.questions || []).every(q => q.distractorTileId && (q.correctTileIds || []).length > 0);
              if (!allDone && (canvas.questions || []).length > 0) {
                return alert('Cannot preview: Please ensure all Odd One Out questions have a distractor and at least 1 correct fit tile.');
              }
            }

            setIsPreviewMode(true);
            setActiveGameMode(mode);
            startGame(canvas.chapter, canvas.id, null, false, true, mode);
          }} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white font-black text-[10px] uppercase rounded-lg shadow-sm transition-all">
            ▶ Preview
          </button>
        </div>
      </div>

      {/* ── NUMERICAL: full custom editor ───────────────────────────── */}
      {type === 'NUMERICAL' && activeQ && (
        <div className="flex-1 overflow-hidden">
          <NumericalEditor
            canvas={canvas}
            activeQ={activeQ}
            criteriaTables={criteriaTables}
            parseNumericalData={parseNumericalData}
            setCanvasConfigs={setCanvasConfigs}
            setActiveComposerQuestionId={setActiveComposerQuestionId}
            startGame={startGame}
            setActiveGameMode={setActiveGameMode}
            setIsPreviewMode={setIsPreviewMode}
          />
        </div>
      )}

      {/* ── CANVAS / ODD_ONE_OUT: original composer layout ──────────── */}
      {(type === 'CANVAS' || type === 'ODD_ONE_OUT') && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Slots selector — only for CANVAS */}
          {type === 'CANVAS' && (
            <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Board Slots</span>
              <select value={max} onChange={e => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: (c.questions || []).map(q => q.id === activeQ?.id ? { ...q, maxTargets: Number(e.target.value) } : q) }))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-clinical-blue shadow-sm">
                <option value="6">6 slots</option><option value="8">8 slots</option><option value="10">10 slots</option>
                <option value="12">12 slots</option><option value="16">16 slots</option><option value="20">20 slots</option><option value="24">24 slots</option>
              </select>
            </div>
          )}

          {/* Question config */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-10 shadow-sm space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest whitespace-nowrap w-24">Heading:</span>
              <DebouncedInput
                placeholder="e.g. Identify Jones Major Criteria"
                value={activeQ?.prompt || ''}
                onChange={val => setCanvasConfigs(p => p.map(c => { if (c.id !== canvas.id) return c; return { ...c, questions: (c.questions || []).map(q => q.id === activeQ?.id ? { ...q, prompt: val } : q) }; }))}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest whitespace-nowrap w-24">Subheading:</span>
              <DebouncedInput
                placeholder="e.g. Select at least 2 major criteria"
                value={activeQ?.subheading || ''}
                onChange={val => setCanvasConfigs(p => p.map(c => { if (c.id !== canvas.id) return c; return { ...c, questions: (c.questions || []).map(q => q.id === activeQ?.id ? { ...q, subheading: val } : q) }; }))}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Selected tiles box */}
            <div className="h-[280px] border-b border-slate-200 bg-slate-50 p-4 flex flex-col flex-shrink-0 shadow-inner z-10">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full ring-4 ring-slate-950/20 max-w-6xl mx-auto w-full">
                <div className="px-5 py-2 border-b border-slate-800 flex justify-between items-center flex-shrink-0 bg-slate-950/50">
                  <p className="text-[10px] font-black text-clinical-blue uppercase tracking-widest">
                    {type === 'CANVAS' ? 'Selected Targets' : 'Odd One Out Config'}
                  </p>
                  {type === 'CANVAS' && (
                    <div className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-inner">
                      <span className="text-[10px] font-black text-slate-300"><span className={totalSelectedTiles > max ? 'text-rose-400' : 'text-white'}>{totalSelectedTiles}</span> / {max}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 content-start bg-slate-900">
                  {type === 'CANVAS' && Array.from({ length: Math.max(max, totalSelectedTiles) }).map((_, i) => {
                    const tile = selectedTileObjects[i];
                    return (
                      <div key={i} onClick={() => tile && toggleTileInCanvas(tile.id, canvas.id, activeQ?.id)}
                        className={`min-h-[3.5rem] p-2 rounded-xl border-2 flex flex-col items-start justify-between cursor-pointer transition-all overflow-hidden ${tile ? 'bg-blue-600 border-blue-500 text-white shadow-md hover:bg-rose-600 hover:border-rose-500 hover:scale-[1.02]' : 'bg-slate-800/50 border-slate-700 border-dashed text-slate-500 hover:bg-slate-800 hover:border-slate-600'}`}>
                        {tile ? (
                          <div className="w-full flex flex-col h-full justify-between">
                            <p className="text-[10px] font-bold leading-tight break-words whitespace-normal line-clamp-3">{tile.label}</p>
                          </div>
                        ) : <div className="w-full h-full flex items-center justify-center"><span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-center">Empty</span></div>}
                      </div>
                    );
                  })}
                  {type === 'ODD_ONE_OUT' && (
                    <OddOneOutEditor
                      canvas={canvas} activeQ={activeQ} criteriaTables={criteriaTables}
                      allTableTiles={allTableTiles} setCanvasConfigs={setCanvasConfigs} canvasConfigs={canvasConfigs}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Scrolling tables */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div className="max-w-6xl mx-auto w-full">
                {(criteriaTables || []).filter(t => t.chapter === canvas.chapter).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-[11px] text-slate-400">No criteria tables yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {(criteriaTables || []).filter(t => t.chapter === canvas.chapter).map(table => {
                      const isExpanded = expandedNodes?.[`composer-table-${table.id}`];
                      return (
                        <div key={table.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-100 flex justify-between items-center cursor-pointer hover:bg-indigo-100 transition-colors"
                            onClick={() => setExpandedNodes?.(p => ({ ...p, [`composer-table-${table.id}`]: !isExpanded }))}>
                            <div>
                              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                                {isExpanded ? '▼' : '▶'} 📋 {table.name}
                              </p>
                            </div>
                            {type === 'CANVAS' && (
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                <button onClick={() => {
                                  const allTileIds = (table.rows || []).filter(r => !r.isHeading).flatMap(r => (r.cells || []).flatMap(c => (c.tiles || []).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)])));
                                  setCanvasConfigs(p => p.map(c => { if (c.id !== canvas.id) return c; return { ...c, questions: (c.questions || []).map(q => q.id === activeQ?.id ? { ...q, selectedTileIds: Array.from(new Set([...(q.selectedTileIds || []), ...allTileIds])) } : q) }; }));
                                }} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase px-2 py-1 border border-indigo-200 rounded-lg bg-white shadow-sm">All</button>
                                <button onClick={() => {
                                  const allTileIds = new Set((table.rows || []).filter(r => !r.isHeading).flatMap(r => (r.cells || []).flatMap(c => (c.tiles || []).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)]))));
                                  setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: (c.questions || []).map(q => q.id === activeQ?.id ? { ...q, selectedTileIds: (q.selectedTileIds || []).filter(id => !allTileIds.has(id)) } : q) }));
                                }} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase px-2 py-1">None</button>
                              </div>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="divide-y divide-slate-100 flex-1">
                              {(table.rows || []).map(row => {
                                if (row.isHeading) {
                                  const isSub = row.headingType === 'sub';
                                  return (
                                    <div key={row.id} className={`p-3 grid gap-3 border-y ${isSub ? 'bg-amber-50/50 border-amber-100/50' : 'bg-amber-100/80 border-amber-200'}`} style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                      {(row.cells || []).map((cell, ci) => (
                                        <div key={ci} className="text-center p-2 flex items-center justify-center">
                                          <p className={`${isSub ? 'text-[9px] font-bold text-amber-600' : 'text-[11px] font-black text-amber-800'} uppercase tracking-widest`}>{cell.text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={row.id} className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                    {(row.cells || []).map((cell, ci) => {
                                      const allCellTileItems = (cell.tiles || []).flatMap(t => [t, ...(t.subtiles || [])]);
                                      const critSelected = type === 'CANVAS' && allCellTileItems.length > 0 && allCellTileItems.every(t => selectedIds.includes(t.id));
                                      return (
                                        <div key={ci} className={`flex flex-col border rounded-lg p-2 transition-colors h-full ${critSelected ? 'bg-teal-50/50 border-teal-100' : 'bg-white border-slate-100'}`}>
                                          {(!cell.tiles || cell.tiles.length === 0) && (
                                            <div className="flex items-start justify-between mb-2 border-b border-slate-100 pb-1">
                                              <p className="text-[11px] font-black text-slate-800 leading-tight">{cell.text}</p>
                                            </div>
                                          )}
                                          {(cell.tiles || []).length > 0 && (
                                            <div className="flex flex-col gap-2 mt-auto">
                                              {(cell.tiles || []).map((tile, ti) => {
                                                const isSelected = selectedIds.includes(tile.id) || (type === 'ODD_ONE_OUT' && (activeQ?.correctTileIds || []).includes(tile.id));
                                                return (
                                                  <div key={tile.id} className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                                                    <button onClick={() => toggleTileInCanvas(tile.id, canvas.id, activeQ?.id)}
                                                      className={`w-full px-2 py-1.5 rounded-xl border-2 text-[10px] font-extrabold transition-all flex items-start gap-1.5 ${
                                                        isSelected
                                                          ? (cell.tiles.length === 2 ? (ti === 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-purple-600 border-purple-700 text-white') : 'bg-teal-600 border-teal-700 text-white')
                                                          : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'
                                                      }`}>
                                                      {isSelected && <span className="mt-0.5">✓</span>}
                                                      <span className="text-left leading-tight break-words whitespace-normal font-bold">{tile.label}</span>
                                                    </button>
                                                    {(tile.subtiles || []).length > 0 && (
                                                      <div className="flex flex-col gap-1 pl-4 border-l-2 border-slate-200 ml-2">
                                                        {(tile.subtiles || []).map(sub => {
                                                          const subSelected = selectedIds.includes(sub.id);
                                                          return (
                                                            <button key={sub.id} onClick={() => toggleTileInCanvas(sub.id, canvas.id, activeQ?.id)}
                                                              className={`w-full px-2 py-1 rounded-lg border text-[9px] font-extrabold transition-all flex items-start gap-1.5 ${subSelected ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'}`}>
                                                              {subSelected && <span className="mt-0.5">✓</span>}
                                                              <span className="text-left leading-tight break-words whitespace-normal font-bold">↳ {sub.label}</span>
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
