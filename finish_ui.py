import sys

with open("src/App.jsx", "r") as f:
    content = f.read()

target = """<p className="text-[9px] font-black text-slate-400 italic">Sub-chapter content coming soon!</p>"""

replacement = """                                                <div className="space-y-1.5">
                                                  <div className="flex justify-between items-center mb-2">
                                                     <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">📋 Tables</p>
                                                  </div>
                                                  {criteriaTables.filter(t => t.chapter === chap.name && t.subChapterId === sc.id).length === 0 && <p className="text-[10px] text-slate-400 italic">No tables yet</p>}
                                                  {criteriaTables.filter(t => t.chapter === chap.name && t.subChapterId === sc.id).map(table => {
                                                    const isTableExpanded = !!expandedChapters[`table_${table.id}`];
                                                    return (
                                                      <div key={table.id} className="border border-indigo-100 rounded-lg bg-white overflow-hidden shadow-sm">
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
                                                    <input type="text" placeholder="+ New table" value={newTableChapter === `sub_${sc.id}` ? newTableName : ''}
                                                      onChange={e => { setNewTableName(e.target.value); setNewTableChapter(`sub_${sc.id}`); }}
                                                      onClick={() => setNewTableChapter(`sub_${sc.id}`)}
                                                      className="flex-1 px-2 py-1.5 border border-dashed border-indigo-300 rounded-lg text-[10px] font-bold bg-indigo-50/30 focus:outline-none focus:border-indigo-500" />
                                                    <button onClick={() => { addCriteriaTable(chap.name, sc.id); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+</button>
                                                  </div>
                                                </div>"""

content = content.replace(target, replacement)

# Now we need to modify the base `tables` to exclude those that are in a subchapter!
# Original: const tables = criteriaTables.filter(t => t.chapter === chap.name);
# New: const tables = criteriaTables.filter(t => t.chapter === chap.name && !t.subChapterId);
content = content.replace(
    "const tables = criteriaTables.filter(t => t.chapter === chap.name);",
    "const tables = criteriaTables.filter(t => t.chapter === chap.name && !t.subChapterId);"
)

with open("src/App.jsx", "w") as f:
    f.write(content)

print("SUCCESS")
