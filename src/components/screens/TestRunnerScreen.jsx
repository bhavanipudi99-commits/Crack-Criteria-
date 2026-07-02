import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function TestRunnerScreen({ testConfig, finishTest, setScreen, isAdminMode = false }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Editing State
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Error Reporting State
  const [isReportingError, setIsReportingError] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [isSubmittingError, setIsSubmittingError] = useState(false);
  
  // Time remaining (null if in practice mode)
  const [timeLeft, setTimeLeft] = useState(
    testConfig.timeLimitMinutes ? testConfig.timeLimitMinutes * 60 : null
  );

  // State for Practice mode interactions
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        let finalQuestions = [];
        
        // Try the new optimized RPC first (only if logged in and not replaying)
        if (userId && !testConfig.isReplay) {
           const { data: rpcData, error: rpcError } = await supabase.rpc('get_unanswered_mcqs', {
             p_subject: testConfig.subject,
             p_chapter: testConfig.chapter || '',
             p_limit: testConfig.size,
             p_user_id: userId
           });
           
           if (!rpcError && rpcData) {
             finalQuestions = rpcData;
           } else if (rpcError) {
             console.warn("RPC failed (maybe SQL not run yet?), falling back to standard query:", rpcError.message);
           }
        }
        
        // Fallback to old client-side randomization if RPC failed or they are replaying
        if (finalQuestions.length === 0) {
          let query = supabase.from('mcqs').select('*').eq('subject', testConfig.subject);
          if (testConfig.chapter) {
            if (testConfig.chapter.includes('|||')) {
               query = query.eq('chapter', testConfig.chapter);
            } else {
               query = query.like('chapter', `${testConfig.chapter}%`);
            }
          }
          
          // We can't limit yet because we randomize on client-side (bad for scale, but it's a fallback)
          const { data, error } = await query;
          if (error) throw error;
          
          finalQuestions = data.sort(() => 0.5 - Math.random()).slice(0, testConfig.size);
        }

        const shuffleQuestionsAndOptions = (qs) => {
          const shuffledQs = [...qs].sort(() => 0.5 - Math.random());
          
          return shuffledQs.map(q => {
            if (!q.options || q.options.length === 0) return q;
            
            const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const indexToLetter = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
            
            const correctIdx = letterToIndex[q.correct_answer];
            
            let opts = q.options.map((optText, idx) => ({ text: optText, originalIdx: idx }));
            opts = opts.sort(() => 0.5 - Math.random());
            
            const newCorrectIdx = opts.findIndex(o => o.originalIdx === correctIdx);
            
            return {
              ...q,
              options: opts.map(o => o.text),
              correct_answer: newCorrectIdx !== -1 ? indexToLetter[newCorrectIdx] : q.correct_answer
            };
          });
        };

        setQuestions(shuffleQuestionsAndOptions(finalQuestions));
      } catch (err) {
        console.error("Failed to load questions:", err);
        alert('Failed to load questions');
        setScreen('MCQ_DASHBOARD');
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [testConfig]);

  useEffect(() => {
    if (loading || questions.length === 0 || timeLeft === null) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, questions, timeLeft]);

  const handleTimeUp = () => {
    alert("Time is up!");
    const finalAnswers = [...answers];
    for (let i = currentIndex; i < questions.length; i++) {
      finalAnswers.push({
        question: questions[i],
        userAnswer: 'SKIPPED',
        isCorrect: false
      });
    }
    finishTest(finalAnswers, testConfig.timeLimitMinutes * 60);
  };

  const handleOptionClick = (idx) => {
    if (hasAnsweredCurrent && testConfig.mode === 'PRACTICE') return; // Prevent double clicking in practice mode

    const letters = ['A', 'B', 'C', 'D'];
    const letter = idx === -1 ? 'SKIPPED' : letters[idx];
    const currentQ = questions[currentIndex];
    const isCorrect = letter === currentQ.correct_answer;

    if (testConfig.mode === 'PRACTICE') {
      setSelectedLetter(letter);
      setHasAnsweredCurrent(true);
      // We don't advance automatically in practice mode. We wait for user to click "Next"
      const newAnswers = [...answers];
      newAnswers[currentIndex] = { question: currentQ, userAnswer: letter, isCorrect };
      setAnswers(newAnswers);
    } else {
      // Test Mode: record and advance immediately
      const newAnswers = [...answers, { question: currentQ, userAnswer: letter, isCorrect }];
      setAnswers(newAnswers);
      
      if (currentIndex + 1 >= questions.length) {
        const timeTaken = testConfig.timeLimitMinutes ? (testConfig.timeLimitMinutes * 60) - timeLeft : 0;
        finishTest(newAnswers, timeTaken);
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const nextPracticeQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      finishTest(answers, 0); // No time tracking needed for practice
    } else {
      setHasAnsweredCurrent(false);
      setSelectedLetter(null);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        question: editForm.question,
        options: editForm.options,
        correct_answer: editForm.correct_answer,
        explanation: editForm.explanation
      };
      const { error } = await supabase.from('mcqs').update(payload).eq('id', currentQ.id);
      if (error) throw error;
      
      const newQuestions = [...questions];
      newQuestions[currentIndex] = { ...currentQ, ...payload };
      setQuestions(newQuestions);
      setIsEditingCurrent(false);
    } catch (e) {
      alert(`Error saving edit: ${e.message}`);
    }
    setIsSaving(false);
  };

  const submitErrorReport = async () => {
    if (!errorDescription.trim()) return;
    setIsSubmittingError(true);
    try {
      const { error } = await supabase.from('mcq_reports').insert([{
        mcq_id: currentQ.id,
        issue_description: errorDescription.trim(),
        status: 'open'
      }]);
      if (error) throw error;
      alert("Thank you! The error has been reported to the admins.");
      setIsReportingError(false);
      setErrorDescription('');
    } catch (e) {
      alert(`Failed to submit report: ${e.message}`);
    }
    setIsSubmittingError(false);
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#FDFDFD] text-black font-bold">Loading...</div>;
  if (questions.length === 0) return <div className="flex flex-col items-center justify-center h-screen bg-[#FDFDFD]"><p className="text-black font-bold">No questions found.</p><button onClick={() => setScreen('MCQ_DASHBOARD')} className="mt-4 text-blue-600 font-bold">Back</button></div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] p-4 md:p-8 font-sans">
      
      {/* Top Header */}
      <div className="w-full max-w-3xl mx-auto flex justify-between items-center mb-8">
        <div className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center gap-4">
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to quit? Your progress for this session will be lost.")) {
                setScreen('MCQ_DASHBOARD');
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] md:text-xs rounded-xl transition-colors shadow-sm"
            title="Quit Test"
          >
            ✖ Quit
          </button>
          <span>{testConfig.mode === 'PRACTICE' ? '📖 Practice' : '⏱ Test'} <span className="opacity-40">|</span> Q {currentIndex + 1}/{questions.length}</span>
          {!isEditingCurrent && !isReportingError && (
            <button 
              onClick={() => setIsReportingError(true)}
              className="px-2 py-1 text-slate-400 hover:text-red-500 transition-colors"
              title="Report Error in this Question"
            >
              🚩
            </button>
          )}
          {isAdminMode && !isEditingCurrent && (
            <button 
              onClick={() => {
                setEditForm({
                  question: currentQ.question,
                  options: [...currentQ.options],
                  correct_answer: currentQ.correct_answer,
                  explanation: currentQ.explanation || ''
                });
                setIsEditingCurrent(true);
              }}
              className="px-3 py-1 bg-yellow-400 text-black text-xs rounded-full hover:bg-yellow-500 transition-colors shadow-sm"
            >
              ✎ EDIT QUESTION
            </button>
          )}
        </div>
        
        {timeLeft !== null && (
          <div className={`text-xl font-black ${timeLeft < 60 ? 'text-red-600' : 'text-black'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

        {/* Question Container */}
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
        {isEditingCurrent ? (
          <div className="bg-white p-6 rounded-2xl border-2 border-yellow-400 shadow-xl mb-10">
            <h3 className="font-black text-lg mb-4 text-yellow-600 uppercase tracking-widest">Admin Edit Mode</h3>
            <p className="text-sm font-bold text-slate-500 mb-4">Please use the Admin Dashboard's Rich Text Editor to modify media, tables, and formatting. This simple editor is for quick text fixes only.</p>
            
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Question (Raw HTML)</label>
            <textarea 
              rows={4} 
              value={editForm.question} 
              onChange={e => setEditForm({...editForm, question: e.target.value})} 
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-black outline-none mb-4 font-mono text-xs resize-none" 
            />

            <div className="grid gap-4 mb-4">
              {[0, 1, 2, 3].map(i => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="font-black text-gray-400">{letter}.</span>
                    <input 
                      type="text" 
                      value={editForm.options[i]} 
                      onChange={e => {
                        const newOpts = [...editForm.options];
                        newOpts[i] = e.target.value;
                        setEditForm({...editForm, options: newOpts});
                      }} 
                      className="flex-1 p-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none font-bold text-sm" 
                    />
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="correct_answer" 
                        checked={editForm.correct_answer === letter} 
                        onChange={() => setEditForm({...editForm, correct_answer: letter})} 
                        className="w-4 h-4 accent-black" 
                      />
                      Correct
                    </label>
                  </div>
                );
              })}
            </div>

            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Explanation (Raw HTML)</label>
            <textarea 
              rows={3} 
              value={editForm.explanation} 
              onChange={e => setEditForm({...editForm, explanation: e.target.value})} 
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-black outline-none mb-6 font-mono text-xs resize-none" 
            />

            <div className="flex justify-end gap-4">
              <button onClick={() => setIsEditingCurrent(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-black uppercase text-sm">Cancel</button>
              <button onClick={handleEditSave} disabled={isSaving} className="px-8 py-3 bg-black text-white font-black rounded-xl uppercase tracking-widest text-sm hover:bg-gray-800 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : isReportingError ? (
          <div className="bg-white p-6 rounded-2xl border-2 border-red-100 shadow-xl mb-10">
            <h3 className="font-black text-lg mb-4 text-red-600 uppercase tracking-widest flex items-center gap-2"><span>🚩</span> Report Error</h3>
            <p className="text-sm font-bold text-slate-500 mb-4">Please describe the error in this question (e.g. wrong answer, typo, confusing wording).</p>
            
            <textarea 
              rows={4} 
              autoFocus
              value={errorDescription} 
              onChange={e => setErrorDescription(e.target.value)} 
              placeholder="Describe the issue here..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-red-400 outline-none mb-6 font-medium text-sm resize-none" 
            />

            <div className="flex justify-end gap-4">
              <button onClick={() => setIsReportingError(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-black uppercase text-sm">Cancel</button>
              <button 
                onClick={submitErrorReport} 
                disabled={isSubmittingError || !errorDescription.trim()} 
                className="px-8 py-3 bg-red-500 text-white font-black rounded-xl uppercase tracking-widest text-sm hover:bg-red-600 disabled:opacity-50"
              >
                {isSubmittingError ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div 
              className="text-xl md:text-2xl font-black text-slate-800 mb-10 leading-relaxed prose prose-lg prose-img:rounded-2xl prose-img:shadow-md max-w-none border-l-4 border-indigo-500 pl-4 py-1"
              dangerouslySetInnerHTML={{ __html: currentQ.question }}
            />

            <div className="space-y-4 mb-10">
              {currentQ.options.map((opt, idx) => {
                if (!opt) return null;
                const letter = ['A', 'B', 'C', 'D'][idx];
            
            // Determine styles based on mode and state
            let baseStyle = "w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ";
            
            if (testConfig.mode === 'TEST') {
              baseStyle += "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5";
            } else {
              // Practice Mode Styles
              if (!hasAnsweredCurrent) {
                baseStyle += "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer";
              } else {
                baseStyle += "cursor-default ";
                if (letter === currentQ.correct_answer) {
                  baseStyle += "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm"; // Select option to go green (correct answer always green)
                } else if (letter === selectedLetter) {
                  baseStyle += "bg-rose-50 border-rose-400 text-rose-900 opacity-90"; // Wrong selected answer
                } else {
                  baseStyle += "bg-white border-slate-100 text-slate-400 opacity-50"; // Unselected wrong answers
                }
              }
            }

            return (
              <button 
                key={idx}
                onClick={() => handleOptionClick(idx)}
                className={baseStyle}
              >
                <span className="font-black mt-0.5 opacity-50">{letter}.</span>
                <span className="font-bold text-[15px] md:text-base leading-snug">{opt}</span>
                {testConfig.mode === 'PRACTICE' && hasAnsweredCurrent && letter === currentQ.correct_answer && (
                  <span className="ml-auto font-black text-green-600">✓</span>
                )}
                {testConfig.mode === 'PRACTICE' && hasAnsweredCurrent && letter === selectedLetter && letter !== currentQ.correct_answer && (
                  <span className="ml-auto font-black text-red-600">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Practice Mode Explanation & Next Button */}
        {!isEditingCurrent && testConfig.mode === 'PRACTICE' && hasAnsweredCurrent && (
          <div className="animate-fade-in-up mt-auto">
            {currentQ.explanation && (
              <div className="p-6 rounded-2xl bg-blue-50/80 border-2 border-blue-200 shadow-inner mb-6 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-blue-500 text-lg">💡</span>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Explanation</p>
                </div>
                <div 
                  className="text-sm font-bold text-blue-950 leading-relaxed prose prose-sm max-w-none prose-p:my-1"
                  dangerouslySetInnerHTML={{ __html: currentQ.explanation }}
                />
              </div>
            )}
            
            <button 
              onClick={nextPracticeQuestion}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              {currentIndex + 1 >= questions.length ? 'Finish Practice' : 'Next Question →'}
            </button>
          </div>
        )}

        {/* Skip Button for Test Mode */}
        {!isEditingCurrent && testConfig.mode === 'TEST' && (
          <div className="mt-auto flex justify-center">
            <button 
              onClick={() => handleOptionClick(-1)}
              className="text-sm font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors py-4"
            >
              Skip Question
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
