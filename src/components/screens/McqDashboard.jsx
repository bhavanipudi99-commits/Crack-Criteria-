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
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-slate-800">📊 Your Progress</h1>
            <button onClick={() => setShowProgress(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm">Back</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="p-3">Subject / Lesson</th>
                  <th className="p-3">Total Qs</th>
                  <th className="p-3">Completed</th>
                  <th className="p-3">Remaining</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(progressStats).map((stat, idx) => {
                  const remaining = stat.total - stat.completed;
                  const isDone = remaining <= 0;
                  const chapParts = stat.chapterStr.split('|||');
                  const displayLesson = chapParts.length > 1 ? `${chapParts[0]} - ${chapParts[1]}` : stat.chapterStr;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-700">
                        <div className="text-xs text-slate-400">{stat.subject}</div>
                        {displayLesson || 'Root MCQs'}
                      </td>
                      <td className="p-3 font-mono">{stat.total}</td>
                      <td className="p-3 font-mono text-indigo-600">{stat.completed}</td>
                      <td className="p-3 font-mono font-bold text-rose-500">{remaining > 0 ? remaining : 0}</td>
                      <td className="p-3">
                        {isDone ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-black">COMPLETED</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">IN PROGRESS</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isDone && (
                          <button 
                            disabled={isResetting}
                            onClick={() => handleReplay(stat.subject, stat.chapterStr)}
                            className="text-xs font-black bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            REPLAY
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
