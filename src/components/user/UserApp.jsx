import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getTileColor, parseNumericalData } from '../../utils/gameLogic.js';
import { useGameEngine } from '../../engine/useGameEngine.js';

import AuthScreen from '../screens/AuthScreen';
import McqDashboard from '../screens/McqDashboard';
import TestRunnerScreen from '../screens/TestRunnerScreen';
import TestResultsScreen from '../screens/TestResultsScreen';
import PlayerHome from '../screens/PlayerHome';
import GameScreen from '../screens/GameScreen';
import GameOverScreen from '../screens/GameOverScreen';
import ReviewScreen from '../screens/ReviewScreen';

function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

export default function UserApp() {
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [appSubjects, setAppSubjects] = useState([]);
  const [appChapters, setAppChapters] = useState([]);
  const [appSubChapters, setAppSubChapters] = useState([]);
  const [criteriaTables, setCriteriaTables] = useState([]);
  const [canvasConfigs, setCanvasConfigs] = useState([]);

  // Fetch read-only data for the mobile app
  useEffect(() => {
    async function loadCloudData() {
      try {
        const { data, error } = await supabase.from('mams_app_state').select('data').eq('id', 'main').single();
        if (data && data.data) {
           const d = data.data;
           if (d.appSubjects) setAppSubjects(d.appSubjects);
           if (d.appChapters) setAppChapters(d.appChapters);
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

  // ── Routing & State ────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('AUTH');
  const [activeGameMode, setActiveGameMode] = useState('CANVAS');
  const [difficulty, setDifficulty] = useState('easy');
  const [playerNickname, setPlayerNickname] = useState('Student');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Auth State
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && screen === 'AUTH') setScreen('MCQ_DASHBOARD');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && screen === 'AUTH') setScreen('MCQ_DASHBOARD');
      if (!session) {
        setScreen('AUTH');
      }
    });
    return () => subscription.unsubscribe();
  }, [screen]);

  // Anti-Piracy Measures
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleCopy = (e) => { e.preventDefault(); alert("Copying content is disabled for copyright protection."); };
    const handleCut = (e) => { e.preventDefault(); alert("Cutting content is disabled for copyright protection."); };
    const handleKeyDown = (e) => {
      // Basic block for Print Screen and Save As (Ctrl/Cmd + S)
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 's') || (e.metaKey && e.key === 's')) {
        e.preventDefault();
        alert("Screenshots and saving are disabled.");
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Expanded Chapters State
  const [expandedChapters, setExpandedChapters] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_expandedChapters_mobile');
      return saved ? JSON.parse(saved) : { Cardiology: true };
    } catch (e) { return { Cardiology: true }; }
  });
  useEffect(() => { localStorage.setItem('mams_expandedChapters_mobile', JSON.stringify(expandedChapters)); }, [expandedChapters]);

  // MCQ Engine State
  const [mcqTestConfig, setMcqTestConfig] = useState(null);
  const [mcqTestResults, setMcqTestResults] = useState(null);
  const [mcqTestTime, setMcqTestTime] = useState(0);

  const startMcqTest = (config) => {
    setMcqTestConfig(config);
    setScreen('MCQ_TEST');
  };

  const finishMcqTest = async (results, timeTaken) => {
    setMcqTestResults(results);
    setMcqTestTime(timeTaken);
    setScreen('MCQ_RESULTS');
    
    // Save to DB if test mode
    if (session && mcqTestConfig.mode === 'TEST') {
      const correctCount = results.filter(r => r.isCorrect).length;
      const wrongCount = results.filter(r => !r.isCorrect && r.userAnswer !== 'SKIPPED').length;
      let dbScore = correctCount - (wrongCount / 3);
      dbScore = Math.round(dbScore * 100) / 100;

      await supabase.from('test_sessions').insert([{
        user_id: session.user.id,
        subject: mcqTestConfig.subject,
        chapter: mcqTestConfig.chapter || 'MIXED',
        score: dbScore,
        total_questions: results.length,
        time_taken_seconds: timeTaken
      }]);
    }
    
    // Save exact question history (for both Practice and Test modes)
    if (session) {
      try {
        const historyPayload = results.map(r => ({
          user_id: session.user.id,
          mcq_id: r.question.id,
          is_correct: r.isCorrect,
        }));
        // We use upsert so if they replay, it just updates their latest attempt
        const { error: histErr } = await supabase.from('user_question_history').upsert(historyPayload, { onConflict: 'user_id, mcq_id' });
        if (histErr) console.error("History logging failed (table might not exist yet):", histErr.message);
      } catch (e) {
        console.error("History tracking error:", e);
      }
    }
  };

  const engine = useGameEngine({
    appChapters, criteriaTables, canvasConfigs, activeGameMode, difficulty, setScreen
  });

  if (!isCloudLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold">Loading App...</div>;

  return (
    <div className="w-full min-h-screen relative">


      {screen === 'AUTH' && <AuthScreen setScreen={setScreen} adminPassword={adminPassword} setAdminPassword={setAdminPassword} />}
      {screen === 'MCQ_DASHBOARD' && <McqDashboard setScreen={setScreen} startTest={startMcqTest} viewPastResults={(results) => { setMcqTestResults(results); setMcqTestTime(0); setMcqTestConfig({ mode: 'REVIEW' }); setScreen('MCQ_RESULTS'); }} adminPassword={adminPassword} />}
      {screen === 'MCQ_TEST' && <TestRunnerScreen testConfig={mcqTestConfig} finishTest={finishMcqTest} setScreen={setScreen} />}
      {screen === 'MCQ_RESULTS' && <TestResultsScreen results={mcqTestResults} totalTimeSeconds={mcqTestTime} setScreen={setScreen} mode={mcqTestConfig?.mode} />}
      {screen === 'PLAYER_HOME' && <PlayerHome difficulty={difficulty} setDifficulty={setDifficulty} activeGameMode={activeGameMode} setActiveGameMode={setActiveGameMode} startGame={engine.startGame} appSubjects={appSubjects} appChapters={appChapters} appSubChapters={appSubChapters} expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters} canvasConfigs={canvasConfigs} setScreen={setScreen} adminPassword={adminPassword} />}
      {screen === 'GAME' && <GameScreen activeTargetObjective={engine.activeTargetObjective} activeGameMode={activeGameMode} boardTiles={engine.boardTiles} showLevelUp={engine.showLevelUp} marathonLevel={engine.marathonLevel} marathonLives={engine.marathonLives} activeCanvasIdx={engine.activeCanvasIdx} gameCanvasQueue={engine.gameCanvasQueue} score={engine.score} difficulty={difficulty} timeRemaining={engine.timeRemaining} parseNumericalData={parseNumericalData} handleTileTap={engine.handleTileTap} getTileColor={getTileColor} advanceToNext={engine.advanceToNext} setScreen={setScreen} setScore={engine.setScore} isShuffling={engine.isShuffling} activeQuestionIdx={engine.activeQuestionIdx} activeCanvasConfig={engine.activeCanvasConfig} />}
      {screen === 'GAME_OVER' && <GameOverScreen marathonLevel={engine.marathonLevel} totalRoundsCompleted={engine.totalRoundsCompleted} score={engine.score} difficulty={difficulty} setScreen={setScreen} />}
      {screen === 'REVIEW' && <ReviewScreen gameCanvasQueue={engine.gameCanvasQueue} sessionAuditLog={engine.sessionAuditLog} criteriaTables={criteriaTables} score={engine.score} difficulty={difficulty} isPreviewMode={engine.isPreviewMode} setScreen={setScreen} setScore={engine.setScore} setIsPreviewMode={engine.setIsPreviewMode} activeGameMode={activeGameMode} parseNumericalData={parseNumericalData} activeChapterTables={engine.activeChapterTables} />}
    </div>
  );
}
