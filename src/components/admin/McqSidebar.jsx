import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export default function McqSidebar({
  onSelectFolder = null,
  selectedChapter = null,
  selectedSubChapter = null,
  refreshTrigger = 0
}) {
  const [hierarchy, setHierarchy] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  
  // Temporary additions (so user can create a folder before uploading to DB)
  const [tempSubjects, setTempSubjects] = useState([]);
  const [tempChapters, setTempChapters] = useState({}); // { subject: [chap1, chap2] }
  const [tempSubChapters, setTempSubChapters] = useState({}); // { 'subject|chap': [subchap1] }

  // Forms
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newChapterInput, setNewChapterInput] = useState('');
  const [newChapterSubject, setNewChapterSubject] = useState('');
  const [newSubChapterName, setNewSubChapterName] = useState('');
  const [newSubChapterParent, setNewSubChapterParent] = useState('');

  useEffect(() => {
    fetchHierarchy();
  }, [refreshTrigger]);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      let allData = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase.from('mcqs').select('subject, chapter').range(from, from + step - 1);
        if (error) throw error;
        allData = allData.concat(data);
        if (data.length < step) hasMore = false;
        from += step;
      }
      
      const hier = {};
      allData.forEach(row => {
        const sub = row.subject || 'Unknown';
        let chap = row.chapter || 'Unknown';
        let les = '';
        
        if (chap.includes('|||')) {
           const parts = chap.split('|||');
           chap = parts[0];
           les = parts[1];
        }

        if (!hier[sub]) hier[sub] = {};
        if (!hier[sub][chap]) hier[sub][chap] = new Set();
        if (les) hier[sub][chap].add(les);
      });
      
      // Convert sets to arrays
      for (const s in hier) {
        for (const c in hier[s]) {
           hier[s][c] = Array.from(hier[s][c]).sort();
        }
      }
      
      setHierarchy(hier);
    } catch (e) {
      console.error("Error fetching MCQ index:", e);
    }
    setLoading(false);
  };

  const addSubject = () => {
    const n = newSubjectInput.trim();
    if (n && !hierarchy[n] && !tempSubjects.includes(n)) {
      setTempSubjects(p => [...p, n]);
      setExpanded(p => ({ ...p, [`sub_${n}`]: true }));
      setNewSubjectInput('');
    }
  };

  const addChapter = () => {
    const n = newChapterInput.trim();
    const subj = newChapterSubject.trim();
    if (n && subj) {
      setTempChapters(p => ({ ...p, [subj]: [...(p[subj] || []), n] }));
      setExpanded(p => ({ ...p, [`chap_${subj}_${n}`]: true }));
      setNewChapterInput('');
    }
  };

  const addSubChapter = (subj, chapName) => {
    const n = newSubChapterName.trim();
    if (n) {
      const key = `${subj}|${chapName}`;
      setTempSubChapters(p => ({ ...p, [key]: [...(p[key] || []), n] }));
      setNewSubChapterName('');
    }
  };

  // Combine DB hierarchy with Temporary hierarchy
  const allSubjects = Array.from(new Set([...Object.keys(hierarchy), ...tempSubjects])).sort();

  return (
    <div className="flex flex-col bg-white border-r border-slate-200 overflow-y-auto h-full w-[340px] flex-shrink-0 transition-all duration-300">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🗄️ Database Index</p>
          <p className="text-[9px] font-bold text-slate-400">Actual MCQ Folders</p>
        </div>
        <button onClick={fetchHierarchy} className="text-lg hover:rotate-180 transition-transform text-slate-400 hover:text-indigo-600">↻</button>
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Scanning DB...</div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Add Subject */}
          <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2">
            <span className="text-slate-400 text-base">📚</span>
            <input type="text" placeholder="New Subject..." value={newSubjectInput}
              onChange={e => setNewSubjectInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubject()}
              className="flex-1 px-2 py-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400" />
            <button onClick={addSubject} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg uppercase shadow-sm transition-all">Add</button>
          </div>

          <div className="space-y-2">
            {allSubjects.map(sub => {
              const dbChaps = hierarchy[sub] ? Object.keys(hierarchy[sub]) : [];
              const tmpChaps = tempChapters[sub] || [];
              const allChaps = Array.from(new Set([...dbChaps, ...tmpChaps])).sort();
              const isSubExpanded = expanded[`sub_${sub}`] !== false;

              return (
                <div key={sub} className="rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
                  <button onClick={() => setExpanded(p => ({ ...p, [`sub_${sub}`]: !isSubExpanded }))}
                    className="w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                      <span className="text-lg flex-shrink-0">📚</span>
                      <h1 className="text-sm font-black text-white tracking-tight truncate flex-1 text-left">{sub}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-bold text-indigo-200 bg-indigo-800/40 px-2 py-0.5 rounded-full">{allChaps.length} ch</span>
                      <span className={`text-indigo-200 text-xs transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </button>
                  
                  {isSubExpanded && (
                    <div className="p-2 bg-slate-50/50 space-y-1">
                      {allChaps.map(chap => {
                        const dbLes = hierarchy[sub]?.[chap] || [];
                        const tmpLes = tempSubChapters[`${sub}|${chap}`] || [];
                        const allLes = Array.from(new Set([...dbLes, ...tmpLes])).sort();
                        
                        const isChapExpanded = expanded[`chap_${sub}_${chap}`];
                        // If no lessons selected but this chapter is, it's root chapter selection
                        const isSelected = selectedChapter === chap && selectedSubChapter === null;

                        return (
                          <div key={chap} className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-colors ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}>
                            <button 
                              onClick={() => {
                                if (onSelectFolder) onSelectFolder(sub, chap, null);
                                setExpanded(p => ({ ...p, [`chap_${sub}_${chap}`]: !isChapExpanded }));
                              }}
                              className={`w-full px-3 py-2 flex justify-between items-center transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                                <span className="text-slate-400 text-sm flex-shrink-0">📖</span>
                                <h2 className={`text-xs font-bold truncate flex-1 text-left ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{chap}</h2>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setExpanded(p => ({ ...p, [`chap_${sub}_${chap}`]: !isChapExpanded })); }}
                                  className={`text-slate-400 font-bold text-[10px] p-1 transition-transform duration-300 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>
                              </div>
                            </button>

                            {isChapExpanded && (
                              <div className="bg-slate-50/30">
                                {allLes.length > 0 && (
                                  <div className="px-2 pb-2 space-y-1 pt-1 border-t border-slate-100">
                                    {allLes.map(les => {
                                      // Note: in MCQ dashboard, selectedSubChapter is actually the lesson name right now since we parse '|||'.
                                      const isScSelected = selectedSubChapter === les && selectedChapter === chap;
                                      
                                      return (
                                        <div key={les} className={`bg-white border rounded-lg overflow-hidden ${isScSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}>
                                          <button 
                                            onClick={() => {
                                              if (onSelectFolder) onSelectFolder(sub, chap, les);
                                            }}
                                            className={`w-full px-3 py-2 flex items-center justify-between transition-colors ${isScSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                          >
                                            <div className="flex items-center gap-1.5 flex-1 mr-2 min-w-0">
                                              <span className="text-slate-300 text-xs border-l-2 border-slate-200 pl-1.5 flex-shrink-0">📂</span>
                                              <span className={`text-xs font-bold truncate text-left ${isScSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{les}</span>
                                            </div>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                <div className="mx-2 mb-2 flex gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200">
                                  <span className="text-slate-300 text-xs border-l-2 border-slate-200 pl-1.5">📂</span>
                                  <input type="text" placeholder="+ New Lesson..." value={newSubChapterParent === chap ? newSubChapterName : ''}
                                    onChange={e => { setNewSubChapterName(e.target.value); setNewSubChapterParent(chap); }}
                                    onClick={() => setNewSubChapterParent(chap)}
                                    className="flex-1 text-xs font-bold placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent" />
                                  <button onClick={() => addSubChapter(sub, chap)} className="text-[9px] font-black text-white bg-slate-600 hover:bg-slate-700 px-2.5 py-1 rounded uppercase transition-colors">Add</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

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
      )}
    </div>
  );
}
