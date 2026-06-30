import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function McqDashboard({ setScreen, startTest }) {
  const [hierarchy, setHierarchy] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Accordion State
  const [expandedSubject, setExpandedSubject] = useState('');
  const [expandedChapter, setExpandedChapter] = useState('');
  
  // Action Panel State
  const [activePanelKey, setActivePanelKey] = useState(''); // 'Sub|Chap|Les'
  const [testSize, setTestSize] = useState(10);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function fetchHierarchy() {
      // 1. Get user session for history
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      let completedSet = new Set();
      if (userId) {
        try {
          const { data: hist } = await supabase.from('user_question_history').select('mcq_id').eq('user_id', userId);
          if (hist) completedSet = new Set(hist.map(h => h.mcq_id));
        } catch(e) { console.warn("No history table yet"); }
      }

      let allData = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase.from('mcqs').select('id, subject, chapter').range(from, from + step - 1);
        if (error) {
          console.error('Error fetching MCQs:', error);
          setLoading(false);
          return;
        }
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

        const isCompleted = completedSet.has(row.id);

        if (!hier[sub]) hier[sub] = { total: 0, completed: 0, chapters: {} };
        hier[sub].total++;
        if (isCompleted) hier[sub].completed++;

        if (!hier[sub].chapters[chap]) hier[sub].chapters[chap] = { total: 0, completed: 0, lessons: {} };
        hier[sub].chapters[chap].total++;
        if (isCompleted) hier[sub].chapters[chap].completed++;

        if (les) {
          if (!hier[sub].chapters[chap].lessons[les]) hier[sub].chapters[chap].lessons[les] = { total: 0, completed: 0 };
          hier[sub].chapters[chap].lessons[les].total++;
          if (isCompleted) hier[sub].chapters[chap].lessons[les].completed++;
        }
      });
      
      // We don't convert to arrays, we keep it as objects to easily map keys
      setHierarchy(hier);
      setLoading(false);
    }
    fetchHierarchy();
  }, []);

  const handleReplay = async (subject, chapterStr) => {
    if (!window.confirm("Are you sure you want to reset your progress for this?")) return;
    setIsResetting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.rpc('reset_lesson_progress', { p_user_id: userId, p_subject: subject, p_chapter: chapterStr });
        alert("Progress reset!");
        window.location.reload();
      }
    } catch (e) {
      alert("Failed to reset. Make sure the reset_lesson_progress SQL is applied!");
    }
    setIsResetting(false);
  };

  const renderActionPanel = (subject, chapter, lesson, stats) => {
    const finalChapterStr = lesson ? `${chapter}|||${lesson}` : chapter;
    const isDone = stats.completed >= stats.total;

    return (
      <div className="bg-slate-50 border-t border-slate-200 p-4 shadow-inner">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex-1 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Completed</p>
              <p className="text-lg font-black text-indigo-600">{stats.completed}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex-1 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Remaining</p>
              <p className="text-lg font-black text-rose-500">{stats.total - stats.completed}</p>
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Questions for Test</label>
            <input 
              type="number" min="1" max="100" value={testSize} 
              onChange={e => setTestSize(Number(e.target.value))}
              className="w-full p-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-center outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => startTest({ subject, chapter: finalChapterStr, size: testSize, mode: 'PRACTICE' })}
            disabled={isDone}
            className={`flex-1 py-3 rounded-xl font-black text-white uppercase text-xs shadow-sm transition-transform active:scale-95 ${isDone ? 'bg-slate-300' : 'bg-[#4F86F7] hover:bg-blue-600'}`}
          >
            📖 Practice
          </button>
          <button 
            onClick={() => startTest({ subject, chapter: finalChapterStr, size: testSize, mode: 'TEST', timeLimitMinutes: testSize })}
            disabled={isDone}
            className={`flex-1 py-3 rounded-xl font-black text-white uppercase text-xs shadow-sm transition-transform active:scale-95 ${isDone ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            ⏱ Test Mode
          </button>
          {isDone && (
            <button 
              onClick={() => handleReplay(subject, finalChapterStr)}
              disabled={isResetting}
              className="flex-1 py-3 rounded-xl font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 uppercase text-xs shadow-sm transition-transform active:scale-95"
            >
              🔄 Replay
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><p className="font-bold text-slate-500 animate-pulse">Loading database...</p></div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 items-center py-6 md:py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">📝 Start MCQ</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Select a topic to test</p>
          </div>
          <button onClick={() => setScreen('PLAYER_HOME')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold uppercase transition-colors">Back</button>
        </div>

        {/* Tree Accordion */}
        <div className="divide-y divide-slate-100">
          {Object.keys(hierarchy).sort().map(sub => {
            const subData = hierarchy[sub];
            const isSubExpanded = expandedSubject === sub;
            const subProgress = Math.round((subData.completed / subData.total) * 100) || 0;

            return (
              <div key={sub} className="flex flex-col">
                <button 
                  onClick={() => setExpandedSubject(isSubExpanded ? '' : sub)}
                  className={`flex justify-between items-center p-4 transition-colors ${isSubExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-slate-800">{sub}</h2>
                      <p className="text-[10px] font-bold text-slate-400">{subData.completed} / {subData.total} Qs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${subProgress}%` }} />
                    </div>
                    <span className={`text-slate-400 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </button>

                {isSubExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-200/60">
                    {Object.keys(subData.chapters).sort().map(chap => {
                      const chapData = subData.chapters[chap];
                      const isChapExpanded = expandedChapter === chap;
                      const hasLessons = Object.keys(chapData.lessons).length > 0;
                      
                      // If it has no lessons, the chapter itself is the action panel target
                      const isTarget = !hasLessons;
                      const chapPanelKey = `${sub}|${chap}|`;
                      const isChapPanelOpen = activePanelKey === chapPanelKey;
                      const chapProgress = Math.round((chapData.completed / chapData.total) * 100) || 0;

                      return (
                        <div key={chap} className="pl-6 pr-2 py-1 flex flex-col">
                          <button 
                            onClick={() => {
                              if (isTarget) {
                                setActivePanelKey(isChapPanelOpen ? '' : chapPanelKey);
                              } else {
                                setExpandedChapter(isChapExpanded ? '' : chap);
                              }
                            }}
                            className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isChapPanelOpen ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100'}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">📖</span>
                              <div className="text-left">
                                <h3 className="text-xs font-black text-slate-700">{chap}</h3>
                                <p className="text-[9px] font-bold text-slate-400">{chapData.completed} / {chapData.total} Qs</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                 <div className="h-full bg-blue-400 rounded-full" style={{ width: `${chapProgress}%` }} />
                               </div>
                               {!isTarget && <span className={`text-slate-300 text-xs transition-transform ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>}
                            </div>
                          </button>
                          
                          {isTarget && isChapPanelOpen && (
                            <div className="mt-2 mb-4 mx-2 rounded-xl overflow-hidden border border-indigo-100">
                               {renderActionPanel(sub, chap, null, chapData)}
                            </div>
                          )}

                          {hasLessons && isChapExpanded && (
                            <div className="ml-4 mt-2 mb-3 space-y-1">
                              {Object.keys(chapData.lessons).sort().map(les => {
                                const lesData = chapData.lessons[les];
                                const lesPanelKey = `${sub}|${chap}|${les}`;
                                const isLesPanelOpen = activePanelKey === lesPanelKey;
                                const isDone = lesData.completed >= lesData.total;
                                
                                return (
                                  <div key={les} className="flex flex-col">
                                    <button 
                                      onClick={() => setActivePanelKey(isLesPanelOpen ? '' : lesPanelKey)}
                                      className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isLesPanelOpen ? 'bg-white shadow-sm ring-1 ring-slate-200 z-10' : 'hover:bg-white/50'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-300 text-xs pl-1">📂</span>
                                        <h4 className={`text-xs font-bold ${isDone ? 'text-emerald-600 line-through opacity-70' : 'text-slate-600'}`}>{les}</h4>
                                      </div>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {lesData.completed}/{lesData.total}
                                      </span>
                                    </button>
                                    
                                    {isLesPanelOpen && (
                                      <div className="mx-1 mt-1 mb-2 rounded-xl overflow-hidden border border-indigo-100 shadow-sm relative z-20">
                                        {renderActionPanel(sub, chap, les, lesData)}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-8 text-center">
         <button onClick={() => supabase.auth.signOut()} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );
}
