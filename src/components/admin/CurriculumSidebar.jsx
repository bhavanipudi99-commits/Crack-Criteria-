import React, { useState } from 'react';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export default function CurriculumSidebar({
  appSubjects, setAppSubjects,
  appChapters, setAppChapters,
  appSubChapters, setAppSubChapters,
  expandedChapters, setExpandedChapters,
  
  // Optional lists and setters for cascading deletes/renames (e.g. Games)
  criteriaTables = [], setCriteriaTables = null,
  canvasConfigs = [], setCanvasConfigs = null,
  
  // Callbacks for when a folder is selected (used by MCQ Dashboard)
  onSelectFolder = null,
  selectedChapter = null,
  selectedSubChapter = null,

  // Render function for nested items (used by Admin Dashboard Games)
  renderItems = null,

  // Optional export/import handlers
  onExport = null,
  onImport = null
}) {
  // ── Renaming States ────────────────────────────────────────────────────────
  const [editingSubject, setEditingSubject] = useState({ oldName: '', newName: '' });
  const [editingChapter, setEditingChapter] = useState({ id: '', newName: '' });
  const [editingSubChapter, setEditingSubChapter] = useState({ id: '', newName: '' });

  // ── Curriculum creation forms ──────────────────────────────────────────────
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newChapterInput, setNewChapterInput] = useState('');
  const [newChapterSubject, setNewChapterSubject] = useState('Medicine');
  const [newSubChapterName, setNewSubChapterName] = useState('');
  const [newSubChapterParent, setNewSubChapterParent] = useState('');

  // ── CRUD Functions ───────────────────────────────────────────────────────
  const addSubject = () => {
    const n = newSubjectInput.trim();
    if (n && !appSubjects.includes(n)) { setAppSubjects(p => [...p, n]); setNewSubjectInput(''); }
    else alert('Subject empty or exists.');
  };

  const addChapter = () => {
    const n = newChapterInput.trim();
    const subj = newChapterSubject.trim() || 'General';
    if (n && !appChapters.some(c => c.name === n)) {
      setAppChapters(p => [...p, { id: uid('ch'), name: n, subject: subj }]);
      setAppSubjects(p => p.includes(subj) ? p : [...p, subj]);
      setNewChapterInput('');
    } else alert('Chapter empty or exists.');
  };

  const deleteChapter = (id, name) => {
    if (window.confirm(`Delete "${name}" and all its contents?`)) {
      setAppChapters(p => p.filter(c => c.id !== id));
      if (setCriteriaTables) setCriteriaTables(p => p.filter(t => t.chapter !== name));
      if (setCanvasConfigs) setCanvasConfigs(p => p.filter(c => c.chapter !== name));
    }
  };

  const addSubChapter = (chapName) => {
    const n = newSubChapterName.trim();
    if (!n) { alert('Enter a sub-chapter name.'); return; }
    const id = uid('sc');
    setAppSubChapters(p => [...p, { id, name: n, chapterName: chapName }]);
    setNewSubChapterName('');
    setNewSubChapterParent('');
  };

  const deleteSubChapter = (scId, chapName) => {
    if (!window.confirm('Delete this sub-chapter and all its contents?')) return;
    setAppSubChapters(p => p.filter(sc => sc.id !== scId));
    if (setCriteriaTables) setCriteriaTables(p => p.filter(t => t.subChapterId !== scId));
    if (setCanvasConfigs) setCanvasConfigs(p => p.filter(c => c.subChapterId !== scId));
  };

  const saveSubjectRename = (oldName) => {
    const newName = editingSubject.newName.trim();
    if (!newName || newName === oldName) {
      setEditingSubject({ oldName: '', newName: '' });
      return;
    }
    if (appSubjects.includes(newName)) {
      alert("Subject already exists!");
      return;
    }
    setAppSubjects(p => p.map(s => s === oldName ? newName : s));
    setAppChapters(p => p.map(c => c.subject === oldName ? { ...c, subject: newName } : c));
    setEditingSubject({ oldName: '', newName: '' });
  };

  const saveChapterRename = (chapId, oldName) => {
    const newName = editingChapter.newName.trim();
    if (!newName || newName === oldName) {
      setEditingChapter({ id: '', newName: '' });
      return;
    }
    if (appChapters.some(c => c.name === newName && c.id !== chapId)) {
      alert("Chapter name already exists!");
      return;
    }
    
    setAppChapters(p => p.map(c => c.id === chapId ? { ...c, name: newName } : c));
    setAppSubChapters(p => p.map(sc => sc.chapterName === oldName ? { ...sc, chapterName: newName } : sc));
    if (setCriteriaTables) setCriteriaTables(p => p.map(t => t.chapter === oldName ? { ...t, chapter: newName } : t));
    if (setCanvasConfigs) setCanvasConfigs(p => p.map(c => c.chapter === oldName ? { ...c, chapter: newName } : c));
    setEditingChapter({ id: '', newName: '' });
  };

  const saveSubChapterRename = (scId, oldName) => {
    const newName = editingSubChapter.newName.trim();
    if (!newName || newName === oldName) {
      setEditingSubChapter({ id: '', newName: '' });
      return;
    }
    setAppSubChapters(p => p.map(sc => sc.id === scId ? { ...sc, name: newName } : sc));
    setEditingSubChapter({ id: '', newName: '' });
  };

  const allSubjects = Array.from(new Set([...appSubjects, ...appChapters.map(c => c.subject)]));

  return (
    <div className="flex flex-col bg-white border-r border-slate-200 overflow-y-auto h-full w-[340px] flex-shrink-0 transition-all duration-300">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">📑 Curriculum Index</p>
        <div className="flex gap-2">
          {onExport && <button onClick={onExport} className="text-[9px] font-black text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded uppercase transition-colors">Export</button>}
          {onImport && (
            <label className="text-[9px] font-black text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 rounded uppercase transition-colors cursor-pointer">
              Import<input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          )}
        </div>
      </div>
      
      <div className="p-3 space-y-3">
        {/* Add Subject */}
        <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2">
          <span className="text-slate-400 text-base">📚</span>
          <input type="text" placeholder="New Subject name..." value={newSubjectInput}
            onChange={e => setNewSubjectInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            className="flex-1 px-2 py-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400" />
          <button onClick={addSubject} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg uppercase shadow-sm transition-all">Add</button>
        </div>

        {/* Tree View */}
        <div className="space-y-2">
          {allSubjects.map(sub => {
            const subChapters = appChapters.filter(c => c.subject === sub);
            const isSubExpanded = expandedChapters[`sub_${sub}`] !== false;

            return (
              <div key={sub} className="rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
                <button onClick={() => setExpandedChapters(p => ({ ...p, [`sub_${sub}`]: !isSubExpanded }))}
                  className="w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                    <span className="text-lg flex-shrink-0">📚</span>
                    {editingSubject.oldName === sub ? (
                      <input 
                        autoFocus
                        value={editingSubject.newName}
                        onChange={e => setEditingSubject({ ...editingSubject, newName: e.target.value })}
                        onBlur={() => saveSubjectRename(sub)}
                        onKeyDown={e => e.key === 'Enter' && saveSubjectRename(sub)}
                        onClick={e => e.stopPropagation()}
                        className="text-sm font-black text-slate-800 bg-white px-1.5 py-0.5 rounded w-full flex-1"
                      />
                    ) : (
                      <h1 className="text-sm font-black text-white tracking-tight truncate flex-1 text-left">{sub}</h1>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!editingSubject.oldName && (
                      <span onClick={(e) => { e.stopPropagation(); setEditingSubject({ oldName: sub, newName: sub }); }} className="text-[10px] text-indigo-300 hover:text-white cursor-pointer px-1">✎</span>
                    )}
                    <span className="text-[9px] font-bold text-indigo-200 bg-indigo-800/40 px-2 py-0.5 rounded-full">{subChapters.length} ch</span>
                    <span className={`text-indigo-200 text-xs transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </button>
                
                {isSubExpanded && (
                  <div className="p-2 bg-slate-50/50 space-y-1">
                    {subChapters.map(chap => {
                      const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                      const isChapExpanded = expandedChapters[`chap_${chap.id}`] !== false;
                      const isSelected = selectedChapter === chap.name && selectedSubChapter === null;

                      return (
                        <div key={chap.id} className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-colors ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}>
                          <button 
                            onClick={() => {
                              if (onSelectFolder) onSelectFolder(sub, chap.name, null);
                              else setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !isChapExpanded }));
                            }}
                            className={`w-full px-3 py-2 flex justify-between items-center transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                              <span className="text-slate-400 text-sm flex-shrink-0">📖</span>
                              {editingChapter.id === chap.id ? (
                                <input 
                                  autoFocus
                                  value={editingChapter.newName}
                                  onChange={e => setEditingChapter({ ...editingChapter, newName: e.target.value })}
                                  onBlur={() => saveChapterRename(chap.id, chap.name)}
                                  onKeyDown={e => e.key === 'Enter' && saveChapterRename(chap.id, chap.name)}
                                  onClick={e => e.stopPropagation()}
                                  className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded w-full flex-1"
                                />
                              ) : (
                                <h2 className={`text-xs font-bold truncate flex-1 text-left ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{chap.name}</h2>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!editingChapter.id && (
                                <span onClick={(e) => { e.stopPropagation(); setEditingChapter({ id: chap.id, newName: chap.name }); }} className="text-[10px] text-slate-400 hover:text-indigo-600 cursor-pointer px-1">✎</span>
                              )}
                              <span onClick={(e) => { e.stopPropagation(); deleteChapter(chap.id, chap.name); }} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 rounded transition-colors">Del</span>
                              <span 
                                onClick={(e) => { e.stopPropagation(); setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !isChapExpanded })); }}
                                className={`text-slate-400 font-bold text-[10px] p-1 transition-transform duration-300 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>
                            </div>
                          </button>

                          {isChapExpanded && (
                            <div className="bg-slate-50/30">
                              {/* Root Chapter Items */}
                              {renderItems && <div className="p-2">{renderItems(chap.name, null)}</div>}

                              {/* Sub-chapters */}
                              {chapSubChaps.length > 0 && (
                                <div className="px-2 pb-2 space-y-1 pt-1 border-t border-slate-100">
                                  {chapSubChaps.map(sc => {
                                    const isScExpanded = expandedChapters[`subchap_${sc.id}`];
                                    const isScSelected = selectedSubChapter === sc.id;
                                    
                                    return (
                                      <div key={sc.id} className={`bg-white border rounded-lg overflow-hidden ${isScSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}>
                                        <button 
                                          onClick={() => {
                                            if (onSelectFolder) onSelectFolder(sub, chap.name, sc.id);
                                            else setExpandedChapters(p => ({ ...p, [`subchap_${sc.id}`]: !isScExpanded }));
                                          }}
                                          className={`w-full px-3 py-2 flex items-center justify-between transition-colors ${isScSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                        >
                                          <div className="flex items-center gap-1.5 flex-1 mr-2 min-w-0">
                                            <span className="text-slate-300 text-xs border-l-2 border-slate-200 pl-1.5 flex-shrink-0">📂</span>
                                            {editingSubChapter.id === sc.id ? (
                                              <input 
                                                autoFocus
                                                value={editingSubChapter.newName}
                                                onChange={e => setEditingSubChapter({ ...editingSubChapter, newName: e.target.value })}
                                                onBlur={() => saveSubChapterRename(sc.id, sc.name)}
                                                onKeyDown={e => e.key === 'Enter' && saveSubChapterRename(sc.id, sc.name)}
                                                onClick={e => e.stopPropagation()}
                                                className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded w-full flex-1"
                                              />
                                            ) : (
                                              <span className={`text-xs font-bold truncate text-left ${isScSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{sc.name}</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {!editingSubChapter.id && (
                                              <span onClick={(e) => { e.stopPropagation(); setEditingSubChapter({ id: sc.id, newName: sc.name }); }} className="text-[10px] text-slate-400 hover:text-indigo-600 cursor-pointer px-1">✎</span>
                                            )}
                                            <span onClick={(e) => { e.stopPropagation(); deleteSubChapter(sc.id, chap.name); }} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 rounded transition-colors">Del</span>
                                            <span 
                                              onClick={(e) => { e.stopPropagation(); setExpandedChapters(p => ({ ...p, [`subchap_${sc.id}`]: !isScExpanded })); }}
                                              className={`text-slate-400 font-bold text-[10px] p-1 transition-transform duration-300 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                          </div>
                                        </button>
                                        
                                        {isScExpanded && renderItems && (
                                          <div className="p-2 bg-slate-50/30 border-t border-slate-100">
                                            {renderItems(chap.name, sc.id)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Add Sub-chapter */}
                              <div className="mx-2 mb-2 flex gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200">
                                <span className="text-slate-300 text-xs border-l-2 border-slate-200 pl-1.5">📂</span>
                                <input type="text" placeholder="+ New Sub-chapter..." value={newSubChapterParent === chap.name ? newSubChapterName : ''}
                                  onChange={e => { setNewSubChapterName(e.target.value); setNewSubChapterParent(chap.name); }}
                                  onClick={() => setNewSubChapterParent(chap.name)}
                                  className="flex-1 text-xs font-bold placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                                <button onClick={() => addSubChapter(chap.name)} className="text-[9px] font-black text-white bg-slate-600 hover:bg-slate-700 px-2.5 py-1 rounded uppercase transition-colors">Add</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Chapter to Subject */}
                    <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5 mt-1">
                      <span className="text-slate-400 text-sm">📖</span>
                      <input type="text" placeholder={`+ Chapter in ${sub}...`} value={newChapterSubject === sub ? newChapterInput : ''}
                        onChange={e => { setNewChapterInput(e.target.value); setNewChapterSubject(sub); }}
                        onClick={() => setNewChapterSubject(sub)}
                        className="flex-1 text-xs font-bold placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                      <button onClick={addChapter} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-2.5 py-1 rounded uppercase transition-colors">Add</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
