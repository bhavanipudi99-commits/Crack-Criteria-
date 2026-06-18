import sys

with open("src/App.jsx", "r") as f:
    content = f.read()

start_marker = "  const renderPlayerHome = () => ("
end_marker = "      <button onClick={() => setScreen('GATE')}"

if start_marker not in content or end_marker not in content:
    print("MARKERS NOT FOUND")
    sys.exit(1)

pre = content[:content.find(start_marker)]
post = content[content.find(end_marker):]

replacement = """  const renderPlayerHome = () => (
    <div className="flex flex-col items-center justify-between h-full p-6 bg-slate-50">
      <div className="mt-4 text-center">
        <span className="text-[10px] font-black text-clinical-blue uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-full">Jigsaw v3.0</span>
        <h1 className="text-3xl font-black mt-3 tracking-tight text-slate-900">MAMS PUZZLE</h1>
      </div>
      <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm my-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {['easy', 'medium', 'hard'].map(lvl => (
              <button key={lvl} onClick={() => setDifficulty(lvl)}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${difficulty === lvl ? 'border-clinical-blue bg-blue-50 text-clinical-blue shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                {lvl} ({lvl === 'easy' ? '60s' : lvl === 'medium' ? '45s' : '30s'})
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400 font-bold mb-2">Game Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveGameMode('CANVAS')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'CANVAS' ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🧩 Canvas</button>
            <button onClick={() => setActiveGameMode('NUMERICAL')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'NUMERICAL' ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🔢 Numbers</button>
            <button onClick={() => setActiveGameMode('ODD_ONE_OUT')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'ODD_ONE_OUT' ? 'border-rose-400 bg-rose-50 text-rose-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>❌ Odd One</button>
            <button onClick={() => setActiveGameMode('MIXED_MARATHON')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'MIXED_MARATHON' ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>🏆 Marathon</button>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3 flex-1 overflow-hidden flex flex-col">
          <p className="text-[10px] text-slate-400 font-bold mb-2">Curriculum Index</p>
          <div className="space-y-3 overflow-y-auto pr-2 pb-4 flex-1">
            {activeGameMode === 'MIXED_MARATHON' && (
              <div className="mb-4 space-y-2">
                <button onClick={() => startGame(null, null, null, true)}
                  className="w-full text-left py-3 px-4 rounded-xl text-sm font-black text-white bg-slate-800 hover:bg-slate-900 transition-all shadow-md flex justify-between items-center group">
                  <span className="flex items-center gap-2"><span>🌎</span> Global Marathon (All Subjects)</span>
                  <span className="group-hover:translate-x-1 transition-transform">▶</span>
                </button>
                {appSubjects.map(subj => (
                  <button key={`subj-${subj}`} onClick={() => startGame(null, null, subj)}
                    className="w-full text-left py-3 px-4 rounded-xl text-sm font-black text-fuchsia-900 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 transition-all shadow-sm flex justify-between items-center group">
                    <span className="flex items-center gap-2"><span>🏆</span> Subject Marathon: {subj}</span>
                    <span className="group-hover:translate-x-1 transition-transform">▶</span>
                  </button>
                ))}
              </div>
            )}
            
            {appSubjects.map(subj => {
              const subjChapters = appChapters.filter(c => c.subject === subj);
              if (subjChapters.length === 0) return null;
              const isSubExpanded = !!expandedChapters[`player_sub_${subj}`];
              
              return (
                <div key={subj} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                  <button onClick={() => setExpandedChapters(p => ({...p, [`player_sub_${subj}`]: !isSubExpanded}))}
                    className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">📚</div>
                      <h1 className="text-base font-black text-slate-800">{subj}</h1>
                    </div>
                    <span className={`text-slate-400 font-bold transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  
                  {isSubExpanded && (
                    <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/30">
                      {subjChapters.map(chap => {
                        const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                        const isMarathon = activeGameMode === 'MIXED_MARATHON';
                        const isChapExpanded = !!expandedChapters[`player_chap_${chap.id}`];
                        
                        return (
                          <div key={chap.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <button onClick={() => setExpandedChapters(p => ({...p, [`player_chap_${chap.id}`]: !isChapExpanded}))}
                              className="w-full px-3 py-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <span className="text-slate-400 text-sm">📖</span>
                                <h2 className="text-sm font-bold text-slate-700">{chap.name}</h2>
                              </div>
                              <div className="flex items-center gap-3">
                                {isMarathon && (
                                  <button onClick={(e) => { e.stopPropagation(); startGame(chap.name); }} 
                                    className="text-[10px] font-black bg-fuchsia-100 text-fuchsia-700 px-3 py-1.5 rounded-full hover:bg-fuchsia-200 transition-colors shadow-sm">
                                    ▶ PLAY MARATHON
                                  </button>
                                )}
                                {!isMarathon && <span className={`text-slate-300 text-xs transition-transform duration-300 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>}
                              </div>
                            </button>
                            
                            {!isMarathon && isChapExpanded && (
                              <div className="p-2 border-t border-slate-50 bg-slate-50/50">
                                {/* Root Canvases */}
                                {(() => {
                                  const rootCanvases = canvasConfigs.filter(c => c.chapter === chap.name && !c.subChapterId && c.questions.some(q => q.selectedTileIds.length > 0));
                                  if (!rootCanvases.length) return null;
                                  return (
                                    <div className="space-y-1 mb-2">
                                      {rootCanvases.map(canvas => (
                                        <button key={canvas.id} onClick={() => startGame(chap.name, canvas.id)} 
                                          className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-clinical-blue hover:shadow-md transition-all group">
                                          <div className="flex items-center gap-2">
                                            <span className="text-clinical-blue group-hover:scale-110 transition-transform">🧩</span>
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-clinical-blue transition-colors">{canvas.name}</span>
                                          </div>
                                          <span className="text-[10px] font-black text-slate-300 group-hover:text-clinical-blue transition-colors">PLAY →</span>
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
                                    <div key={sc.id} className="mb-2 bg-white rounded-lg border border-slate-100 overflow-hidden">
                                      <button onClick={() => setExpandedChapters(p => ({...p, [`player_sc_${sc.id}`]: !isScExpanded}))}
                                        className="w-full px-3 py-2 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-400 text-xs">📂</span>
                                          <span className="text-xs font-bold text-slate-600">{sc.name}</span>
                                        </div>
                                        <span className={`text-slate-300 text-[10px] transition-transform duration-300 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                      </button>
                                      
                                      {isScExpanded && (
                                        <div className="p-2 space-y-1 bg-white border-t border-slate-50">
                                          {scCanvases.map(canvas => (
                                            <button key={canvas.id} onClick={() => startGame(chap.name, canvas.id)} 
                                              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-clinical-blue hover:bg-white hover:shadow-sm transition-all group">
                                              <div className="flex items-center gap-2">
                                                <span className="text-clinical-blue group-hover:scale-110 transition-transform">🧩</span>
                                                <span className="text-xs font-bold text-slate-700 group-hover:text-clinical-blue transition-colors">{canvas.name}</span>
                                              </div>
                                              <span className="text-[10px] font-black text-slate-300 group-hover:text-clinical-blue transition-colors">PLAY →</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {canvasConfigs.filter(c => c.chapter === chap.name && c.questions.some(q => q.selectedTileIds.length > 0)).length === 0 && (
                                  <div className="p-4 text-center">
                                    <span className="text-2xl mb-2 block">📭</span>
                                    <p className="text-[10px] font-bold text-slate-400">No playable games yet.</p>
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
          </div>
        </div>
      </div>
"""

with open("src/App.jsx", "w") as f:
    f.write(pre + replacement + post)

print("SUCCESS")
