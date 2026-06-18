import sys

with open("src/App.jsx", "r") as f:
    lines = f.readlines()

# The tree view starts around line 1254: `            {appSubjects.map(subj => {`
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "            {appSubjects.map(subj => {" in line:
        start_idx = i
        break

for i in range(start_idx + 1, len(lines)):
    if "            })}" in lines[i] and "          </div>" in lines[i+1]:
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print(f"MARKERS NOT FOUND {start_idx} {end_idx}")
    sys.exit(1)

pre = lines[:start_idx]
post = lines[end_idx + 1:]

replacement = """            {appSubjects.map(subj => {
              const subjChapters = appChapters.filter(c => c.subject === subj);
              if (subjChapters.length === 0) return null;
              const isSubExpanded = !!expandedChapters[`player_sub_${subj}`];
              
              return (
                <div key={subj} className="flex flex-col text-slate-700">
                  <button onClick={() => setExpandedChapters(p => ({...p, [`player_sub_${subj}`]: !isSubExpanded}))}
                    className="w-full px-2 py-1.5 flex items-center gap-1.5 hover:bg-slate-200/60 rounded-md transition-colors group">
                    <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <div className="flex items-center gap-2 flex-1 text-left">
                      <span className="text-sm">📚</span>
                      <span className="text-xs font-bold text-slate-800">{subj}</span>
                    </div>
                  </button>
                  
                  {isSubExpanded && (
                    <div className="flex flex-col pl-4 border-l border-slate-200 ml-2.5 mt-0.5 space-y-0.5">
                      {subjChapters.map(chap => {
                        const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                        const isMarathon = activeGameMode === 'MIXED_MARATHON';
                        const isChapExpanded = !!expandedChapters[`player_chap_${chap.id}`];
                        
                        return (
                          <div key={chap.id} className="flex flex-col">
                            <div className="flex items-center group w-full px-2 py-1.5 hover:bg-slate-200/60 rounded-md transition-colors">
                              <button onClick={() => !isMarathon && setExpandedChapters(p => ({...p, [`player_chap_${chap.id}`]: !isChapExpanded}))}
                                className="flex items-center gap-1.5 flex-1 text-left">
                                {!isMarathon && <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>}
                                {isMarathon && <span className="text-[10px] text-slate-400 font-bold">▶</span>}
                                <span className="text-sm">📖</span>
                                <span className="text-xs font-semibold text-slate-700 truncate">{chap.name}</span>
                              </button>
                              {isMarathon && (
                                <button onClick={(e) => { e.stopPropagation(); startGame(chap.name); }} 
                                  className="text-[9px] font-black bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded-full hover:bg-fuchsia-200 transition-colors shadow-sm ml-2">
                                  PLAY MARATHON
                                </button>
                              )}
                            </div>
                            
                            {!isMarathon && isChapExpanded && (
                              <div className="flex flex-col pl-4 border-l border-slate-200 ml-2.5 mt-0.5 space-y-0.5">
                                {/* Root Canvases */}
                                {(() => {
                                  const rootCanvases = canvasConfigs.filter(c => c.chapter === chap.name && !c.subChapterId && c.questions.some(q => q.selectedTileIds.length > 0));
                                  if (!rootCanvases.length) return null;
                                  return (
                                    <div className="space-y-0.5 mb-1">
                                      {rootCanvases.map(canvas => (
                                        <button key={canvas.id} onClick={() => startGame(chap.name, canvas.id)} 
                                          className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-200/60 rounded-md transition-all group">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm group-hover:scale-110 transition-transform">🧩</span>
                                            <span className="text-[11px] font-medium text-slate-700 group-hover:text-clinical-blue transition-colors">{canvas.name}</span>
                                          </div>
                                          <span className="text-[9px] font-black text-clinical-blue opacity-0 group-hover:opacity-100 transition-opacity">PLAY →</span>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Sub-chapters */}
                                {chapSubChaps.map(sc => {
                                  const scCanvases = canvasConfigs.filter(c => c.chapter === chap.name && c.subChapterId === sc.id && c.questions.some(q => q.selectedTileIds.length > 0));
                                  if (!scCanvases.length) return null;
                                  const isScExpanded = !!expandedChapters[`player_sc_${sc.id}`];
                                  
                                  return (
                                    <div key={sc.id} className="flex flex-col">
                                      <button onClick={() => setExpandedChapters(p => ({...p, [`player_sc_${sc.id}`]: !isScExpanded}))}
                                        className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-slate-200/60 rounded-md transition-colors">
                                        <span className={`text-[10px] text-slate-400 font-bold transition-transform duration-200 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <span className="text-sm">📂</span>
                                        <span className="text-[11px] font-medium text-slate-600">{sc.name}</span>
                                      </button>
                                      
                                      {isScExpanded && (
                                        <div className="flex flex-col pl-6 mt-0.5 space-y-0.5">
                                          {scCanvases.map(canvas => (
                                            <button key={canvas.id} onClick={() => startGame(chap.name, canvas.id)} 
                                              className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-200/60 rounded-md transition-all group">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm group-hover:scale-110 transition-transform">🧩</span>
                                                <span className="text-[11px] font-medium text-slate-600 group-hover:text-clinical-blue transition-colors">{canvas.name}</span>
                                              </div>
                                              <span className="text-[9px] font-black text-clinical-blue opacity-0 group-hover:opacity-100 transition-opacity">PLAY →</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {canvasConfigs.filter(c => c.chapter === chap.name && c.questions.some(q => q.selectedTileIds.length > 0)).length === 0 && (
                                  <div className="px-2 py-2 text-left opacity-50">
                                    <p className="text-[10px] font-medium text-slate-500 italic">No playable games yet.</p>
                                  </div>
                                )}
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
"""

with open("src/App.jsx", "w") as f:
    f.writelines(pre)
    f.write(replacement)
    f.writelines(post)

print("SUCCESS")
