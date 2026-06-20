import { useState, useEffect, useRef } from 'react';
import { INITIAL_CANVAS_CONFIGS } from './data/datasets.js';
import { playSound } from './utils/audio.js';
import { getTileColor, parseNumericalData } from './utils/gameLogic.js';
import { useGameEngine } from './engine/useGameEngine.js';
import { supabase } from './supabaseClient';
import GateScreen from './components/screens/GateScreen';
import PlayerHome from './components/screens/PlayerHome';
import GameScreen from './components/screens/GameScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import ReviewScreen from './components/screens/ReviewScreen';
import CriteriaTableBuilder from './components/screens/CriteriaTableBuilder';
import AdminDashboard from './components/screens/AdminDashboard';


// ─── Screens ─────────────────────────────────────────────────────────────────
// GATE | PLAYER_HOME | GAME | REVIEW
// ADMIN_HOME | CRITERIA_TABLE_BUILDER | CANVAS_COMPOSER

function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

export default function App() {
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [appSubjects, setAppSubjects] = useState(['Medicine']);
  const [appChapters, setAppChapters] = useState([{ id: 'ch_cardiology', name: 'Cardiology', subject: 'Medicine' }]);
  const [appSubChapters, setAppSubChapters] = useState([]);
  const [criteriaTables, setCriteriaTables] = useState([]);
  const [canvasConfigs, setCanvasConfigs] = useState([]);

  useEffect(() => {
    async function loadCloudData() {
      try {
        const { data, error } = await supabase.from('mams_app_state').select('data').eq('id', 'main').single();
        if (data && data.data) {
           const d = data.data;
           if (d.appSubjects && d.appSubjects.length > 0) setAppSubjects(d.appSubjects);
           if (d.appChapters && d.appChapters.length > 0) setAppChapters(d.appChapters);
           if (d.appSubChapters) setAppSubChapters(d.appSubChapters);
           
           if (d.criteriaTables) {
             const parsedTables = d.criteriaTables.map(t => {
               if (!t) return null;
               const rows = Array.isArray(t.rows) ? t.rows.map(r => {
                 if (!r) return null;
                 const cells = Array.isArray(r.cells) ? r.cells.map(c => {
                   if (!c) return { text: '', tiles: [] };
                   const tiles = Array.isArray(c.tiles) ? c.tiles.map(tile => {
                     if (!tile) return null;
                     const subtiles = Array.isArray(tile.subtiles) ? tile.subtiles.filter(Boolean) : [];
                     return { ...tile, subtiles };
                   }).filter(Boolean) : [];
                   return { ...c, tiles };
                 }) : [];
                 return { ...r, cells };
               }).filter(Boolean) : [];
               return { ...t, rows };
             }).filter(Boolean);
             setCriteriaTables(parsedTables);
           }
           
           if (d.canvasConfigs) {
             const parsedCanvases = d.canvasConfigs.map(c => {
               if (!c) return null;
               const questions = Array.isArray(c.questions) && c.questions.length > 0 
                 ? c.questions 
                 : [{ id: uid('cq'), prompt: c.gamingQuestion || 'Identify Criteria', selectedTileIds: c.criteriaIds || [] }];
               return { ...c, questions };
             }).filter(Boolean);
             setCanvasConfigs(parsedCanvases);
           }
        }
      } catch(e) {
        console.error("Cloud load error:", e);
      } finally {
        setIsCloudLoaded(true);
      }
    }
    loadCloudData();
  }, []);

  useEffect(() => {
    if (!isCloudLoaded) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const data = { appSubjects, appChapters, appSubChapters, criteriaTables, canvasConfigs };
      await supabase.from('mams_app_state').upsert({ id: 'main', data, updated_at: new Date().toISOString() });
      setTimeout(() => setIsSyncing(false), 800);
    }, 1500);
    return () => clearTimeout(timer);
  }, [appSubjects, appChapters, appSubChapters, criteriaTables, canvasConfigs, isCloudLoaded]);

  // ── Routing ──────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('GATE');
  const [activeGameMode, setActiveGameMode] = useState('CANVAS');
  const [difficulty, setDifficulty] = useState('easy');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [playerNickname, setPlayerNickname] = useState('Student');
  


  // ── Admin selection state ─────────────────────────────────────────────────
  const [selectedTableId, setSelectedTableId] = useState(() => {
    try { return localStorage.getItem('mams_selectedTableId') || null; } catch (e) { return null; }
  });
  const [selectedCanvasId, setSelectedCanvasId] = useState(() => {
    try { return localStorage.getItem('mams_selectedCanvasId') || null; } catch (e) { return null; }
  });
  const [activeComposerQuestionId, setActiveComposerQuestionId] = useState(() => {
    try { return localStorage.getItem('mams_activeComposerQuestionId') || null; } catch (e) { return null; }
  });
  const [expandedChapters, setExpandedChapters] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_expandedChapters');
      return saved ? JSON.parse(saved) : { Cardiology: true };
    } catch (e) { return { Cardiology: true }; }
  });
  const [expandedNodes, setExpandedNodes] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_expandedNodes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  useEffect(() => { localStorage.setItem('mams_screen', screen); }, [screen]);
  useEffect(() => { if (selectedTableId) localStorage.setItem('mams_selectedTableId', selectedTableId); else localStorage.removeItem('mams_selectedTableId'); }, [selectedTableId]);
  useEffect(() => { if (selectedCanvasId) localStorage.setItem('mams_selectedCanvasId', selectedCanvasId); else localStorage.removeItem('mams_selectedCanvasId'); }, [selectedCanvasId]);
  useEffect(() => { if (activeComposerQuestionId) localStorage.setItem('mams_activeComposerQuestionId', activeComposerQuestionId); else localStorage.removeItem('mams_activeComposerQuestionId'); }, [activeComposerQuestionId]);
  useEffect(() => { localStorage.setItem('mams_expandedChapters', JSON.stringify(expandedChapters)); }, [expandedChapters]);
  useEffect(() => { localStorage.setItem('mams_expandedNodes', JSON.stringify(expandedNodes)); }, [expandedNodes]);




  const engine = useGameEngine({
    appChapters, criteriaTables, activeGameMode, difficulty, setScreen
  });
  // --- Global Error Catcher ---
  const [globalError, setGlobalError] = useState(null);
  useEffect(() => {
    const handleError = (e) => {
      console.error(e);
      setGlobalError(e.message || e.reason?.message || JSON.stringify(e));
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (globalError) {
    return (
      <div className="min-h-screen bg-red-50 p-8 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-black text-red-600 mb-4">Game Crashed!</h1>
        <p className="text-red-800 bg-white p-6 rounded-xl border border-red-200 shadow-sm max-w-2xl font-mono text-sm break-all">
          {globalError}
        </p>
        <p className="mt-4 text-slate-500 font-bold">Please share this exact error message.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Refresh Page</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={`w-full min-h-screen ${(screen === 'ADMIN_HOME' || screen === 'CANVAS_COMPOSER') ? 'h-screen overflow-hidden' : ''}`}>
      {screen === 'GATE' && <GateScreen playerNickname={playerNickname} setPlayerNickname={setPlayerNickname} setScreen={setScreen} adminPassword={adminPassword} setAdminPassword={setAdminPassword} />}
      {screen === 'PLAYER_HOME' && <PlayerHome difficulty={difficulty} setDifficulty={setDifficulty} activeGameMode={activeGameMode} setActiveGameMode={setActiveGameMode} startGame={engine.startGame} appSubjects={appSubjects} appChapters={appChapters} appSubChapters={appSubChapters} expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters} canvasConfigs={canvasConfigs} setScreen={setScreen} adminPassword={adminPassword} />}
      {screen === 'GAME' && <GameScreen activeTargetObjective={engine.activeTargetObjective} activeGameMode={activeGameMode} boardTiles={engine.boardTiles} showLevelUp={engine.showLevelUp} marathonLevel={engine.marathonLevel} marathonLives={engine.marathonLives} activeCanvasIdx={engine.activeCanvasIdx} gameCanvasQueue={engine.gameCanvasQueue} score={engine.score} difficulty={difficulty} timeRemaining={engine.timeRemaining} parseNumericalData={parseNumericalData} handleTileTap={engine.handleTileTap} getTileColor={getTileColor} advanceToNext={engine.advanceToNext} setScreen={setScreen} setScore={engine.setScore} isShuffling={engine.isShuffling} activeQuestionIdx={engine.activeQuestionIdx} activeCanvasConfig={engine.activeCanvasConfig} />}
      {screen === 'GAME_OVER' && <GameOverScreen marathonLevel={engine.marathonLevel} totalRoundsCompleted={engine.totalRoundsCompleted} score={engine.score} difficulty={difficulty} setScreen={setScreen} />}
      {screen === 'REVIEW' && <ReviewScreen gameCanvasQueue={engine.gameCanvasQueue} sessionAuditLog={engine.sessionAuditLog} criteriaTables={criteriaTables} score={engine.score} difficulty={difficulty} isPreviewMode={engine.isPreviewMode} setScreen={setScreen} setScore={engine.setScore} setIsPreviewMode={engine.setIsPreviewMode} activeGameMode={activeGameMode} parseNumericalData={parseNumericalData} activeChapterTables={engine.activeChapterTables} />}
      {(screen === 'ADMIN_HOME' || screen === 'CANVAS_COMPOSER') && <AdminDashboard 
        appSubjects={appSubjects} setAppSubjects={setAppSubjects}
        appChapters={appChapters} setAppChapters={setAppChapters}
        appSubChapters={appSubChapters} setAppSubChapters={setAppSubChapters}
        expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters}
        criteriaTables={criteriaTables} setCriteriaTables={setCriteriaTables}
        canvasConfigs={canvasConfigs} setCanvasConfigs={setCanvasConfigs}
        selectedCanvasId={selectedCanvasId} setSelectedCanvasId={setSelectedCanvasId}
        isCloudLoaded={isCloudLoaded} isSyncing={isSyncing}
        setScreen={setScreen} setAdminPassword={setAdminPassword}
        setSelectedTableId={setSelectedTableId}
        activeComposerQuestionId={activeComposerQuestionId} setActiveComposerQuestionId={setActiveComposerQuestionId}
        startGame={engine.startGame} setActiveGameMode={setActiveGameMode} setIsPreviewMode={engine.setIsPreviewMode}
        parseNumericalData={parseNumericalData}
        expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}
      />}
      {screen === 'CRITERIA_TABLE_BUILDER' && <CriteriaTableBuilder criteriaTables={criteriaTables} setCriteriaTables={setCriteriaTables} selectedTableId={selectedTableId} setScreen={setScreen} />}
      {![
        'GATE', 'PLAYER_HOME', 'GAME', 'GAME_OVER', 'REVIEW', 'ADMIN_HOME', 'CANVAS_COMPOSER', 'CRITERIA_TABLE_BUILDER'
      ].includes(screen) && (
        <div className="flex flex-col items-center justify-center h-screen bg-rose-50">
          <p className="text-rose-600 font-bold mb-4">Error: Unknown Screen State "{screen}"</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-rose-600 text-white font-bold py-2 px-4 rounded-lg">
            Hard Reset App
          </button>
        </div>
      )}
    </div>
  );
}
