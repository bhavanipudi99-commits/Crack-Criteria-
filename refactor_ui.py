import re

with open("src/App.jsx", "r") as f:
    content = f.read()

def extract_block(text, start_str):
    start = text.find(start_str)
    if start == -1: return None
    # find matching brace or div
    # Actually, we know the exact string to look for.
    pass

# We need to change the tables filtering logic
# In renderAdminHome:
# const tables = criteriaTables.filter(t => t.chapter === chap.name);
# If we change it to: const tables = criteriaTables.filter(t => t.chapter === chap.name && t.subChapterId === (subChapterId || null));
# Wait, `renderAdminHome` has the local variables: `tables`, `pureCanvases`, `numConfigs`, `oddConfigs`.
# If I just create a helper `renderItems(chapterName, subChapterId)` inside `renderAdminHome`!

# Let's dynamically inject a helper function inside renderAdminHome:
helper_func = """
    const renderItems = (chapterName, subChapterId = null) => {
      const tables = criteriaTables.filter(t => t.chapter === chapterName && (t.subChapterId || null) === subChapterId);
      const pureCanvases = canvasConfigs.filter(c => c.chapter === chapterName && (c.subChapterId || null) === subChapterId && (!c.type || c.type === 'CANVAS'));
      const numConfigs = canvasConfigs.filter(c => c.chapter === chapterName && (c.subChapterId || null) === subChapterId && c.type === 'NUMERICAL');
      const oddConfigs = canvasConfigs.filter(c => c.chapter === chapterName && (c.subChapterId || null) === subChapterId && c.type === 'ODD_ONE_OUT');
      const scopeKey = subChapterId ? `sub_${subChapterId}` : `chap_${chapterName}`;
      
      return (
        <>
          {/* TABLES */}
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between items-center mb-2">
               <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">📋 Tables</p>
            </div>
            {tables.length === 0 && <p className="text-[10px] text-slate-400 italic">No tables yet</p>}
            {tables.map(table => {
              const isTableExpanded = !!expandedChapters[`table_${table.id}`];
              return (
                <div key={table.id} className="border border-indigo-100 rounded-lg bg-white overflow-hidden shadow-sm mb-1.5">
                  <div className="flex justify-between items-center px-2 py-1.5 bg-indigo-50/50 border-b border-indigo-50">
                    <button onClick={() => setExpandedChapters(p => ({ ...p, [`table_${table.id}`]: !isTableExpanded }))} className="flex-1 text-left flex items-center gap-1.5">
                      <span className="text-indigo-400 font-bold text-[8px] w-3">{isTableExpanded ? '▼' : '►'}</span>
                      <p className="text-[11px] font-extrabold text-indigo-900 truncate leading-tight">{table.name}</p>
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedTableId(table.id); setBuilderCriteria(JSON.parse(JSON.stringify(table.rows))); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setScreen('CRITERIA_TABLE_BUILDER'); }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase px-1.5 py-0.5 border border-indigo-200 rounded bg-white shadow-sm">Edit</button>
                    </div>
                  </div>
                  {isTableExpanded && (
                    <div className="p-1.5 bg-slate-50/50">
                      <div className="overflow-x-auto rounded border border-indigo-100 shadow-sm">
                        {table.rows.length === 0 ? (
                          <div className="p-4 text-center bg-white flex flex-col items-center justify-center gap-2">
                            <span className="text-xl">📭</span>
                            <p className="text-[10px] font-bold text-slate-400">This table is empty!</p>
                            <button onClick={() => { setSelectedTableId(table.id); setBuilderCriteria([]); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ""; setScreen("CRITERIA_TABLE_BUILDER"); }}
                              className="mt-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[9px] font-bold uppercase rounded-md transition-colors">
                              Click "Edit" to Build Table
                            </button>
                          </div>
                        ) : (
                        <table className="w-full text-left border-collapse bg-white table-fixed">
                          <tbody>
                            {table.rows.map(row => {
                              if (row.isHeading) {
                                const isSub = row.headingType === 'sub';
                                return (
                                  <tr key={row.id} className={isSub ? 'bg-amber-50/50' : 'bg-amber-100/80'}>
                                    {row.cells.map((cell, ci) => (
                                      <td key={ci} className={`px-2 py-1.5 border border-indigo-50/50 text-center ${isSub ? 'text-[8px] font-bold text-amber-600' : 'text-[9px] font-black text-amber-800'} uppercase tracking-widest`}>
                                        {cell.text}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              }
                              return (
                                <tr key={row.id} className="border-b border-indigo-50 last:border-0 hover:bg-slate-50/30">
                                  {(row.cells||[]).map((c, ci) => (
                                    <td key={ci} className="p-2 border border-indigo-50/50 align-top">
                                      {(!c.tiles || c.tiles.length === 0) && (
                                        <div className="font-extrabold text-indigo-900 border-b border-indigo-50/50 pb-1 mb-1.5 leading-tight text-[10px]">{c.text || 'Row'}</div>
                                      )}
                                      <div className="flex flex-col gap-1">
                                        {(c.tiles||[]).map(t => {
                                          const isChecked = selectedCanvasId && activeComposerQuestionId && canvasConfigs.find(cv=>cv.id===selectedCanvasId)?.questions.find(q=>q.id===activeComposerQuestionId)?.selectedTileIds.includes(t.id);
                                          return (
                                            <div key={t.id} className="flex flex-col gap-0.5">
                                              <div className={`flex items-start gap-1.5 p-1 rounded transition-colors ${isChecked ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                                                {selectedCanvasId && activeComposerQuestionId && (
                                                  <input type="checkbox" className="w-3 h-3 accent-teal-500 mt-0.5 flex-shrink-0 cursor-pointer"
                                                    checked={isChecked || false}
                                                    onChange={() => toggleTileInCanvas(t.id, selectedCanvasId, activeComposerQuestionId)} />
                                                )}
                                                <span className={`text-[9px] leading-tight ${isChecked ? 'font-black text-teal-800' : 'font-semibold text-slate-600'}`}>{t.label}</span>
                                              </div>
                                              {t.subtiles?.length > 0 && (
                                                <div className="flex flex-col gap-0.5 pl-3 border-l-2 border-slate-100 ml-1.5 mt-0.5">
                                                  {t.subtiles.map(sub => {
                                                    const subChecked = selectedCanvasId && activeComposerQuestionId && canvasConfigs.find(cv=>cv.id===selectedCanvasId)?.questions.find(q=>q.id===activeComposerQuestionId)?.selectedTileIds.includes(sub.id);
                                                    return (
                                                      <div key={sub.id} className={`flex items-start gap-1.5 p-1 rounded transition-colors ${subChecked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                                        {selectedCanvasId && activeComposerQuestionId && (
                                                          <input type="checkbox" className="w-2.5 h-2.5 accent-indigo-500 mt-0.5 flex-shrink-0 cursor-pointer"
                                                            checked={subChecked || false}
                                                            onChange={() => toggleTileInCanvas(sub.id, selectedCanvasId, activeComposerQuestionId)} />
                                                        )}
                                                        <span className={`text-[8px] leading-tight ${subChecked ? 'font-black text-indigo-800' : 'font-semibold text-slate-500'}`}>↳ {sub.label}</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-1.5 mt-2">
              <input type="text" placeholder="+ New table" value={newTableChapter === scopeKey ? newTableName : ''}
                onChange={e => { setNewTableName(e.target.value); setNewTableChapter(scopeKey); }}
                onClick={() => setNewTableChapter(scopeKey)}
                className="flex-1 px-2 py-1.5 border border-dashed border-indigo-300 rounded-lg text-[10px] font-bold bg-indigo-50/30 focus:outline-none focus:border-indigo-500" />
              <button onClick={() => { addCriteriaTable(chapterName, subChapterId); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+</button>
            </div>
          </div>

          {/* CANVASES */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
            <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">🎮 Canvases</p>
            {pureCanvases.length === 0 && <p className="text-[10px] text-slate-400 italic">No canvases yet</p>}
            {pureCanvases.map(canvas => (
              <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-teal-50 border-teal-300 shadow-sm ring-1 ring-teal-200' : 'bg-teal-50/20 border-teal-100 hover:border-teal-300 mb-1.5'}`}>
                <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                  <span className="text-teal-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                  <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-teal-900' : 'text-teal-700'}`}>{canvas.name}</p>
                </button>
                <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
              </div>
            ))}
            <div className="flex gap-1.5 mt-2">
              <input type="text" placeholder="+ New config" value={newCanvasChapter === scopeKey ? newCanvasName : ''}
                onChange={e => { setNewCanvasName(e.target.value); setNewCanvasChapter(scopeKey); }}
                onClick={() => setNewCanvasChapter(scopeKey)}
                className="flex-1 px-2 py-1.5 border border-dashed border-teal-300 rounded-lg text-[10px] font-bold bg-teal-50/30 focus:outline-none focus:border-teal-500" />
              <button onClick={() => { addCanvas('CANVAS', chapterName, subChapterId); }} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+</button>
            </div>
          </div>

          {/* NUMERICAL */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">🔢 Numerical</p>
            {numConfigs.length === 0 && <p className="text-[10px] text-slate-400 italic">No configs yet</p>}
            {numConfigs.map(canvas => (
              <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-200' : 'bg-amber-50/20 border-amber-100 hover:border-amber-300 mb-1.5'}`}>
                <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                  <span className="text-amber-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                  <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-amber-900' : 'text-amber-700'}`}>{canvas.name}</p>
                </button>
                <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
              </div>
            ))}
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => { setNewCanvasName('Numerical Deck'); addCanvas('NUMERICAL', chapterName, subChapterId); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+ Build Numerical Deck</button>
            </div>
          </div>

          {/* ODD ONE OUT */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">❌ Odd One</p>
            {oddConfigs.length === 0 && <p className="text-[10px] text-slate-400 italic">No configs yet</p>}
            {oddConfigs.map(canvas => (
              <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-rose-50 border-rose-300 shadow-sm ring-1 ring-rose-200' : 'bg-rose-50/20 border-rose-100 hover:border-rose-300 mb-1.5'}`}>
                <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                  <span className="text-rose-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                  <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-rose-900' : 'text-rose-700'}`}>{canvas.name}</p>
                </button>
                <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
              </div>
            ))}
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => { setNewCanvasName('Odd One Deck'); addCanvas('ODD_ONE_OUT', chapterName, subChapterId); }} className="w-full bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+ Build Odd One Deck</button>
            </div>
          </div>
        </>
      );
    };
"""

