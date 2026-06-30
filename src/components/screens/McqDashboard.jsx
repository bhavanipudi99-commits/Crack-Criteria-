import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function McqDashboard({ setScreen, startTest }) {
  const [hierarchy, setHierarchy] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [testSize, setTestSize] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHierarchy() {
      let allData = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase.from('mcqs').select('subject, chapter').range(from, from + step - 1);
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
      });
      
      // Convert sets to arrays
      for (const s in hier) {
        for (const c in hier[s]) {
           hier[s][c] = Array.from(hier[s][c]);
        }
      }
      
      setHierarchy(hier);
      setLoading(false);
    }
    fetchHierarchy();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><p>Loading database...</p></div>;

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-10">
        <h1 className="text-2xl font-black text-slate-800 mb-6 text-center">📝 Start MCQ Test</h1>

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

          <button 
            onClick={() => {
               let finalChapter = selectedChapter;
               if (selectedLesson) {
                  finalChapter = `${selectedChapter}|||${selectedLesson}`;
               }
               startTest({ subject: selectedSubject, chapter: finalChapter, size: testSize, mode: 'PRACTICE' });
            }}
            disabled={!selectedSubject}
            className={`w-full py-4 rounded-xl font-black text-white uppercase tracking-wider mt-4 ${selectedSubject ? 'bg-[#4F86F7] hover:bg-blue-600' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Start Timer & Begin →
          </button>
        </div>
      </div>
      
      <div className="w-full max-w-md space-y-3 mt-8">
        <button onClick={() => setScreen('PLAYER_HOME')} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
          🧩 Play Canvas Games
        </button>
        <button onClick={() => supabase.auth.signOut()} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );
}
