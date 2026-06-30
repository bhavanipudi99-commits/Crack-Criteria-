import React, { useState } from 'react';
import CanvasComposer from './CanvasComposer';
import CurriculumSidebar from '../admin/CurriculumSidebar';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export default function AdminDashboard({
  appSubjects, setAppSubjects,
  appChapters, setAppChapters,
  appSubChapters, setAppSubChapters,
  expandedChapters, setExpandedChapters,
  criteriaTables, setCriteriaTables,
  canvasConfigs, setCanvasConfigs,
  selectedCanvasId, setSelectedCanvasId,
  isCloudLoaded, isSyncing,
  setScreen, setAdminPassword,
  setSelectedTableId,
  activeComposerQuestionId, setActiveComposerQuestionId,
  startGame, setActiveGameMode, setIsPreviewMode,
  parseNumericalData,
  expandedNodes, setExpandedNodes
}) {

  // ── Curriculum creation forms (for tables/canvases) ──────────────────────
  const [newTableName, setNewTableName] = useState('');
  const [newTableChapter, setNewTableChapter] = useState('Cardiology');
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasChapter, setNewCanvasChapter] = useState('Cardiology');

  // ── Helper Functions ───────────────────────────────────────────────────────

  const addCriteriaTable = (chapterName, subChapterId = null) => {
    const name = newTableName.trim();
    if (!name) { alert('Enter a table name.'); return; }
    const newTable = {
      id: uid('ct'),
      name,
      chapter: chapterName || newTableChapter,
      subChapterId,
      columnCount: 2,
      columnHeaders: ['Column 1', 'Column 2'],
      rows: []
    };
    setCriteriaTables(p => [...p, newTable]);
    setNewTableName('');
    setNewTableChapter(chapterName || newTableChapter);
    setSelectedTableId(newTable.id);
    setScreen('CRITERIA_TABLE_BUILDER');
  };

  const deleteTable = (tableId) => {
    if (!window.confirm('Delete this criteria table? All its tiles will be removed from canvases.')) return;
    const table = criteriaTables.find(t => t.id === tableId);
    const allTileIds = table ? table.rows.filter(r => !r.isHeading).flatMap(r => r.cells.flatMap(c => c.tiles.map(t => t.id))) : [];
    setCriteriaTables(p => p.filter(t => t.id !== tableId));
    if (allTileIds.length) {
      setCanvasConfigs(p => p.map(c => ({
        ...c,
        questions: c.questions.map(q => ({ ...q, selectedTileIds: (q.selectedTileIds || []).filter(id => !allTileIds.includes(id)) }))
      })));
    }
  };

  const addCanvas = (type = 'CANVAS', chapterName = null, subChapterId = null) => {
    const name = newCanvasName.trim();
    if (!name && type === 'CANVAS') { alert('Enter a name.'); return; }
    let defaultQ;
    if (type === 'CANVAS') defaultQ = { id: uid('cq'), prompt: 'Identify Criteria', selectedTileIds: [] };
    else if (type === 'NUMERICAL') defaultQ = { id: uid('cq'), targetTileId: null, decoyTileIds: [] };
    else if (type === 'ODD_ONE_OUT') defaultQ = { id: uid('cq'), correctTileIds: [], distractorTileId: null };

    const newCanvas = { id: uid('canvas'), name: name || type, chapter: chapterName || newCanvasChapter, subChapterId, type, maxTiles: 16, questions: [defaultQ] };
    setCanvasConfigs(p => [...p, newCanvas]);
    setNewCanvasName('');
    setNewCanvasChapter(chapterName || newCanvasChapter);
    setSelectedCanvasId(newCanvas.id);
    setActiveComposerQuestionId(defaultQ.id);
    setScreen('CANVAS_COMPOSER');
  };

  const deleteCanvas = (id) => {
    if (window.confirm('Delete this configuration?')) setCanvasConfigs(p => p.filter(c => c.id !== id));
  };



  const exportDatabase = () => {
    const data = { appSubjects, appChapters, appSubChapters, criteriaTables, canvasConfigs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mams_database_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.appSubjects) setAppSubjects(data.appSubjects);
        if (data.appChapters) setAppChapters(data.appChapters);
        if (data.appSubChapters) setAppSubChapters(data.appSubChapters);
        if (data.criteriaTables) setCriteriaTables(data.criteriaTables);
        if (data.canvasConfigs) setCanvasConfigs(data.canvasConfigs);
        alert('Database imported successfully!');
      } catch (err) {
        alert('Invalid database file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };



  const renderItems = (chapName, subChapId = null) => {
    const tables = criteriaTables.filter(t => t.chapter === chapName && (t.subChapterId || null) === subChapId);
    const canvases = canvasConfigs.filter(c => c.chapter === chapName && (c.subChapterId || null) === subChapId);
    const pureCanvases = canvases.filter(c => !c.type || c.type === 'CANVAS');
    const numConfigs = canvases.filter(c => c.type === 'NUMERICAL');
    const oddConfigs = canvases.filter(c => c.type === 'ODD_ONE_OUT');
    const scopeKey = subChapId ? `sub_${subChapId}` : `chap_${chapName}`;

    return (
      <div className="space-y-3 mt-2 mb-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
        {/* Tables */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1"><span>📋</span> Tables</p>
          </div>
          {tables.length > 0 && (
            <ul className="space-y-1 mb-2">
              {tables.map(t => (
                <li key={t.id} className="flex items-center gap-2 group p-1.5 rounded-lg hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100">
                  <button onClick={() => { setSelectedTableId(t.id); setScreen('CRITERIA_TABLE_BUILDER'); }}
                    className="text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors text-left truncate flex-1">
                    {t.name}
                  </button>
                  <button onClick={() => deleteTable(t.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <input type="text" placeholder="+ New Table Name" value={newTableChapter === scopeKey ? newTableName : ''}
              onChange={e => { setNewTableName(e.target.value); setNewTableChapter(scopeKey); }}
              onClick={() => setNewTableChapter(scopeKey)}
              className="flex-1 px-2 py-1 text-[10px] font-bold bg-transparent focus:outline-none focus:text-indigo-700" />
            <button onClick={() => addCriteriaTable(chapName, subChapId)} className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded uppercase shadow-sm transition-colors">Add</button>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full my-3"></div>

        {/* Canvases */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-1"><span>🎮</span> Games</p>
          </div>
          {canvases.length > 0 && (
            <ul className="space-y-1 mb-2">
              {pureCanvases.map(c => (
                <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-teal-50 border-teal-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                  <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                    className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-teal-800' : 'text-slate-700 hover:text-teal-600'}`}>
                    <span className="text-teal-500">🧩</span> {c.name}
                  </button>
                  <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                </li>
              ))}
              {numConfigs.map(c => (
                <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                  <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                    className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-amber-800' : 'text-slate-700 hover:text-amber-600'}`}>
                    <span className="text-amber-500">🔢</span> {c.name}
                  </button>
                  <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                </li>
              ))}
              {oddConfigs.map(c => (
                <li key={c.id} className={`flex items-center gap-2 group p-1.5 rounded-lg transition-colors border ${selectedCanvasId === c.id ? 'bg-rose-50 border-rose-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                  <button onClick={() => { setSelectedCanvasId(c.id); setActiveComposerQuestionId(c.questions[0]?.id); }}
                    className={`text-xs font-bold transition-colors text-left truncate flex-1 flex items-center gap-2 ${selectedCanvasId === c.id ? 'text-rose-800' : 'text-slate-700 hover:text-rose-600'}`}>
                    <span className="text-rose-500">❌</span> {c.name}
                  </button>
                  <button onClick={() => deleteCanvas(c.id)} className="text-[9px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 uppercase">Del</button>
                </li>
              ))}
            </ul>
          )}
          
          <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <input type="text" placeholder="Name new game..." value={newCanvasChapter === scopeKey ? newCanvasName : ''}
              onChange={e => { setNewCanvasName(e.target.value); setNewCanvasChapter(scopeKey); }}
              onClick={() => setNewCanvasChapter(scopeKey)}
              className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-500" />
            <div className="flex gap-2">
              <button onClick={() => addCanvas('CANVAS', chapName, subChapId)} className="flex-1 text-[9px] font-black text-white bg-teal-500 hover:bg-teal-600 py-1.5 rounded uppercase shadow-sm transition-colors">🧩 Jigsaw</button>
              <button onClick={() => { setNewCanvasName('Numerical Deck'); addCanvas('NUMERICAL', chapName, subChapId); }} className="flex-1 text-[9px] font-black text-white bg-amber-500 hover:bg-amber-600 py-1.5 rounded uppercase shadow-sm transition-colors">🔢 Num</button>
              <button onClick={() => { setNewCanvasName('Odd One Out Deck'); addCanvas('ODD_ONE_OUT', chapName, subChapId); }} className="flex-1 text-[9px] font-black text-white bg-rose-500 hover:bg-rose-600 py-1.5 rounded uppercase shadow-sm transition-colors">❌ Odd</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 flex justify-between items-center z-30 shadow-sm relative">
        <div>
          <p className="text-[9px] font-black text-clinical-gold uppercase tracking-widest">Admin Dashboard</p>
          <h2 className="text-lg font-black text-slate-900">Curriculum Architect</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="mr-4 flex items-center">
            {!isCloudLoaded && <span className="text-[10px] font-bold text-amber-500 animate-pulse">Connecting...</span>}
            {isCloudLoaded && isSyncing && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Syncing... ☁️</span>}
            {isCloudLoaded && !isSyncing && <span className="text-[10px] font-bold text-teal-600">Cloud Synced ☁️✓</span>}
          </div>

          <button onClick={() => { setSelectedCanvasId(null); setScreen('PLAYER_HOME'); }}
            className="text-[10px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-wide ml-2 mr-2">▶ Play Game</button>
          <button onClick={() => { setAdminPassword(''); setSelectedCanvasId(null); setScreen('GATE'); }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wide ml-2 border-l border-slate-300 pl-3">Sign Out</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Curriculum Index */}
        <div className={`transition-all duration-300 ${selectedCanvasId ? 'w-[340px] flex-shrink-0' : 'w-full'} flex`}>
          <CurriculumSidebar
            appSubjects={appSubjects} setAppSubjects={setAppSubjects}
            appChapters={appChapters} setAppChapters={setAppChapters}
            appSubChapters={appSubChapters} setAppSubChapters={setAppSubChapters}
            expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters}
            criteriaTables={criteriaTables} setCriteriaTables={setCriteriaTables}
            canvasConfigs={canvasConfigs} setCanvasConfigs={setCanvasConfigs}
            renderItems={renderItems}
            onExport={exportDatabase}
            onImport={importDatabase}
          />
        </div>
        {/* RIGHT PANEL: Canvas Composer or Placeholder */}
        {selectedCanvasId ? (
          <div className="flex-1 bg-white overflow-hidden relative shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 z-10">
            <CanvasComposer
              canvasConfigs={canvasConfigs}
              setCanvasConfigs={setCanvasConfigs}
              selectedCanvasId={selectedCanvasId}
              criteriaTables={criteriaTables}
              activeComposerQuestionId={activeComposerQuestionId}
              setActiveComposerQuestionId={setActiveComposerQuestionId}
              parseNumericalData={parseNumericalData}
              startGame={startGame}
              setActiveGameMode={setActiveGameMode}
              setIsPreviewMode={setIsPreviewMode}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50/50">
            <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-3xl max-w-sm shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-base font-black text-slate-800 mb-2">No Canvas Selected</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed font-medium">Select a Canvas from the index on the left to start building your game questions.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
