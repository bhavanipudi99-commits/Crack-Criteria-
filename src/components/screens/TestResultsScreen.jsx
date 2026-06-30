import React from 'react';

export default function TestResultsScreen({ results, totalTimeSeconds, setScreen, mode }) {
  const correctCount = results.filter(r => r.isCorrect).length;
  const wrongCount = results.filter(r => !r.isCorrect && r.userAnswer !== 'SKIPPED').length;
  
  let score = correctCount - (wrongCount / 3);
  score = Math.round(score * 100) / 100; // Round to 2 decimals max

  const total = results.length;
  const percentage = Math.round((score / total) * 100) || 0;
  
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = totalTimeSeconds % 60;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-3xl mx-auto mb-8 text-center mt-8">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Session Completed</h1>
        <p className="text-slate-500 font-bold mt-2">
          {mode === 'PRACTICE' ? 'Practice Mode Summary' : `Completed in ${mins}m ${secs}s`}
        </p>
        
        <div className="mt-8 inline-flex flex-col items-center justify-center w-56 h-56 rounded-full bg-white border-8 border-[#4F86F7] shadow-xl">
          <span className="text-5xl font-black text-slate-800">{score}<span className="text-2xl text-slate-400">/{total}</span></span>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1 mb-2">{percentage}% SCORE</span>
          <div className="flex gap-3 text-xs font-bold text-slate-400">
            <span className="text-emerald-500">{correctCount} Correct</span>
            <span className="text-rose-500">{wrongCount} Wrong</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto space-y-6 mb-12">
        <h2 className="text-xl font-black text-slate-800 border-b border-slate-200 pb-2">Detailed Review</h2>
        
        {results.map((res, idx) => {
          const q = res.question;
          return (
            <div key={idx} className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${res.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'} border-y border-r border-slate-200`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${res.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {res.isCorrect ? '✓' : '✗'}
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Question {idx + 1}
                  </span>
                  <p className="text-slate-700 font-bold leading-relaxed">{q.question}</p>
                </div>
              </div>

              <div className="ml-12 space-y-2 mb-4">
                {q.options.map((opt, oIdx) => {
                  if (!opt) return null;
                  const letter = ['A', 'B', 'C', 'D'][oIdx];
                  
                  let bgClass = "bg-slate-50 border-slate-200 text-slate-600";
                  let icon = "";
                  
                  if (letter === q.correct_answer) {
                    bgClass = "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold";
                    icon = "✅ ";
                  } else if (letter === res.userAnswer) {
                    bgClass = "bg-rose-50 border-rose-200 text-rose-800 font-bold";
                    icon = "❌ ";
                  }
                  
                  return (
                    <div key={oIdx} className={`p-3 rounded-lg border text-sm ${bgClass}`}>
                      <span className="font-black mr-2 opacity-50">{letter}.</span>
                      {icon}{opt}
                      {letter === res.userAnswer && letter === q.correct_answer && <span className="ml-2 text-[10px] uppercase bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">Your Answer</span>}
                      {letter === res.userAnswer && letter !== q.correct_answer && <span className="ml-2 text-[10px] uppercase bg-rose-200 text-rose-800 px-2 py-0.5 rounded">Your Answer</span>}
                    </div>
                  );
                })}
                {res.userAnswer === 'SKIPPED' && (
                  <div className="p-3 rounded-lg border bg-slate-100 border-slate-300 text-slate-600 text-sm font-bold">
                    ⚠️ You skipped this question.
                  </div>
                )}
              </div>

              {q.explanation && (
                <div className="ml-12 mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Explanation</p>
                  <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-3xl mx-auto flex justify-center pb-12">
        <button 
          onClick={() => setScreen('MCQ_DASHBOARD')}
          className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-4 px-12 rounded-xl text-sm uppercase tracking-wider shadow-lg transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