content = content.replace("const renderAdminHome = () => {", "const renderAdminHome = () => {\n" + helper_func)

# Now, we need to replace the old rendering code inside `renderAdminHome`
# with calls to `renderItems(chap.name)` and `renderItems(chap.name, sc.id)`!
# We can find the block by searching for "const tables = criteriaTables.filter" and replace everything until the end of the chapter expansion block.

start_marker = "const tables = criteriaTables.filter(t => t.chapter === chap.name);"
end_marker = "                                </div>\n                              )}\n                            </div>"

start_idx = content.find(start_marker)

# To find end idx safely, I will look for "ODD ONE OUT" div end.
target_replace_start = content[start_idx:]
end_idx_relative = target_replace_start.find("</button>\n                                    </div>\n                                  </div>\n\n                                </div>")
if end_idx_relative != -1:
    end_idx = start_idx + end_idx_relative + len("</button>\n                                    </div>\n                                  </div>\n\n                                </div>")

    new_block = """
                          return (
                            <div key={chap.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <button onClick={() => setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !chapExpanded }))}
                                className="w-full px-3 py-2.5 bg-slate-50/80 flex justify-between items-center border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                <div className="text-left flex-1">
                                  <p className="text-xs font-extrabold text-slate-700">📖 {chap.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={e => { e.stopPropagation(); deleteChapter(chap.id, chap.name); }}
                                    className="text-[9px] text-rose-400 hover:text-rose-600 font-bold uppercase px-2 py-1">Del</button>
                                  <span className="text-slate-400 font-bold text-[9px]">{chapExpanded ? '▼' : '►'}</span>
                                </div>
                              </button>

                              {chapExpanded && (
                                <div className="p-2 space-y-4 bg-white pl-3 border-l-2 border-indigo-50 ml-1.5 my-1">
                                  
                                  {/* SUB-CHAPTERS */}
                                  <div className="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">📂 Sub-chapters</p>
                                    <div className="flex flex-col gap-2">
                                      {appSubChapters.filter(sc => sc.chapterName === chap.name).map(sc => {
                                        const scExpanded = expandedChapters[`subchap_${sc.id}`];
                                        return (
                                          <div key={sc.id} className="border border-slate-200 bg-white rounded-md overflow-hidden">
                                            <button onClick={() => setExpandedChapters(p => ({ ...p, [`subchap_${sc.id}`]: !scExpanded }))}
                                              className="w-full px-2 py-1.5 flex justify-between items-center hover:bg-slate-50 text-left">
                                              <span className="text-[11px] font-bold text-slate-700">📂 {sc.name}</span>
                                              <span className="text-[9px] font-bold text-slate-400">{scExpanded ? '▼' : '►'}</span>
                                            </button>
                                            {scExpanded && (
                                              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                                                {renderItems(chap.name, sc.id)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      <div className="flex gap-1.5 mt-1">
                                        <input type="text" placeholder="+ New sub-chapter" value={newSubChapterParent === chap.name ? newSubChapterName : ''}
                                          onChange={e => { setNewSubChapterName(e.target.value); setNewSubChapterParent(chap.name); }}
                                          onClick={() => setNewSubChapterParent(chap.name)}
                                          className="flex-1 px-2 py-1 border border-slate-200 rounded text-[10px] font-bold bg-white focus:outline-none focus:border-slate-400" />
                                        <button onClick={() => addSubChapter(chap.name)} className="bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold transition-colors">+</button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Root Chapter Items</p>
                                    {renderItems(chap.name, null)}
                                  </div>
                                </div>
"""
    
    # We replace from "const tables = ... " to the end of the Odd One Out div
    content = content[:start_idx] + new_block + content[end_idx:]

with open("src/App.jsx", "w") as f:
    f.write(content)

print("SUCCESS")
