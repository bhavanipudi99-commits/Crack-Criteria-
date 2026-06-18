import re

with open("src/App.jsx", "r") as f:
    content = f.read()

# We need to inject the sub-chapter UI logic.
# Look at the chapter mapping:
# {subChapters.map(chap => {
#    const chapExpanded = expandedChapters[`chap_${chap.id}`] !== false;
#    ...
#    return ( <div key={chap.id}> ... </div> )
# })}

# Let's replace the content inside the map function.
# But it's easier to just do string replacements on the specific buttons!

# 1. Add "+ Sub-chapter" input and button right before {/* TABLES */}
target = "{/* TABLES */}"
replacement = """{/* SUB-CHAPTERS */}
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
                                                <p className="text-[9px] font-black text-slate-400 italic">Sub-chapter content coming soon!</p>
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

                                  {/* TABLES */}"""

content = content.replace(target, replacement)

with open("src/App.jsx", "w") as f:
    f.write(content)

print("SUCCESS")
