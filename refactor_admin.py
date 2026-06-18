import sys

with open("src/App.jsx", "r") as f:
    content = f.read()

start_marker = "  const renderAdminHome = () => {"
end_marker = "          {/* RIGHT PANEL: Canvas Composer or Placeholder */}"

if start_marker not in content or end_marker not in content:
    print("MARKERS NOT FOUND")
    sys.exit(1)

pre = content[:content.find(start_marker)]
post = content[content.find(end_marker):]

replacement = """  const renderAdminHome = () => {
    const allSubjects = Array.from(new Set([...appSubjects, ...appChapters.map(c => c.subject)]));

    const renderItems = (chapName, subChapId = null) => {
      const tables = criteriaTables.filter(t => t.chapter === chapName && (t.subChapterId || null) === subChapId);
      const canvases = canvasConfigs.filter(c => c.chapter === chapName && (c.subChapterId || null) === subChapId);
      const pureCanvases = canvases.filter(c => !c.type || c.type === 'CANVAS');
      const numConfigs = canvases.filter(c => c.type === 'NUMERICAL');
      const oddConfigs = canvases.filter(c => c.type === 'ODD_ONE_OUT');
      const scopeKey = subChapId ? `sub_${subChapId}` : `chap_${chapName}`;

      return (
        <div className="space-y-3 mt-2 mb-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
          {/* Tables */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1"><span>📋</span> Tables</p>
            </div>
            {tables.length > 0 && (
              <ul className="space-y-1 mb-2">
                {tables.map(t => (
                  <li key={t.id} className="flex items-center gap-2 group p-1.5 rounded-lg hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100">
                    <button onClick={() => { setSelectedTableId(t.id); setBuilderCriteria(JSON.parse(JSON.stringify(t.rows))); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setScreen('CRITERIA_TABLE_BUILDER'); }}
                      className="text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors text-left truncate flex-1">
                      {t.name}
                    </button>
                    <button onClick={() => deleteTable(t.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <input type="text" placeholder="+ New Table Name" value={newTableChapter === scopeKey ? newTableName : ''}
                onChange={e => { setNewTableName(e.target.value); setNewTableChapter(scopeKey); }}
                onClick={() => setNewTableChapter(scopeKey)}
                className="flex-1 px-2 py-1 text-[10px] font-bold bg-transparent focus:outline-none focus:text-indigo-700" />
              <button onClick={() => addCriteriaTable(chapName, subChapId)} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded uppercase shadow-sm transition-colors">Add</button>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full my-3"></div>

          {/* Canvases */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-1"><span>🎮</span> Games</p>
            </div>
            {canvases.length > 0 && (
              <ul className="space-y-1 mb-2">
                {pureCanvases.map(c => (
                  <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-teal-50 border-teal-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                      className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-teal-800' : 'text-slate-700 hover:text-teal-600'}`}>
                      <span className="text-teal-500">🧩</span> {c.name}
                    </button>
                    <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                  </li>
                ))}
                {numConfigs.map(c => (
                  <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                      className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-amber-800' : 'text-slate-700 hover:text-amber-600'}`}>
                      <span className="text-amber-500">🔢</span> {c.name}
                    </button>
                    <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                  </li>
                ))}
                {oddConfigs.map(c => (
                  <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-rose-50 border-rose-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                      className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-rose-800' : 'text-slate-700 hover:text-rose-600'}`}>
                      <span className="text-rose-500">❌</span> {c.name}
                    </button>
                    <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <input type="text" placeholder="Name new game..." value={newCanvasChapter === scopeKey ? newCanvasName : ''}
                onChange={e => { setNewCanvasName(e.target.value); setNewCanvasChapter(scopeKey); }}
                onClick={() => setNewCanvasChapter(scopeKey)}
                className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-500" />
              <div className="flex gap-2">
                <button onClick={() => addCanvas('CANVAS', chapName, subChapId)} className="flex-1 text-[9px] font-black text-white bg-teal-500 hover:bg-teal-600 py-1.5 rounded uppercase shadow-sm transition-colors">🧩 Jigsaw</button>
                <button onClick={() => { setNewCanvasName('Numerical Deck'); addCanvas('NUMERICAL', chapName, subChapId); }} className="flex-1 text-[9px] font-black text-white bg-amber-500 hover:bg-amber-600 py-1.5 rounded uppercase shadow-sm transition-colors">🔢 Num</button>
                <button onClick={() => { setNewCanvasName('Odd One Out Deck'); addCanvas('ODD_ONE_OUT', chapName, subChapId); }} className="flex-1 text-[9px] font-black text-white bg-rose-500 hover:bg-rose-600 py-1.5 rounded uppercase shadow-sm transition-colors">❌ Odd</button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 flex justify-between items-center z-30 shadow-sm relative">
          <div>
            <p className="text-[9px] font-black text-clinical-gold uppercase tracking-widest">Admin Dashboard</p>
            <h2 className="text-lg font-black text-slate-900">Curriculum Architect</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="mr-4 flex items-center">
              {!isCloudLoaded && <span className="text-[10px] font-bold text-amber-500 animate-pulse">Connecting...</span>}
              {isCloudLoaded && isSyncing && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Syncing... ☁️</span>}
              {isCloudLoaded && !isSyncing && <span className="text-[10px] font-bold text-teal-600">Cloud Synced ☁️✓</span>}
            </div>

            <button onClick={() => { setAdminPassword(''); setSelectedCanvasId(null); setScreen('GATE'); }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wide ml-2">Sign Out</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Universal Index - SMOOTH ACCORDIONS */}
          <div className={`flex flex-col bg-slate-100 border-r border-slate-200 overflow-y-auto transition-all duration-300 ${selectedCanvasId ? 'w-1/3 min-w-[320px] max-w-[400px]' : 'w-full'}`}>
            <div className="p-4 space-y-4">
              
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Curriculum Index</p>
              </div>

              {/* Add Subject */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[9px] font-black text-clinical-blue uppercase tracking-widest mb-2">Create New Subject</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Medicine" value={newSubjectInput}
                    onChange={e => setNewSubjectInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-clinical-blue" />
                  <button onClick={() => {
                    const subject = newSubjectInput.trim();
                    if (!subject) return;
                    if (!appSubjects.includes(subject)) setAppSubjects([...appSubjects, subject]);
                    setNewSubjectInput('');
                  }} className="text-[10px] font-black text-white bg-clinical-blue hover:bg-blue-700 px-4 py-2 rounded-lg uppercase shadow-sm transition-all">Add</button>
                </div>
              </div>

              {/* Tree View */}
              <div className="space-y-4">
                {allSubjects.map(sub => {
                  const subChapters = appChapters.filter(c => c.subject === sub);
                  const isSubExpanded = expandedChapters[`sub_${sub}`] !== false; // Default expanded
                  
                  return (
                    <div key={sub} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                      <button onClick={() => setExpandedChapters(p => ({ ...p, [`sub_${sub}`]: !isSubExpanded }))}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex justify-between items-center border-b border-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">📚</div>
                          <h1 className="text-base font-black text-slate-900">{sub}</h1>
                        </div>
                        <span className={`text-slate-400 font-bold transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                      </button>
                      
                      {isSubExpanded && (
                        <div className="p-3 bg-slate-50/50">
                          {subChapters.map(chap => {
                            const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                            const isChapExpanded = expandedChapters[`chap_${chap.id}`] !== false; // Default expanded

                            return (
                              <div key={chap.id} className="mb-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <button onClick={() => setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !isChapExpanded }))}
                                  className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-slate-400 text-sm">📖</span>
                                    <h2 className="text-sm font-bold text-slate-800">{chap.name}</h2>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span onClick={(e) => { e.stopPropagation(); deleteChapter(chap.id, chap.name); }} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded transition-colors">Del</span>
                                    <span className={`text-slate-400 font-bold transition-transform duration-300 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>
                                  </div>
                                </button>

                                {isChapExpanded && (
                                  <div className="p-3 bg-slate-50/50">
                                    {/* Root Chapter Items */}
                                    {renderItems(chap.name, null)}

                                    {/* Sub-chapters */}
                                    <div className="mt-4 space-y-3">
                                      {chapSubChaps.map(sc => {
                                        const isScExpanded = expandedChapters[`subchap_${sc.id}`]; // Default collapsed
                                        return (
                                          <div key={sc.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <button onClick={() => setExpandedChapters(p => ({ ...p, [`subchap_${sc.id}`]: !isScExpanded }))}
                                              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100">
                                              <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-sm">📂</span>
                                                <span className="text-xs font-bold text-slate-700">{sc.name}</span>
                                              </div>
                                              <span className={`text-slate-400 font-bold text-[10px] transition-transform duration-300 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                            </button>
                                            
                                            {isScExpanded && (
                                              <div className="p-2 bg-slate-50/50">
                                                {renderItems(chap.name, sc.id)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Add Sub-chapter */}
                                    <div className="mt-3 flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                      <span className="text-slate-400 text-sm">📂</span>
                                      <input type="text" placeholder="New Sub-chapter..." value={newSubChapterParent === chap.name ? newSubChapterName : ''}
                                        onChange={e => { setNewSubChapterName(e.target.value); setNewSubChapterParent(chap.name); }}
                                        onClick={() => setNewSubChapterParent(chap.name)}
                                        className="flex-1 text-xs font-bold placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                                      <button onClick={() => addSubChapter(chap.name)} className="text-[9px] font-black text-white bg-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded uppercase transition-colors shadow-sm">Add</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add Chapter to Subject */}
                          <div className="mt-4 flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-sm">📖</span>
                            <input type="text" placeholder={`Add Chapter to ${sub}...`} value={newChapterSubject === sub ? newChapterInput : ''}
                              onChange={e => { setNewChapterInput(e.target.value); setNewChapterSubject(sub); }}
                              onClick={() => setNewChapterSubject(sub)}
                              className="flex-1 text-xs font-bold placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                            <button onClick={addChapter} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-2 rounded uppercase transition-colors shadow-sm">Add</button>
                          </div>
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
