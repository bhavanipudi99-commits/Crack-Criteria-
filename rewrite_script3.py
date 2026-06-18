import sys

with open("src/App.jsx", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "const renderCanvasComposer = () => {" in line:
        start_idx = i
        break

for i in range(start_idx + 1, len(lines)):
    if "  return (" in lines[i]:
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print(f"MARKERS NOT FOUND {start_idx} {end_idx}")
    sys.exit(1)

pre = lines[:start_idx]
post = lines[end_idx:]

replacement = """  const renderCanvasComposer = () => {
    const canvas = canvasConfigs.find(c => c.id === selectedCanvasId);
    if (!canvas) return null;

    const type = canvas.type || 'CANVAS';
    const activeQ = canvas.questions.find(q => q.id === activeComposerQuestionId) || canvas.questions[0];
    if (!activeQ) return null;

    // Derived states
    const max = activeQ.maxTargets || 6;
    const selectedIds = activeQ.selectedTileIds || [];
    const allTableTiles = (criteriaTables||[]).filter(t => t.chapter === canvas.chapter).flatMap(t => (t.rows||[]).filter(r=>!r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles || [])]))));
    
    // We order the selected tiles to match their order in the table
    const orderedSelectedTiles = allTableTiles.filter(t => selectedIds.includes(t.id));
    const strayTileIds = selectedIds.filter(id => !orderedSelectedTiles.find(t => t.id === id));
    // If they were deleted from the table but are still in the canvas config, they will just be 'Unknown'
    const strayTiles = strayTileIds.map(id => ({ id, label: 'Unknown/Deleted' }));
    const selectedTileObjects = [...orderedSelectedTiles, ...strayTiles];
    
    const totalSelectedTiles = selectedTileObjects.length;

    return (
      <div className="h-full flex flex-col bg-slate-50 relative">
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center z-20 flex-shrink-0 shadow-sm relative">
          <div className="flex items-center gap-3">
            <span className="text-xl">{type === 'CANVAS' ? '🧩' : type === 'NUMERICAL' ? '🔢' : '❌'}</span>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type} Composer</p>
              <div className="flex items-center gap-2">
                <input type="text" value={canvas.name} onChange={e => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, name: e.target.value }))}
                  className="font-black text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-clinical-blue text-lg w-48" />
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {canvas.questions.map((q, i) => (
              <button key={q.id} onClick={() => setActiveComposerQuestionId(q.id)}
                className={`relative w-8 h-8 rounded-lg flex justify-center items-center font-bold text-xs transition-all ${activeQ.id === q.id ? 'bg-clinical-blue text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'}`}>
                {i + 1}
                {(q.selectedTileIds?.length || 0) > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>}
              </button>
            ))}
            <button onClick={() => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: [...c.questions, { id: uid('q'), selectedTileIds: [], maxTargets: 6 }] }))}
              className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs flex justify-center items-center ml-1 border border-slate-300 transition-colors">+</button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={() => {
              if (canvas.questions.length <= 1) { alert("Can't delete the last question!"); return; }
              setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.filter(q => q.id !== activeQ.id) }));
              setActiveComposerQuestionId(canvas.questions.find(q => q.id !== activeQ.id).id);
            }} className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold text-xs flex justify-center items-center border border-rose-200 transition-colors" title="Delete current question">Del</button>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slots</span>
               <select value={max} onChange={e => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, maxTargets: Number(e.target.value) } : q) }))}
                 className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-clinical-blue shadow-sm">
                 <option value="6">6 slots</option><option value="8">8 slots</option><option value="10">10 slots</option>
                 <option value="12">12 slots</option><option value="16">16 slots</option><option value="20">20 slots</option><option value="24">24 slots</option>
               </select>
             </div>
          </div>
        </div>

        {/* Fixed Active Question Config */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-10 shadow-sm relative space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest whitespace-nowrap w-24">Heading:</span>
            <input type="text" placeholder="e.g. Identify Jones Major Criteria" value={activeQ.prompt || ''}
              onChange={e => updateQuestionPrompt(canvas.id, activeQ.id, e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest whitespace-nowrap w-24">Subheading:</span>
            <input type="text" placeholder="e.g. Select at least 2 major criteria" value={activeQ.subheading || ''}
              onChange={e => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, subheading: e.target.value } : q) }))}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner" />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top Panel of Composer: Fixed Selected Tiles Box */}
          <div className="h-[280px] border-b border-slate-200 bg-slate-50 p-4 flex flex-col flex-shrink-0 shadow-inner z-10">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full ring-4 ring-slate-950/20 max-w-6xl mx-auto w-full">
              <div className="px-5 py-2 border-b border-slate-800 flex justify-between items-center flex-shrink-0 bg-slate-950/50">
                <div>
                  <p className="text-[10px] font-black text-clinical-blue uppercase tracking-widest">
                    {type === 'CANVAS' ? 'Selected Targets' : type === 'NUMERICAL' ? 'Target & Decoys' : 'Odd One Out Config'}
                  </p>
                </div>
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
                    <div key={i} onClick={() => tile && toggleTileInCanvas(tile.id, canvas.id, activeQ.id)}
                      className={`min-h-[3.5rem] p-2 rounded-xl border-2 flex flex-col items-start justify-between cursor-pointer transition-all ${tile ? 'bg-blue-600 border-blue-500 text-white shadow-md hover:bg-rose-600 hover:border-rose-500 hover:scale-[1.02]' : 'bg-slate-800/50 border-slate-700 border-dashed text-slate-500 hover:bg-slate-800 hover:border-slate-600'}`}>
                      {tile ? (
                        <>
                          <p className="text-[10px] font-bold leading-tight">{tile.label}</p>
                          {tile.tileCount === 2 && <span className="text-[8px] text-blue-200 bg-blue-800/50 px-1 py-0.5 rounded font-black uppercase mt-1">½ pair</span>}
                        </>
                      ) : <div className="w-full h-full flex items-center justify-center"><span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-center">Empty</span></div>}
                    </div>
                  );
                })}
                
                {type === 'NUMERICAL' && (
                  <>
                    <div className="col-span-4 lg:col-span-6 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">📝 Question Prompt</p>
                      <input type="text" value={activeQ.prompt || ''} onChange={e => updateQuestionPrompt(canvas.id, activeQ.id, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-clinical-blue" placeholder="e.g. Systolic BP < ___ mm Hg" />
                    </div>
                    <div className="col-span-2 lg:col-span-3 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🎯 Target</p>
                      <div className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${selectedTileObjects.length > 0 ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-800/50 border-slate-700 border-dashed text-slate-500'}`}>
                        {selectedTileObjects.length > 0 ? (
                          <>
                            <p className="text-xs font-bold">{selectedTileObjects[0].label}</p>
                            <button onClick={() => toggleTileInCanvas(selectedTileObjects[0].id, canvas.id, activeQ.id)} className="text-[9px] font-black bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded">DEL</button>
                          </>
                        ) : <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Select below</span>}
                      </div>
                    </div>
                    <div className="col-span-2 lg:col-span-3 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Decoys</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedTileObjects.slice(1).map(tile => (
                          <div key={tile.id} className="p-2 rounded-lg border-2 bg-slate-700 border-slate-600 text-white flex items-center justify-between">
                            <p className="text-[10px] font-bold">{tile.label}</p>
                            <button onClick={() => toggleTileInCanvas(tile.id, canvas.id, activeQ.id)} className="text-[9px] font-black bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded">DEL</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {type === 'ODD_ONE_OUT' && (
                  <>
                    <div className="col-span-4 lg:col-span-6 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">📝 Question Prompt</p>
                      <input type="text" value={activeQ.prompt || ''} onChange={e => updateQuestionPrompt(canvas.id, activeQ.id, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-clinical-blue" placeholder="e.g. Which of the following is NOT..." />
                    </div>
                    <div className="col-span-2 lg:col-span-3 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🎯 Odd One Out (Target)</p>
                      <div className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${activeQ.targetTileId ? 'bg-rose-600 border-rose-500 text-white shadow-md' : 'bg-slate-800/50 border-slate-700 border-dashed text-slate-500'}`}>
                        {activeQ.targetTileId ? (
                          <>
                            <p className="text-xs font-bold">{allTableTiles.find(t => t.id === activeQ.targetTileId)?.label || 'Selected'}</p>
                            <button onClick={() => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, targetTileId: null } : q) }))} className="text-[9px] font-black bg-slate-900/50 hover:bg-slate-900 px-2 py-1 rounded">DEL</button>
                          </>
                        ) : <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Select below</span>}
                      </div>
                    </div>
                    <div className="col-span-2 lg:col-span-3 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regular Tiles (Decoys)</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {(activeQ.correctTileIds||[]).map(id => {
                          const tile = allTableTiles.find(t => t.id === id);
                          if (!tile) return null;
                          return (
                            <div key={tile.id} className="p-2 rounded-lg border-2 bg-slate-700 border-slate-600 text-white flex items-center justify-between">
                              <p className="text-[10px] font-bold">{tile.label}</p>
                              <button onClick={() => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, correctTileIds: q.correctTileIds.filter(tid => tid !== tile.id) } : q) }))} className="text-[9px] font-black bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded">DEL</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Panel of Composer: Scrolling Tables */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
            <div className="max-w-6xl mx-auto w-full">
              {criteriaTables.filter(t => t.chapter === canvas.chapter).length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="text-[11px] text-slate-400">No criteria tables yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {criteriaTables.filter(t => t.chapter === canvas.chapter).map(table => {
                    const tableSelectedCount = (table.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]))).filter(t => selectedIds.includes(t.id)).length;
                    const tableTotalTiles = (table.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]))).length;

                    return (
                      <div key={table.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-100 flex justify-between items-center cursor-pointer hover:bg-indigo-100 transition-colors"
                             onClick={() => setExpandedNodes(p => ({ ...p, [`composer-table-${table.id}`]: !p[`composer-table-${table.id}`] }))}>
                          <div>
                            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                              {expandedNodes[`composer-table-${table.id}`] ? '▼' : '▶'} 📋 {table.name}
                            </p>
                            <p className="text-[9px] text-indigo-500 mt-0.5">{tableSelectedCount}/{tableTotalTiles} tiles selected</p>
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => {
                              const allTileIds = (table.rows||[]).filter(r=>!r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)])));
                              setCanvasConfigs(p => p.map(c => {
                                if (c.id !== canvas.id) return c;
                                return { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, selectedTileIds: Array.from(new Set([...(q.selectedTileIds||[]), ...allTileIds])) } : q) };
                              }));
                            }} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase px-2 py-1 border border-indigo-200 rounded-lg bg-white shadow-sm">All</button>
                            <button onClick={() => {
                              const allTileIds = new Set((table.rows||[]).filter(r=>!r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)]))));
                              setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, selectedTileIds: (q.selectedTileIds||[]).filter(id => !allTileIds.has(id)) } : q) }));
                            }} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase px-2 py-1">None</button>
                          </div>
                        </div>

                        {expandedNodes[`composer-table-${table.id}`] && (
                          <div className="divide-y divide-slate-100 flex-1">
                            {table.rows.map(row => {
                              if (row.isHeading) {
                                const isSub = row.headingType === 'sub';
                                return (
                                  <div key={row.id} className={`p-3 grid gap-3 border-y ${isSub ? 'bg-amber-50/50 border-amber-100/50' : 'bg-amber-100/80 border-amber-200'}`} style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                    {row.cells.map((cell, ci) => (
                                      <div key={ci} className="text-center p-2 flex items-center justify-center">
                                        <p className={`${isSub ? 'text-[9px] font-bold text-amber-600' : 'text-[11px] font-black text-amber-800'} uppercase tracking-widest`}>{cell.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return (
                                <div key={row.id} className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                  {(row.cells||[]).map((cell, ci) => {
                                    const allCellTileItems = (cell.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]);
                                    const critSelected = allCellTileItems.length > 0 && allCellTileItems.every(t => selectedIds.includes(t.id));
                                    const critPartial = allCellTileItems.length > 0 && allCellTileItems.some(t => selectedIds.includes(t.id)) && !critSelected;
                                    return (
                                      <div key={ci} className={`flex flex-col border rounded-lg p-2 transition-colors h-full ${critSelected ? 'bg-teal-50/50 border-teal-100' : 'bg-white border-slate-100'}`}>
                                        
                                        {/* HIDE TEXT IF NO TILES OR DUPLICATED */}
                                        {(!cell.tiles || cell.tiles.length === 0) && (
                                          <div className="flex items-start justify-between mb-2 border-b border-slate-100 pb-1">
                                            <p className="text-[11px] font-black text-slate-800 leading-tight">{cell.text}</p>
                                          </div>
                                        )}
                                        
                                        {cell.tiles && cell.tiles.length > 0 && (
                                          <div className="flex flex-col gap-2 mt-auto">
                                            {(cell.tiles||[]).map((tile, ti) => {
                                              const isSelected = selectedIds.includes(tile.id);
                                              return (
                                                <div key={tile.id} className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                                                  <button onClick={() => toggleTileInCanvas(tile.id, canvas.id, activeQ.id)}
                                                    className={`w-full px-2 py-1.5 rounded-xl border-2 text-[10px] font-extrabold transition-all flex items-start gap-1.5 ${
                                                      isSelected ? (cell.tiles||[]).length === 2 ? (ti === 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-purple-600 border-purple-700 text-white') : 'bg-teal-600 border-teal-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'
                                                    }`}>
                                                    {isSelected && <span className="mt-0.5">✓</span>}
                                                    <span className="text-left leading-tight break-words whitespace-normal font-bold">{tile.label}</span>
                                                  </button>
                                                  {tile.subtiles?.length > 0 && (
                                                    <div className="flex flex-col gap-1 pl-4 border-l-2 border-slate-200 ml-2">
                                                      {tile.subtiles.map(sub => {
                                                        const subSelected = selectedIds.includes(sub.id);
                                                        return (
                                                          <button key={sub.id} onClick={() => toggleTileInCanvas(sub.id, canvas.id, activeQ.id)}
                                                            className={`w-full px-2 py-1 rounded-lg border text-[9px] font-extrabold transition-all flex items-start gap-1.5 ${
                                                              subSelected ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'
                                                            }`}>
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
    );
  };
"""

with open("src/App.jsx", "w") as f:
    f.writelines(pre)
    f.write(replacement)
    f.writelines(post)

print("SUCCESS")
