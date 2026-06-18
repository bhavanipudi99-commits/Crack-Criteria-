import sys

with open("src/App.jsx", "r") as f:
    lines = f.readlines()

start_idx = 1888
end_idx = 1984

pre = lines[:start_idx]
post = lines[end_idx:]

replacement = """              {/* Tree View - Notion Style */}
              <div className="space-y-0.5">
                {allSubjects.map(sub => {
                  const subChapters = appChapters.filter(c => c.subject === sub);
                  const isSubExpanded = expandedChapters[`sub_${sub}`] !== false;
                  
                  return (
                    <div key={sub} className="flex flex-col text-slate-700">
                      <button onClick={() => setExpandedChapters(p => ({ ...p, [`sub_${sub}`]: !isSubExpanded }))}
                        className="w-full px-2 py-1.5 flex items-center gap-1.5 hover:bg-slate-200/60 rounded-md transition-colors group">
                        <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                        <div className="flex items-center gap-2 flex-1 text-left">
                          <span className="text-sm">📚</span>
                          <span className="text-xs font-bold text-slate-800">{sub}</span>
                        </div>
                      </button>
                      
                      {isSubExpanded && (
                        <div className="flex flex-col pl-4 border-l border-slate-200 ml-2.5 mt-0.5 space-y-0.5">
                          {subChapters.map(chap => {
                            const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                            const isChapExpanded = expandedChapters[`chap_${chap.id}`] !== false;

                            return (
                              <div key={chap.id} className="flex flex-col">
                                <div className="flex items-center group w-full px-2 py-1.5 hover:bg-slate-200/60 rounded-md transition-colors">
                                  <button onClick={() => setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !isChapExpanded }))}
                                    className="flex items-center gap-1.5 flex-1">
                                    <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>
                                    <span className="text-sm">📖</span>
                                    <span className="text-xs font-semibold text-slate-700 text-left truncate">{chap.name}</span>
                                  </button>
                                  <span onClick={(e) => { e.stopPropagation(); deleteChapter(chap.id, chap.name); }} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Del</span>
                                </div>

                                {isChapExpanded && (
                                  <div className="flex flex-col pl-4 border-l border-slate-200 ml-2.5 mt-0.5 space-y-0.5">
                                    {/* Root Chapter Items */}
                                    {renderItems(chap.name, null)}

                                    {/* Sub-chapters */}
                                    {chapSubChaps.map(sc => {
                                      const isScExpanded = expandedChapters[`subchap_${sc.id}`];
                                      return (
                                        <div key={sc.id} className="flex flex-col">
                                          <button onClick={() => setExpandedChapters(p => ({ ...p, [`subchap_${sc.id}`]: !isScExpanded }))}
                                            className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-slate-200/60 rounded-md transition-colors">
                                            <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                            <span className="text-sm">📂</span>
                                            <span className="text-[11px] font-medium text-slate-600">{sc.name}</span>
                                          </button>
                                          
                                          {isScExpanded && (
                                            <div className="pl-6 mt-0.5">
                                              {renderItems(chap.name, sc.id)}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Add Sub-chapter */}
                                    <div className="flex items-center gap-1.5 px-2 py-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                                      <span className="text-slate-400 text-[10px]">➕</span>
                                      <input type="text" placeholder="Add Sub-chapter..." value={newSubChapterParent === chap.name ? newSubChapterName : ''}
                                        onChange={e => { setNewSubChapterName(e.target.value); setNewSubChapterParent(chap.name); }}
                                        onClick={() => setNewSubChapterParent(chap.name)}
                                        onKeyDown={e => { if (e.key === 'Enter') addSubChapter(chap.name); }}
                                        className="flex-1 text-[10px] font-medium placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add Chapter to Subject */}
                          <div className="flex items-center gap-1.5 px-2 py-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                            <span className="text-slate-400 text-[10px]">➕</span>
                            <input type="text" placeholder={`Add Chapter to ${sub}...`} value={newChapterSubject === sub ? newChapterInput : ''}
                              onChange={e => { setNewChapterInput(e.target.value); setNewChapterSubject(sub); }}
                              onClick={() => setNewChapterSubject(sub)}
                              onKeyDown={e => { if (e.key === 'Enter') addChapter(); }}
                              className="flex-1 text-[11px] font-medium placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
"""

with open("src/App.jsx", "w") as f:
    f.writelines(pre)
    f.write(replacement)
    f.write("\n")
    f.writelines(post)

print("SUCCESS")
