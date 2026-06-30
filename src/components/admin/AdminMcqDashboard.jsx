import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import McqSidebar from './McqSidebar';

export default function AdminMcqDashboard() {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorReports, setErrorReports] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Selection State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSubChapter, setSelectedSubChapter] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentMcq, setCurrentMcq] = useState(null);
  const [saving, setSaving] = useState(false);

  // Markdown Importer State
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const [markdownPreview, setMarkdownPreview] = useState([]);
  const [isUploadingMD, setIsUploadingMD] = useState(false);

  // Fetch all open error reports globally for the sidebar
  useEffect(() => {
    fetchErrorReports();
  }, []);

  const fetchErrorReports = async () => {
    try {
      const { data, error } = await supabase.from('mcq_reports').select('mcq_id, status').eq('status', 'open');
      if (error) throw error;
      setErrorReports(data || []);
    } catch (err) {
      console.error('Error fetching error reports', err);
    }
  };

  // When selection changes, fetch MCQs for that folder
  useEffect(() => {
    if (selectedChapter) {
      fetchMcqs();
    } else {
      setMcqs([]);
      setHasMore(false);
    }
  }, [selectedChapter, selectedSubChapter, currentPage, refreshTrigger]);

  const handleSelectFolder = (sub, chap, scId = null) => {
    setSelectedSubject(sub);
    setSelectedChapter(chap);
    setSelectedSubChapter(scId);
    setCurrentPage(0);
  };

  const fetchMcqs = async () => {
    try {
      setLoading(true);
      const dbChapStr = selectedSubChapter ? `${selectedChapter}|||${selectedSubChapter}` : selectedChapter;
      
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('mcqs').select('*', { count: 'exact' })
        .eq('subject', selectedSubject)
        .eq('chapter', dbChapStr)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      setMcqs(data || []);
      setHasMore(count > to + 1);
    } catch (err) {
      console.error(err);
      alert(`Error fetching MCQs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this question?')) return;
    try {
      const { error } = await supabase.from('mcqs').delete().eq('id', id);
      if (error) throw error;
      setMcqs(p => p.filter(q => q.id !== id));
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const openEditor = (mcq = null) => {
    if (mcq) {
      const parts = mcq.chapter ? mcq.chapter.split('|||') : ['', ''];
      setCurrentMcq({ 
        ...mcq, 
        chapter: parts[0], 
        lesson: parts.length > 1 ? parts[1] : '' 
      });
    } else {
      const parts = (selectedChapter || '').split('|||');
      setCurrentMcq({
        id: null,
        subject: selectedSubject || '',
        chapter: parts[0] || '',
        lesson: parts.length > 1 ? parts[1] : '',
        question: '',
        options: ['', '', '', ''],
        correct_answer: 'A',
        explanation: ''
      });
    }
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dbChapter = currentMcq.lesson ? `${currentMcq.chapter}|||${currentMcq.lesson}` : currentMcq.chapter;
      const payload = {
        subject: currentMcq.subject,
        chapter: dbChapter,
        question: currentMcq.question,
        options: currentMcq.options,
        correct_answer: currentMcq.correct_answer,
        explanation: currentMcq.explanation
      };

      if (currentMcq.id) {
        const { error } = await supabase.from('mcqs').update(payload).eq('id', currentMcq.id);
        if (error) throw error;
        setMcqs(p => p.map(q => q.id === currentMcq.id ? { ...currentMcq, chapter: dbChapter } : q));
      } else {
        const { data, error } = await supabase.from('mcqs').insert([payload]).select().single();
        if (error) throw error;
        setMcqs(p => [data, ...p]);
      }
      setIsEditing(false);
      setCurrentMcq(null);
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const markErrorResolved = async (mcqId) => {
    try {
      const { error } = await supabase.from('mcq_reports').update({ status: 'resolved' }).eq('mcq_id', mcqId);
      if (error) throw error;
      setErrorReports(p => p.filter(r => r.mcq_id !== mcqId));
    } catch (err) {
      alert(`Error resolving report: ${err.message}`);
    }
  };

  const handleParseMarkdown = () => {
    const lines = markdownText.split('\n');
    let currentQuestion = null;
    let parsedMcqs = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts a question
      if (line.trim().match(/^(###\s+)?(Question\s+)?\d+[:.]?/i)) {
        if (currentQuestion && currentQuestion.correct_answer) parsedMcqs.push(currentQuestion);
        currentQuestion = {
          question: '',
          options: [],
          correct_answer: '',
          explanation: '',
          state: 'question'
        };
        continue;
      }
      
      if (!currentQuestion) continue;
      
      // Check for reveal tag
      if (line.includes('[!success]')) {
        currentQuestion.state = 'answer_reveal';
        continue;
      }
      
      if (currentQuestion.state === 'question') {
        const optMatch = line.trim().match(/^(-?\s*)?([A-E])[\.\)]\s+(.*)/i);
        if (optMatch) {
          currentQuestion.options.push(optMatch[3].trim());
        } else if (line.trim() !== '' && !line.startsWith('---')) {
          currentQuestion.question += (currentQuestion.question ? '<br>' : '') + line.trim();
        }
      } else if (currentQuestion.state === 'answer_reveal') {
        const ansMatch = line.trim().match(/^\s*>?\s*\**Answer:\**\s*(?:Answer\.\s*)?([A-E])/i);
        if (ansMatch && !currentQuestion.correct_answer) {
          currentQuestion.correct_answer = ansMatch[1].toUpperCase();
        } else if (line.trim().match(/^\s*>?\s*\**Explanation:\**/i)) {
          // ignore
        } else if (line.trim() !== '' && !line.startsWith('---')) {
          let cleanLine = line.replace(/^\s*>?\s*/, '').trim();
          if (cleanLine) {
              currentQuestion.explanation += (currentQuestion.explanation ? '<br>' : '') + cleanLine;
          }
        }
      }
    }
    if (currentQuestion && currentQuestion.correct_answer) parsedMcqs.push(currentQuestion);
    setMarkdownPreview(parsedMcqs);
  };

  const handleUploadMarkdown = async () => {
    if (markdownPreview.length === 0) return;
    setIsUploadingMD(true);
    
    const dbChapter = selectedSubChapter ? `${selectedChapter}|||${selectedSubChapter}` : selectedChapter;
    
    const payload = markdownPreview.map(q => ({
      subject: selectedSubject,
      chapter: dbChapter,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }));

    try {
      const { error } = await supabase.from('mcqs').insert(payload);
      if (error) throw error;
      alert(`Successfully uploaded ${payload.length} questions!`);
      setMarkdownText('');
      setMarkdownPreview([]);
      setIsMarkdownModalOpen(false);
      setRefreshTrigger(p => p + 1);
      setCurrentPage(0);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
    setIsUploadingMD(false);
  };

  // React Quill Modules for rich media
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-900 font-sans">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 flex justify-between items-center z-30 shadow-sm relative">
        <div>
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Admin Dashboard</p>
          <h2 className="text-lg font-black text-slate-900">MCQ Database</h2>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Curriculum Index */}
        <div className="flex">
          <McqSidebar
            onSelectFolder={handleSelectFolder}
            selectedChapter={selectedChapter}
            selectedSubChapter={selectedSubChapter}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* RIGHT PANEL: MCQ List */}
        {selectedChapter ? (
          <div className="flex-1 bg-white overflow-hidden relative shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 z-10 flex flex-col">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedSubject} &gt; {selectedChapter}</p>
                <h3 className="text-xl font-black text-slate-800">
                  {selectedSubChapter ? selectedSubChapter : 'Root MCQs'}
                </h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if (!window.confirm("Ready to scan and fix the [!success] bug in ALL 4,700 questions?")) return;
                    try {
                      alert("Fetching all questions (this might take a second)...");
                      let allQuestions = [];
                      let from = 0;
                      let step = 999;
                      let hasMore = true;
                      
                      while (hasMore) {
                        const { data, error } = await supabase.from('mcqs').select('*').range(from, from + step);
                        if (error) throw error;
                        allQuestions = allQuestions.concat(data);
                        if (data.length <= step) {
                            hasMore = false;
                        } else {
                            from += step + 1;
                        }
                      }
                      
                      console.log("Total fetched:", allQuestions.length);
                      
                      let updates = [];
                      for (let q of allQuestions) {
                        let needsUpdate = false;
                        let newOptions = [...q.options];
                        let newAnswer = q.correct_answer;
                        let newExplanation = q.explanation;
                        
                        for (let i = 0; i < newOptions.length; i++) {
                          const optText = newOptions[i];
                          if (optText && typeof optText === 'string' && optText.includes('[!success]')) {
                            
                            // 1. Try to match WITH Explanation
                            const matchExp = optText.match(/(.*?)\s*>\s*\[!success\].*?Answer:\s*\*?\s*([A-E])\s*\*?\s*>*\s*Explanation:\s*\*?\s*>*\s*(.*)/i);
                            // 2. Try to match WITHOUT Explanation
                            const matchNoExp = optText.match(/(.*?)\s*>\s*\[!success\].*?Answer:\s*\*?\s*([A-E])/i);
                            
                            if (matchExp) {
                              newOptions[i] = matchExp[1].trim();
                              newAnswer = matchExp[2].trim().toUpperCase();
                              newExplanation = matchExp[3].replace(/---+$/, '').trim();
                              needsUpdate = true;
                            } else if (matchNoExp) {
                              newOptions[i] = matchNoExp[1].trim();
                              newAnswer = matchNoExp[2].trim().toUpperCase();
                              needsUpdate = true;
                            } else {
                               // Deep fallback
                               const splitAnswer = optText.split(/Answer:\s*\*?\s*([A-E])/i);
                               if (splitAnswer.length > 2) {
                                   newOptions[i] = splitAnswer[0].replace(/>\s*\[!success\].*/i, '').trim();
                                   newAnswer = splitAnswer[1].toUpperCase();
                                   const expMatch = splitAnswer[2].match(/Explanation:\s*\*?\s*>*\s*(.*)/i);
                                   if (expMatch) {
                                       newExplanation = expMatch[1].replace(/---+$/, '').trim();
                                   }
                                   needsUpdate = true;
                               }
                            }
                          }
                        }
                        
                        if (needsUpdate) {
                          updates.push({
                            ...q,
                            options: newOptions,
                            correct_answer: newAnswer,
                            explanation: newExplanation
                          });
                        }
                      }
                      
                      if (updates.length === 0) {
                        alert("No questions found with the bug!");
                        return;
                      }
                      
                      alert(`Found ${updates.length} broken questions out of ${allQuestions.length}. Starting update...`);
                      let successCount = 0;
                      
                      // Update in chunks
                      for (let i = 0; i < updates.length; i += 50) {
                        const batch = updates.slice(i, i + 50);
                        const { error: upsertErr } = await supabase.from('mcqs').upsert(batch);
                        if (upsertErr) throw upsertErr;
                        successCount += batch.length;
                        console.log(`Fixed ${successCount}/${updates.length}...`);
                      }
                      
                      alert(`Successfully fixed ${successCount} questions! Refresh the page.`);
                    } catch (err) {
                      alert("Fix failed: " + err.message);
                      console.error(err);
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black py-2 px-6 text-sm rounded-xl shadow-lg transition-colors"
                >
                  🔧 FIX OPTIONS BUG
                </button>
                <button 
                  onClick={async () => {
                    if (!window.confirm("Ready to bulk upload ALL REMAINING Harrison MCQs? This will use your Admin session to safely bypass security rules.")) return;
                    try {
                      // Fetch the JSON export I placed in the project root
                      const response = await fetch('/All_Harrison_Export.json');
                      const data = await response.json();
                      
                      // 1. Update Curriculum Sidebar (LOCAL STATE)
                      console.log("Updating Curriculum Sidebar local state...");
                      const newSubjects = data.curriculum.subjects;
                      const newChapters = data.curriculum.chapters;
                      
                      setAppSubjects(prev => {
                          const updated = [...prev];
                          for (const sub of newSubjects) {
                              if (!updated.includes(sub)) updated.push(sub);
                          }
                          return updated;
                      });
                      
                      setAppChapters(prev => {
                          const updated = [...prev];
                          for (const chap of newChapters) {
                              const exists = updated.find(c => c.name === chap.name && c.subject === chap.subject);
                              if (!exists) updated.push(chap);
                          }
                          return updated;
                      });
                      
                      // 2. Upload MCQs
                      const allMcqs = data.mcqs;
                      let success = 0;
                      alert("Sidebar state updated! Starting upload of " + allMcqs.length + " questions. Please wait...");
                      
                      // Upload in chunks of 50
                      for (let i = 0; i < allMcqs.length; i += 50) {
                        const batch = allMcqs.slice(i, i + 50);
                        const { error } = await supabase.from('mcqs').insert(batch);
                        if (error) throw error;
                        success += batch.length;
                        console.log(`Uploaded ${success}/${allMcqs.length}...`);
                      }
                      alert(`Successfully uploaded ${success} questions!`);
                    } catch (err) {
                      alert("Upload failed: " + err.message);
                      console.error(err);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-6 text-sm rounded-xl shadow-lg transition-colors"
                >
                  🚀 BULK UPLOAD ALL HARRISON MCQs
                </button>
                <button 
                  onClick={() => setIsMarkdownModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-6 text-sm rounded-xl shadow-lg transition-colors"
                >
                  📝 Import Markdown
                </button>
                <button 
                  onClick={() => openEditor()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-6 text-sm rounded-xl shadow-lg transition-colors"
                >
                  + Add Question Here
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#FDFDFD]">
              {loading ? (
                <div className="text-center p-12 font-bold text-slate-400">Loading Questions...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mcqs.map((q) => {
                    const hasError = errorReports.some(r => r.mcq_id === q.id);
                    return (
                      <div key={q.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} hover:shadow-md transition-shadow relative group`}>
                        {hasError && <div className="absolute -top-3 -left-3 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md animate-pulse">FLAGGED ERROR</div>}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                          {hasError && (
                            <button onClick={() => markErrorResolved(q.id)} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 font-bold text-xs" title="Mark Resolved">✔ Resolve</button>
                          )}
                          <button onClick={() => openEditor(q)} className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 font-bold text-xs">Edit</button>
                          <button onClick={() => handleDelete(q.id)} className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 font-bold text-xs">Del</button>
                        </div>
                        
                        <div 
                          className="text-sm font-bold text-slate-800 mb-4 prose prose-sm prose-img:rounded-md max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.question }}
                        />
                        
                        <div className="space-y-2 mt-4">
                          {q.options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const isCorrect = q.correct_answer === letter;
                            return (
                              <div key={i} className={`text-xs p-2 rounded border ${isCorrect ? 'bg-green-50 border-green-200 text-green-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 line-clamp-1'}`}>
                                <span className="font-black opacity-50 mr-2">{letter}.</span> {opt}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {mcqs.length === 0 && (
                     <div className="col-span-full text-center p-12 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                       This folder is empty. Click "+ Add Question Here" to build your curriculum!
                     </div>
                  )}
                  {mcqs.length > 0 && (
                    <div className="col-span-full flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 mt-4">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0 || loading}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        ← Previous Page
                      </button>
                      <span className="text-sm font-black text-slate-500">
                        Page {currentPage + 1}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={!hasMore || loading}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Next Page →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50/50">
            <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-3xl max-w-sm shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                <span className="text-3xl">📁</span>
              </div>
              <h3 className="text-base font-black text-slate-800 mb-2">Select a Folder</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed font-medium">Select a Chapter or Subchapter from the curriculum index on the left to view and edit its MCQs.</p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Rich-Text Editor Modal */}
      {isEditing && currentMcq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">{currentMcq.id ? 'Edit Question' : 'New Question'}</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 font-black text-xl">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Subject</label>
                  <input type="text" required value={currentMcq.subject} onChange={e => setCurrentMcq({...currentMcq, subject: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Medicine" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Chapter</label>
                  <input type="text" required value={currentMcq.chapter} onChange={e => setCurrentMcq({...currentMcq, chapter: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Cardiology" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Lesson</label>
                  <input type="text" value={currentMcq.lesson || ''} onChange={e => setCurrentMcq({...currentMcq, lesson: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Acute Rheumatic Fever" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Question Prompt (Rich Media)</label>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <ReactQuill 
                    theme="snow"
                    value={currentMcq.question}
                    onChange={(val) => setCurrentMcq({...currentMcq, question: val})}
                    modules={quillModules}
                    className="h-48 mb-10" // added mb-10 because quill toolbar offsets height
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div key={i}>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Option {letter}</label>
                      <input type="text" required value={currentMcq.options[i]} onChange={e => {
                        const newOps = [...currentMcq.options];
                        newOps[i] = e.target.value;
                        setCurrentMcq({...currentMcq, options: newOps});
                      }} className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Correct Answer</label>
                <div className="flex gap-4">
                  {['A', 'B', 'C', 'D'].map(letter => (
                    <label key={letter} className={`flex-1 p-4 rounded-xl border-2 cursor-pointer text-center font-black transition-colors ${currentMcq.correct_answer === letter ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      <input type="radio" name="correct_answer" className="hidden" checked={currentMcq.correct_answer === letter} onChange={() => setCurrentMcq({...currentMcq, correct_answer: letter})} />
                      {letter}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Explanation (Rich Media)</label>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <ReactQuill 
                    theme="snow"
                    value={currentMcq.explanation}
                    onChange={(val) => setCurrentMcq({...currentMcq, explanation: val})}
                    modules={quillModules}
                    className="h-32 mb-10"
                  />
                </div>
              </div>

            </form>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-8 py-3 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Markdown Importer Modal */}
      {isMarkdownModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">Bulk Import from Markdown</h2>
              <button onClick={() => {setIsMarkdownModalOpen(false); setMarkdownText(''); setMarkdownPreview([]);}} className="text-slate-400 hover:text-slate-600 font-black text-xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-bold border border-blue-200">
                Paste your raw Markdown text below. The parser expects questions to start with a number (e.g., `1.` or `### Question 1`), options as `A. text`, and the answer block to contain `> [!success]` and `Answer: A`.
              </div>
              
              <textarea 
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                placeholder="Paste Markdown here..."
                className="w-full h-64 p-4 rounded-xl border border-slate-300 font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
              />
              
              <div className="flex justify-end">
                <button 
                  onClick={handleParseMarkdown}
                  disabled={!markdownText.trim()}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-6 rounded-xl shadow-sm disabled:opacity-50"
                >
                  Parse & Preview
                </button>
              </div>

              {markdownPreview.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h3 className="text-lg font-black text-slate-800 mb-4">Preview ({markdownPreview.length} questions parsed)</h3>
                  <div className="max-h-64 overflow-y-auto space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {markdownPreview.map((q, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <p className="font-bold text-sm text-slate-800 mb-2" dangerouslySetInnerHTML={{__html: q.question}}></p>
                        <div className="pl-4 border-l-2 border-indigo-200 space-y-1 mb-2">
                          {q.options.map((opt, i) => (
                            <p key={i} className="text-xs text-slate-600"><span className="font-bold">{String.fromCharCode(65+i)}.</span> {opt}</p>
                          ))}
                        </div>
                        <p className="text-xs font-black text-emerald-600">Answer: {q.correct_answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
              <button onClick={() => {setIsMarkdownModalOpen(false); setMarkdownText(''); setMarkdownPreview([]);}} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancel</button>
              <button 
                onClick={handleUploadMarkdown} 
                disabled={markdownPreview.length === 0 || isUploadingMD} 
                className="px-8 py-3 rounded-xl font-black bg-purple-600 hover:bg-purple-700 text-white shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isUploadingMD ? 'Uploading...' : '🚀 Upload to Database'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
