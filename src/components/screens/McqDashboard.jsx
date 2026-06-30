import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function McqDashboard({ setScreen, startTest }) {
  const [hierarchy, setHierarchy] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [testSize, setTestSize] = useState(10);
  const [loading, setLoading] = useState(true);
  
  // Progress State
  const [showProgress, setShowProgress] = useState(false);
  const [progressStats, setProgressStats] = useState({}); // 'Sub|Chap|Les': { total, completed }
  const [isResetting, setIsResetting] = useState(false);
  const [expandedProgressSubject, setExpandedProgressSubject] = useState('');

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
      const stats = {};
      allData.forEach(row => {
        const sub = row.subject;
        let chap = row.chapter || '';
        let les = '';
        
        if (chap.includes('|||')) {
           const parts = chap.split('|||');
           chap = parts[0];
           les = parts[1];
        }

        if (!hier[sub]) hier[sub] = {};
        if (!hier[sub][chap]) hier[sub][chap] = new Set();
        if (les) hier[sub][chap].add(les);
        
        // Track stats
        const finalChapStr = les ? `${chap}|||${les}` : chap;
        const key = `${sub}|${finalChapStr}`;
        if (!stats[key]) stats[key] = { total: 0, completed: 0, subject: sub, chapterStr: finalChapStr };
        stats[key].total++;
        if (completedSet.has(row.id)) stats[key].completed++;
      });
      
      // Convert sets to arrays
      for (const s in hier) {
        for (const c in hier[s]) {
           hier[s][c] = Array.from(hier[s][c]);
        }
      }
      
      setHierarchy(hier);
      setProgressStats(stats);
      setLoading(false);
    }
    fetchHierarchy();
  }, []);
  
  const handleReplay = async (subject, chapterStr) => {
    if (!window.confirm("Are you sure you want to reset your progress for this lesson?")) return;
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

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><p>Loading database...</p></div>;

  if (showProgress) {
    // Group stats by Subject for the elegant UI
    const subjectsMap = {};
    Object.values(progressStats).forEach(stat => {
      if (!subjectsMap[stat.subject]) {
        subjectsMap[stat.subject] = { total: 0, completed: 0, lessons: [] };
      }
      subjectsMap[stat.subject].total += stat.total;
      subjectsMap[stat.subject].completed += stat.completed;
      subjectsMap[stat.subject].lessons.push(stat);
    });

    return (
      <div className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">📊 Progress Tracker</h1>
              <p className="text-sm font-bold text-slate-400 mt-1">Track your completed questions across all subjects.</p>
            </div>
            <button onClick={() => setShowProgress(false)} className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 hover:text-slate-900 font-bold rounded-xl text-sm shadow-sm transition-all hover:border-slate-300">Close</button>
          </div>
          
          <div className="space-y-4">
            {Object.keys(subjectsMap).length === 0 && (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-500 font-bold border border-slate-200">No data found. Take a test to see your progress!</div>
            )}
            
            {Object.keys(subjectsMap).sort().map(sub => {
              const subData = subjectsMap[sub];
              const isExpanded = expandedProgressSubject === sub;
              const subProgress = Math.round((subData.completed / subData.total) * 100) || 0;

              return (
                <div key={sub} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setExpandedProgressSubject(isExpanded ? '' : sub)}
                    className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl shadow-inner">📚</div>
                      <div className="text-left">
                        <h2 className="text-lg font-black text-slate-800 leading-none mb-1">{sub}</h2>
                        <p className="text-xs font-bold text-slate-400">{subData.completed} of {subData.total} Questions Completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="text-xs font-black text-indigo-600 w-8 text-right">{subProgress}%</div>
                        <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${subProgress}%` }} />
                        </div>
                      </div>
                      <span className={`text-slate-300 text-lg transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-3">
                      {subData.lessons.sort((a,b) => a.chapterStr.localeCompare(b.chapterStr)).map((stat, idx) => {
                        const remaining = stat.total - stat.completed;
                        const isDone = remaining <= 0;
                        const chapParts = stat.chapterStr.split('|||');
                        const displayChap = chapParts[0];
                        const displayLes = chapParts.length > 1 ? chapParts[1] : '';
                        const lesProgress = Math.round((stat.completed / stat.total) * 100) || 0;

                        return (
                          <div key={idx} className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                            
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{displayChap}</p>
                              <h3 className={`text-sm font-bold ${isDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {displayLes || 'Root MCQs'}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className={`text-xs font-black ${isDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                  {stat.completed} / {stat.total}
                                </span>
                                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                                  <div className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-indigo-400'}`} style={{ width: `${lesProgress}%` }} />
                                </div>
                              </div>
                              
                              <div className="w-24 flex justify-end">
                                {isDone ? (
                                  <button 
                                    disabled={isResetting}
                                    onClick={() => handleReplay(stat.subject, stat.chapterStr)}
                                    className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <span>🔄</span> Replay
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-lg">
                                    {remaining} Left
                                  </span>
                                )}
                              </div>
                            </div>

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
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-10">
        <h1 className="text-2xl font-black text-slate-800 mb-6 text-center">📝 Start MCQ</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
            <select 
              value={selectedSubject} 
              onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); setSelectedLesson(''); }}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
            >
              <option value="">Select a Subject...</option>
              {Object.keys(hierarchy).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {selectedSubject && (
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter</label>
               <select 
                 value={selectedChapter} 
                 onChange={e => { setSelectedChapter(e.target.value); setSelectedLesson(''); }}
                 className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
               >
                 <option value="">All Chapters</option>
                 {Object.keys(hierarchy[selectedSubject] || {}).map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
          )}

          {selectedChapter && hierarchy[selectedSubject]?.[selectedChapter]?.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lesson</label>
              <select 
                value={selectedLesson} 
                onChange={e => setSelectedLesson(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
              >
                <option value="">All Lessons</option>
                {hierarchy[selectedSubject][selectedChapter].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Number of Questions</label>
            <input 
              type="number" 
              min="5" max="100" 
              value={testSize} 
              onChange={e => setTestSize(Number(e.target.value))}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button 
              onClick={() => {
                 let finalChapter = selectedChapter;
                 if (selectedLesson) {
                    finalChapter = `${selectedChapter}|||${selectedLesson}`;
                 }
                 startTest({ subject: selectedSubject, chapter: finalChapter, size: testSize, mode: 'PRACTICE' });
              }}
              disabled={!selectedSubject}
              className={`flex-1 py-3 rounded-xl font-black text-white uppercase tracking-wider text-xs md:text-sm shadow-sm transition-colors ${selectedSubject ? 'bg-[#4F86F7] hover:bg-blue-600' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              📖 Practice
              <div className="text-[10px] opacity-80 font-bold normal-case mt-0.5">Instant Answers</div>
            </button>
            <button 
              onClick={() => {
                 let finalChapter = selectedChapter;
                 if (selectedLesson) {
                    finalChapter = `${selectedChapter}|||${selectedLesson}`;
                 }
                 startTest({ subject: selectedSubject, chapter: finalChapter, size: testSize, mode: 'TEST', timeLimitMinutes: testSize });
              }}
              disabled={!selectedSubject}
              className={`flex-1 py-3 rounded-xl font-black text-white uppercase tracking-wider text-xs md:text-sm shadow-sm transition-colors ${selectedSubject ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              ⏱ Test Mode
              <div className="text-[10px] opacity-80 font-bold normal-case mt-0.5">{testSize} Min Timer</div>
            </button>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-md space-y-3 mt-8">
        <button onClick={() => setShowProgress(true)} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
          📊 View Progress Tracker
        </button>
        <button onClick={() => setScreen('PLAYER_HOME')} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
          🧩 Crack-Criteria
        </button>
        <button onClick={() => supabase.auth.signOut()} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );
}
