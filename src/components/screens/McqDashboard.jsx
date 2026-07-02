import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function McqDashboard({ setScreen, startTest, viewPastResults }) {
  const [hierarchy, setHierarchy] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [testSize, setTestSize] = useState(10);
  const [loading, setLoading] = useState(true);
  
  // Progress State
  const [progressStats, setProgressStats] = useState({});
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function fetchHierarchy() {
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
        if (error) { console.error('Error fetching MCQs:', error); setLoading(false); return; }
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
        
        const finalChapStr = les ? `${chap}|||${les}` : chap;
        const key = `${sub}|${finalChapStr}`;
        if (!stats[key]) stats[key] = { total: 0, completed: 0, subject: sub, chapterStr: finalChapStr, chap, les };
        stats[key].total++;
        if (completedSet.has(row.id)) stats[key].completed++;
      });
      
      for (const s in hier)
        for (const c in hier[s])
           hier[s][c] = Array.from(hier[s][c]);
      
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

  const handleReview = async (subject, chapterStr) => {
    setIsResetting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      
      let query = supabase.from('mcqs').select('*').eq('subject', subject);
      if (chapterStr) query = query.like('chapter', chapterStr.includes('|||') ? chapterStr : `${chapterStr}%`);
      const { data: mcqs } = await query;
      
      const { data: hist } = await supabase.from('user_question_history').select('mcq_id, is_correct').eq('user_id', userId);
      const histMap = {};
      (hist || []).forEach(h => histMap[h.mcq_id] = h.is_correct);
      
      const answeredMcqs = mcqs.filter(m => histMap[m.id] !== undefined);
      const results = answeredMcqs.map(q => ({
        question: q,
        isCorrect: histMap[q.id],
        userAnswer: histMap[q.id] ? q.correct_answer : 'UNKNOWN'
      }));
      
      if (viewPastResults) viewPastResults(results);
    } catch (e) {
      console.error(e);
      alert("Failed to load past results.");
    }
    setIsResetting(false);
  };

  const getStats = (sub, chap, les) => {
    const key = `${sub}|${les ? `${chap}|||${les}` : chap}`;
    return progressStats[key] || { total: 0, completed: 0 };
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><p className="font-bold text-slate-400">Loading database...</p></div>;

  // Calculate current active stats
  const stSub = selectedSubject ? getStats(selectedSubject, '', '') : null;
  const stChap = selectedChapter ? getStats(selectedSubject, selectedChapter, '') : null;
  const stLes = selectedLesson ? getStats(selectedSubject, selectedChapter, selectedLesson) : null;
  
  let activeStats = null;
  let activeTitle = '';
  let activeSubtitle = '';
  
  if (selectedLesson && stLes) {
     activeStats = stLes;
     activeTitle = selectedLesson;
     activeSubtitle = 'Lesson Progress';
  } else if (selectedChapter && stChap) {
     const chapStats = Object.values(progressStats)
       .filter(st => st.subject === selectedSubject && st.chap === selectedChapter)
       .reduce((acc, st) => ({ total: acc.total + st.total, completed: acc.completed + st.completed }), { total: 0, completed: 0 });
     activeStats = chapStats;
     activeTitle = selectedChapter;
     activeSubtitle = 'Chapter Progress';
  } else if (selectedSubject) {
     const subStats = Object.values(progressStats)
       .filter(st => st.subject === selectedSubject)
       .reduce((acc, st) => ({ total: acc.total + st.total, completed: acc.completed + st.completed }), { total: 0, completed: 0 });
     activeStats = subStats;
     activeTitle = selectedSubject;
     activeSubtitle = 'Subject Progress';
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
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium"
            >
              <option value="">Select a Subject...</option>
              {Object.keys(hierarchy).sort().map(s => {
                 return <option key={s} value={s}>{s}</option>;
              })}
            </select>
          </div>

          {selectedSubject && (
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter</label>
               <select 
                 value={selectedChapter} 
                 onChange={e => { setSelectedChapter(e.target.value); setSelectedLesson(''); }}
                 className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium"
               >
                 <option value="">All Chapters</option>
                 {Object.keys(hierarchy[selectedSubject] || {}).sort().map(c => {
                    return <option key={c} value={c}>{c}</option>;
                 })}
               </select>
            </div>
          )}

          {selectedChapter && hierarchy[selectedSubject]?.[selectedChapter]?.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lesson</label>
              <select 
                value={selectedLesson} 
                onChange={e => setSelectedLesson(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium"
              >
                <option value="">All Lessons</option>
                {hierarchy[selectedSubject][selectedChapter].sort().map(l => {
                   const lSt = getStats(selectedSubject, selectedChapter, l);
                   return <option key={l} value={l}>{l} ({lSt.completed}/{lSt.total})</option>;
                })}
              </select>
            </div>
          )}
          
          {/* Progress Display Card */}
          {activeStats && activeStats.total > 0 && (
            <div className="mt-6 p-5 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{activeSubtitle}</p>
              <h3 className="text-lg font-black text-indigo-900 leading-tight mt-0.5 mb-4">{activeTitle}</h3>
              
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-black text-indigo-600">{Math.round((activeStats.completed / activeStats.total) * 100)}%</span>
                <span className="text-xs font-bold text-indigo-400 mb-1">{activeStats.completed} / {activeStats.total} completed</span>
              </div>
              
              <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(activeStats.completed / activeStats.total) * 100}%` }} />
              </div>

              {selectedLesson && activeStats.completed >= activeStats.total && (
                <div className="flex gap-2 mt-5">
                  <button 
                    disabled={isResetting}
                    onClick={() => handleReview(selectedSubject, `${selectedChapter}|||${selectedLesson}`)}
                    className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <span className="text-sm">👀</span> View Results
                  </button>
                  <button 
                    disabled={isResetting}
                    onClick={() => handleReplay(selectedSubject, `${selectedChapter}|||${selectedLesson}`)}
                    className="flex-1 py-2.5 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-600 font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <span className="text-sm">🔄</span> Reset
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-indigo-100 pt-4">
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-400 uppercase">Questions</span>
                  <input 
                    type="number" min="1" max={activeStats.total} 
                    value={Math.min(testSize, activeStats.total)} 
                    onChange={e => setTestSize(Math.min(Number(e.target.value), activeStats.total))}
                    className="w-16 text-sm font-black text-indigo-700 bg-transparent focus:outline-none text-right"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                       let finalChapter = selectedChapter;
                       if (selectedLesson) finalChapter = `${selectedChapter}|||${selectedLesson}`;
                       startTest({ subject: selectedSubject, chapter: finalChapter, size: testSize, mode: 'PRACTICE' });
                    }}
                    className="flex-1 py-3.5 bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex flex-col items-center justify-center gap-1 border border-blue-300"
                  >
                    <span className="text-lg">📖</span>
                    <span>Practice</span>
                  </button>
                  <button 
                    onClick={() => {
                       let finalChapter = selectedChapter;
                       if (selectedLesson) finalChapter = `${selectedChapter}|||${selectedLesson}`;
                       startTest({ subject: selectedSubject, chapter: finalChapter, size: testSize, mode: 'TEST', timeLimitMinutes: testSize });
                    }}
                    className="flex-1 py-3.5 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex flex-col items-center justify-center gap-1 border border-indigo-400"
                  >
                    <span className="text-lg">⏱</span>
                    <span>Test Mode</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {!selectedSubject && (
            <div className="mt-6 p-6 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <span className="text-2xl mb-2 block">👆</span>
              <p className="text-xs font-bold text-slate-400">Select a subject above to launch.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full max-w-md space-y-3 mt-8">
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
