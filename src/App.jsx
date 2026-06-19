import { useState, useEffect, useRef } from 'react';
import { INITIAL_CANVAS_CONFIGS, playSound } from './data/datasets.js';
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
  const [adminPassword, setAdminPassword] = useState('');
  const [playerNickname, setPlayerNickname] = useState('');
  
  // ── Marathon State ────────────────────────────────────────────────────────
  const [marathonLives, setMarathonLives] = useState(10);
  const [marathonMistakes, setMarathonMistakes] = useState(0);
  const [marathonLevel, setMarathonLevel] = useState(1);
  const [roundsCompletedInLevel, setRoundsCompletedInLevel] = useState({ canvas: 0, numerical: 0, oddOneOut: 0 });
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [totalRoundsCompleted, setTotalRoundsCompleted] = useState(0);

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



  // ── Game state ─────────────────────────────────────────────────────────────
  const [boardTiles, setBoardTiles] = useState([]);
  const [gameCanvasQueue, setGameCanvasQueue] = useState([]);
  const [activeCanvasIdx, setActiveCanvasIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [activeTargetObjective, setActiveTargetObjective] = useState(null);
  const [activeCanvasConfig, setActiveCanvasConfig] = useState(null);
  const [activeChapterTables, setActiveChapterTables] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerRef = useRef(null);
  const activeCanvasIdxRef = useRef(0);
  const activeQuestionIdxRef = useRef(0);
  const gameCanvasQueueRef = useRef([]);
  const isTransitioningRef = useRef(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [totalTargetCount, setTotalTargetCount] = useState(0);
  const [sessionAuditLog, setSessionAuditLog] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const boardTilesRef = useRef(boardTiles);
  const activeTargetObjectiveRef = useRef(activeTargetObjective);
  // Ref for activeGameMode so advanceToNext / timers always read latest value without stale closures
  const activeGameModeRef = useRef(activeGameMode);
  useEffect(() => { boardTilesRef.current = boardTiles; }, [boardTiles]);
  useEffect(() => { activeTargetObjectiveRef.current = activeTargetObjective; }, [activeTargetObjective]);
  useEffect(() => { activeCanvasIdxRef.current = activeCanvasIdx; }, [activeCanvasIdx]);
  useEffect(() => { activeQuestionIdxRef.current = activeQuestionIdx; }, [activeQuestionIdx]);
  useEffect(() => { gameCanvasQueueRef.current = gameCanvasQueue; }, [gameCanvasQueue]);
  useEffect(() => { activeGameModeRef.current = activeGameMode; }, [activeGameMode]);

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════
  const getInitialTime = () => {
    let base = { easy: 60, medium: 45, hard: 30 }[difficulty] || 60;
    if (activeGameMode === 'MIXED_MARATHON') {
      base = Math.max(8, base - ((marathonLevel - 1) * 5)); // speeds up 5s every level, min 8s
    }
    return base;
  };

  const getTileColor = (category = '') => {
    const lc = category.toLowerCase();
    if (lc.includes('major')) return 'bg-blue-50/80 hover:bg-blue-100 border-blue-200 text-blue-900';
    if (lc.includes('minor')) return 'bg-violet-50/80 hover:bg-violet-100 border-violet-200 text-violet-900';
    return 'bg-teal-50/80 hover:bg-teal-100 border-teal-200 text-teal-900';
  };

  const parseNumericalData = (label) => {
    if (!label) return null;
    // Match: optional prefix words, then a number, then optional suffix unit
    const match = label.match(/^(.*?)(\d+(?:[.,]\d+)?(?:[-–]\d+(?:[.,]\d+)?)?)\s*([a-zA-Z°/%]+(?: [a-zA-Z°/%]+)*)?\s*$/);
    if (!match) return null;
    const prefix = (match[1] || '').trim();
    const number = match[2].replace(',', '.');
    const suffix = (match[3] || '').trim();
    // Redacted: replace the number with ___
    const redacted = label.replace(match[2], '___');
    // Unit key: normalized suffix for grouping distractors (lowercase, no spaces)
    const unitKey = suffix.toLowerCase().replace(/\s+/g, '');
    return { number, suffix, unitKey, prefix, redacted, original: label };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GAME SESSION
  // ════════════════════════════════════════════════════════════════════════════

  const startGame = (chapterName, targetCanvasId = null, subjectName = null, isGlobal = false, isPreview = false, forceMode = null) => {
    const modeToPlay = forceMode || activeGameMode;
    let chapterTables = [];
    if (modeToPlay === 'MIXED_MARATHON') {
      if (isGlobal) {
        chapterTables = criteriaTables; // ALL tables
      } else if (subjectName) {
        chapterTables = criteriaTables.filter(t => {
          const chap = appChapters.find(c => c.name === t.chapter);
          return chap && chap.subject === subjectName;
        });
      } else {
        chapterTables = criteriaTables.filter(t => t.chapter === chapterName);
      }
    } else {
      chapterTables = criteriaTables.filter(t => t.chapter === chapterName);
    }

    if (!chapterTables.length) {
      alert('No criteria tables found for this selection.');
      return;
    }

    setScore({ correct: 0, wrong: 0 });
    setTotalTargetCount(0);
    setTotalRoundsCompleted(0);
    setSessionAuditLog([]);
    setIsPreviewMode(isPreview);
    setActiveChapterTables(chapterTables);

    if (modeToPlay === 'MIXED_MARATHON') {
      setMarathonLives(10);
      setMarathonMistakes(0);
      setMarathonLevel(1);
      setRoundsCompletedInLevel({ canvas: 0, numerical: 0, oddOneOut: 0 });
      setGameCanvasQueue([{ id: 'arcade', questions: new Array(100).fill({}) }]);
      setActiveCanvasIdx(0);
      setActiveQuestionIdx(0);
      loadMarathonSlide(chapterTables);
    } else if (modeToPlay === 'CANVAS') {
      let canvases = canvasConfigs.filter(c => c.chapter === chapterName && c.questions.some(q => q.selectedTileIds.length > 0));
      if (targetCanvasId) canvases = canvases.filter(c => c.id === targetCanvasId);
      if (!canvases.length) {
        alert('No playable canvases with selected tiles here yet.');
        return;
      }
      setGameCanvasQueue(canvases);
      setActiveCanvasIdx(0);
      setActiveQuestionIdx(0);
      loadCanvasSlide(canvases[0], 0, chapterTables);
    } else if (modeToPlay === 'NUMERICAL') {
      let configs = canvasConfigs.filter(c => c.chapter === chapterName && c.type === 'NUMERICAL');
      if (targetCanvasId) configs = configs.filter(c => c.id === targetCanvasId);
      
      const allTiles = chapterTables.flatMap(t => (t.rows||[]).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]))));
      const numericalTiles = allTiles.filter(t => parseNumericalData(t.label));
      
      if (configs.length > 0) {
        setGameCanvasQueue(configs);
        setActiveCanvasIdx(0);
        setActiveQuestionIdx(0);
        loadNumericalSlide(chapterTables, configs[0], 0);
      } else {
        if (numericalTiles.length < 4) {
          alert('Not enough numerical tiles in this chapter to play Rapid Fire (Need at least 4).');
          return;
        }
        setGameCanvasQueue([{ id: 'arcade', questions: new Array(100).fill({}) }]);
        setActiveCanvasIdx(0);
        setActiveQuestionIdx(0);
        loadNumericalSlide(chapterTables);
      }
    } else if (modeToPlay === 'ODD_ONE_OUT') {
      let configs = canvasConfigs.filter(c => c.chapter === chapterName && c.type === 'ODD_ONE_OUT');
      if (targetCanvasId) configs = configs.filter(c => c.id === targetCanvasId);
      
      if (configs.length > 0) {
        setGameCanvasQueue(configs);
        setActiveCanvasIdx(0);
        setActiveQuestionIdx(0);
        loadOddOneOutSlide(configs[0], 0);
      } else {
        const chapterCanvases = canvasConfigs.filter(c => c.chapter === chapterName && (!c.type || c.type === 'CANVAS'));
        const playableQuestions = chapterCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 3).map(q => ({ canvas: c, question: q })));
        
        if (playableQuestions.length === 0) {
          alert('To auto-play Odd One Out, you must first build Canvas slides in this chapter that have at least 3 tiles selected in them.');
          return;
        }
        setGameCanvasQueue([{ id: 'arcade', questions: new Array(100).fill({}) }]);
        setActiveCanvasIdx(0);
        setActiveQuestionIdx(0);
        loadOddOneOutSlide(chapterTables, null, 0);
      }
    }
  };

  const loadMarathonSlide = (chapterTablesParam) => {
    const chapterTables = chapterTablesParam || activeChapterTables;
    const modes = ['CANVAS', 'NUMERICAL', 'ODD_ONE_OUT'];
    const selectedMode = modes[Math.floor(Math.random() * modes.length)];

    if (selectedMode === 'NUMERICAL') {
      const allTiles = chapterTables.flatMap(t => (t.rows||[]).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]))));
      const numericalTiles = allTiles.filter(t => parseNumericalData(t.label));
      if (numericalTiles.length >= 4) {
        // Pass subMode so loadNumericalSlide embeds it in activeTargetObjective
        return loadNumericalSlide(chapterTables, null, 0, 'NUMERICAL');
      }
    } else if (selectedMode === 'ODD_ONE_OUT') {
      const allCanvases = canvasConfigs.filter(c => chapterTables.some(t => t.chapter === c.chapter));
      const playableQuestions = allCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 3).map(q => ({ canvas: c, question: q })));
      if (playableQuestions.length > 0) {
        return loadOddOneOutSlide(chapterTables, null, 0, 'ODD_ONE_OUT');
      }
    }
    
    // Fallback to Canvas mode if numerical/odd-one-out criteria aren't met
    const allCanvases = canvasConfigs.filter(c => chapterTables.some(t => t.chapter === c.chapter));
    const playableQs = allCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length > 0).map(q => ({ canvas: c, question: q })));
    if (playableQs.length > 0) {
      const randomQ = playableQs[Math.floor(Math.random() * playableQs.length)];
      const mockCanvas = { ...randomQ.canvas, questions: [randomQ.question] };
      return loadCanvasSlide(mockCanvas, 0, chapterTables, 'CANVAS');
    } else {
      // If literally nothing is playable
      alert("Not enough content to play a marathon. Please build at least one Canvas slide.");
      setScreen('PLAYER_HOME');
    }
  };

  const loadCanvasSlide = (canvas, qIdx, chapterTablesParam, marathonSubMode = null) => {
    if (!canvas) {
      // Safety guard – no canvas available, go to review
      setScreen('REVIEW');
      return;
    }
    const question = canvas.questions[qIdx];
    if (!question) { setScreen('REVIEW'); return; }
    const selectedIds = question.selectedTileIds || [];
    
    // Skip empty questions — jump straight to next without the full advanceToNext animation
    if (!selectedIds.length) {
      // Find next non-empty question in this canvas
      const nextNonEmpty = canvas.questions.findIndex((q, i) => i > qIdx && (q.selectedTileIds||[]).length > 0);
      if (nextNonEmpty !== -1) {
        return loadCanvasSlide(canvas, nextNonEmpty, chapterTablesParam, marathonSubMode);
      }
      setScreen('REVIEW');
      return;
    }

    const chapterTables = chapterTablesParam || activeChapterTables;
    setActiveCanvasConfig(canvas);
    setActiveTargetObjective(p => ({
      ...(p || {}),
      id: question.id,
      diagnosis: question.prompt || 'Identify Criteria',
      subheading: question.subheading,
      marathonSubMode: marathonSubMode || p?.marathonSubMode || null
    }));

    // Build the board
    const allChapterTiles = chapterTables.flatMap(table =>
      table.rows.filter(r => !r.isHeading).flatMap(row =>
        row.cells.flatMap(cell => 
          cell.tiles.flatMap(tile => {
            const baseTile = {
              tileId: tile.id, label: tile.label, criterionId: row.id, criterionFullText: cell.text,
              criterionCategory: table.name, tileCount: cell.tiles.length, 
              partnerTileId: cell.tiles.length === 2 ? cell.tiles.find(t => t.id !== tile.id)?.id : null,
              tableId: table.id, tableName: table.name, parentId: null,
              diagnosis_id: selectedIds.includes(tile.id) ? question.id : `distractor_${table.id}`,
            };
            const items = [baseTile];
            if (tile.subtiles) {
              tile.subtiles.forEach(sub => {
                items.push({
                  ...baseTile, tileId: sub.id, label: sub.label, parentId: tile.id,
                  diagnosis_id: selectedIds.includes(sub.id) ? question.id : `distractor_${table.id}`,
                });
              });
            }
            return items;
          })
        )
      )
    );

    const targetTiles = allChapterTiles.filter(t => t.diagnosis_id === question.id);
    const targetIds = new Set(targetTiles.map(t => t.tileId));
    const targetParentIds = new Set(targetTiles.map(t => t.parentId).filter(Boolean));
    
    const usedLabels = new Set(targetTiles.map(t => t.label.trim().toLowerCase()));
    const previousTargetTileIds = new Set(canvas.questions.slice(0, qIdx).flatMap(q => q.selectedTileIds || []));

    const distractors = allChapterTiles.filter(t => {
      // 1. Not a target tile
      if (t.diagnosis_id === question.id) return false;
      // 2. If its parent is a target, do not show this subtile as distractor
      if (t.parentId && targetIds.has(t.parentId)) return false; 
      // 3. If one of its subtiles is a target, do not show this parent as a distractor
      if (targetParentIds.has(t.tileId)) return false; 
      // 4. No duplicate labels (case insensitive)
      if (usedLabels.has(t.label.trim().toLowerCase())) return false; 
      // 5. Exclude target tiles that were already answered in previous questions of this canvas
      if (previousTargetTileIds.has(t.tileId)) return false;
      
      usedLabels.add(t.label.trim().toLowerCase());
      return true;
    });

    setTotalTargetCount(prev => prev + targetTiles.length);

    const maxTiles = canvas.maxTiles || 16;
    const slotsLeft = maxTiles - targetTiles.length;
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, Math.max(0, slotsLeft));
    const board = [...targetTiles, ...shuffledDistractors].sort(() => Math.random() - 0.5).slice(0, maxTiles);

    setBoardTiles(board.map(c => ({ criterion: c, solved: false, errorState: false })));
    setTimeRemaining(getInitialTime());
    setScreen('GAME');
  };

  const loadNumericalSlide = (chapterTablesParam, configCanvas = null, qIdx = 0, marathonSubMode = null) => {
    const chapterTables = chapterTablesParam || activeChapterTables;

    // Build a flat tile list with FULL heading context:
    // { tileId, label, criterionFullText, criterionCategory (table name),
    //   headingText (last seen heading row text), tableName }
    const allTiles = [];
    chapterTables.forEach(t => {
      let lastHeadingText = '';
      (t.rows || []).forEach(r => {
        if (r.isHeading) {
          lastHeadingText = (r.cells || []).map(c => c.text).filter(Boolean).join(' / ');
          return;
        }
        (r.cells || []).forEach(c => {
          (c.tiles || []).forEach(tile => {
            const base = {
              tileId: tile.id, label: tile.label,
              criterionFullText: c.text || '',
              criterionCategory: t.name || '',
              headingText: lastHeadingText,
              tableName: t.name || ''
            };
            allTiles.push(base);
            (tile.subtiles || []).forEach(s => allTiles.push({ ...base, tileId: s.id, label: s.label }));
          });
        });
      });
    });

    const numTiles = allTiles.filter(t => parseNumericalData(t.label));
    if (numTiles.length < 4) {
      if (activeGameModeRef.current === 'MIXED_MARATHON' || marathonSubMode) {
        return loadCanvasSlide(chapterTablesParam, null, 0, 'CANVAS');
      }
      alert('Not enough numerical tiles in this dataset (Need at least 4).');
      setScreen('PLAYER_HOME');
      return false;
    }

    // --- Helper: find best 3 distractors for a target tile ---
    const findDistractors = (target, excludeIds = []) => {
      const targetData = parseNumericalData(target.label);
      const exclude = new Set([target.tileId, ...excludeIds]);
      // 1st choice: same unitKey (e.g. "°c", "mmhg", "bpm")
      let pool = numTiles.filter(t => {
        if (exclude.has(t.tileId)) return false;
        const d = parseNumericalData(t.label);
        return d && d.unitKey === targetData.unitKey;
      });
      // 2nd choice: same suffix string
      if (pool.length < 3) {
        pool = numTiles.filter(t => {
          if (exclude.has(t.tileId)) return false;
          const d = parseNumericalData(t.label);
          return d && d.suffix === targetData.suffix;
        });
      }
      // 3rd choice: same table
      if (pool.length < 3) {
        pool = numTiles.filter(t => {
          if (exclude.has(t.tileId)) return false;
          return t.tableName === target.tableName;
        });
      }
      // Last resort: any numerical tile
      if (pool.length < 3) pool = numTiles.filter(t => !exclude.has(t.tileId));
      return pool.sort(() => Math.random() - 0.5).slice(0, 3);
    };

    let targetTile;
    let distractors = [];
    let customQuestion = null;

    if (configCanvas && configCanvas.questions[qIdx]) {
      customQuestion = configCanvas.questions[qIdx];
      targetTile = allTiles.find(t => t.tileId === customQuestion.targetTileId);
      if (targetTile) {
        // Use admin-set decoys if provided, else auto-match same-unit
        const adminDecoys = (customQuestion.decoyTileIds || [])
          .map(id => allTiles.find(t => t.tileId === id))
          .filter(Boolean);
        distractors = adminDecoys.length >= 3 ? adminDecoys : findDistractors(targetTile);
      }
    }

    if (!targetTile) {
      targetTile = numTiles[Math.floor(Math.random() * numTiles.length)];
      distractors = findDistractors(targetTile);
    }

    const targetData = parseNumericalData(targetTile.label);

    // Build the question stem: "TableName — Heading — criterion: ___ unit"
    const buildAutoStem = (tile, data) => {
      const parts = [tile.criterionCategory];
      if (tile.headingText && tile.headingText !== tile.criterionCategory) parts.push(tile.headingText);
      if (tile.criterionFullText && tile.criterionFullText !== tile.headingText) parts.push(tile.criterionFullText);
      parts.push(data?.redacted || tile.label);
      return parts.filter(Boolean).join(' — ');
    };

    const prompt = customQuestion?.prompt || buildAutoStem(targetTile, targetData);
    const subheading = customQuestion?.subheading || 'Select the correct numerical value';

    setActiveTargetObjective(p => ({
      ...(p || {}),
      id: targetTile.tileId,
      diagnosis: prompt,
      subheading,
      numericalSuffix: targetData?.suffix || '',
      numericalAnswer: targetData?.number || targetTile.label,
      marathonSubMode: marathonSubMode || p?.marathonSubMode || null
    }));

    const board = [targetTile, ...distractors].sort(() => Math.random() - 0.5);

    setSessionAuditLog(p => [
      ...p,
      ...board.map(t => ({ tileId: t.tileId, solved: false, skipped: false, presentedOnly: true }))
    ]);

    setTotalTargetCount(p => p + 1);
    setBoardTiles(board.map(c => ({ criterion: c, solved: false, errorState: false })));
    setTimeRemaining(Math.max(5, getInitialTime() - (score.correct * 2)));
    setScreen('GAME');
  };



  const loadOddOneOutSlide = (chapterTablesParam, configCanvas = null, qIdx = 0, marathonSubMode = null) => {
    const chapterTables = chapterTablesParam || activeChapterTables;
    const allChapterTiles = chapterTables.flatMap(t => (t.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]).map(t_obj => ({
      tileId: t_obj.id, label: t_obj.label, criterionId: r.id, criterionFullText: c.text,
      criterionCategory: t.name, tableId: t.id, tableName: t.name
    })))));

    let correctFitTiles = [];
    let distractorTile = null;
    let diagnosis = "Which one doesn't belong?";
    let subheading = "Tap the tile that does NOT fit this category";

    // configCanvas is only valid if it's an ODD_ONE_OUT canvas config (has questions array with correctTileIds)
    const isValidOddConfig = configCanvas && !Array.isArray(configCanvas) && configCanvas.questions && configCanvas.questions[qIdx];
    if (isValidOddConfig) {
      const customQuestion = configCanvas.questions[qIdx];
      correctFitTiles = (customQuestion.correctTileIds || []).map(id => allChapterTiles.find(t => t.tileId === id)).filter(Boolean).map(t => ({ ...t, isDistractor: false }));
      const dTile = allChapterTiles.find(t => t.tileId === customQuestion.distractorTileId);
      if (dTile) distractorTile = { ...dTile, isDistractor: true };
      diagnosis = customQuestion.prompt || diagnosis;
      subheading = customQuestion.subheading || subheading;
    }

    if (!distractorTile || correctFitTiles.length === 0) {
      // Auto-generate from all canvas questions in this chapter — use ALL tiles from each question
      const chapterCanvases = canvasConfigs.filter(c => c.chapter === chapterTables[0]?.chapter && (!c.type || c.type === 'CANVAS'));
      const playableQuestions = chapterCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 2).map(q => ({ canvas: c, question: q })));
      if (playableQuestions.length === 0) {
        if (activeGameModeRef.current === 'MIXED_MARATHON' || marathonSubMode) {
          return loadCanvasSlide(chapterTablesParam, null, 0, 'CANVAS');
        }
        alert('No valid Canvas configs found with ≥2 tiles to base Odd-One-Outs on.');
        setScreen('PLAYER_HOME');
        return false;
      }
      const { canvas: srcCanvas, question: selectedQ } = playableQuestions[Math.floor(Math.random() * playableQuestions.length)];
      correctFitTiles = allChapterTiles
        .filter(t => selectedQ.selectedTileIds.includes(t.tileId))
        .map(t => ({ ...t, isDistractor: false }));
      const otherQTileIds = new Set(
        chapterCanvases.flatMap(c => c.questions.filter(q => q.id !== selectedQ.id).flatMap(q => q.selectedTileIds || []))
      );
      const distractorPool = allChapterTiles.filter(t => otherQTileIds.has(t.tileId) && !selectedQ.selectedTileIds.includes(t.tileId));
      const fallbackPool = allChapterTiles.filter(t => !selectedQ.selectedTileIds.includes(t.tileId));
      const pool = distractorPool.length ? distractorPool : fallbackPool;
      if (!pool.length) {
        if (activeGameModeRef.current === 'MIXED_MARATHON' || marathonSubMode) {
          return loadCanvasSlide(chapterTablesParam, null, 0, 'CANVAS');
        }
        setScreen('REVIEW');
        return;
      }
      distractorTile = { ...pool[Math.floor(Math.random() * pool.length)], isDistractor: true };
      diagnosis = selectedQ.prompt || `${srcCanvas.name}: Which tile does NOT belong here?`;
    }

    const board = [...correctFitTiles, distractorTile].sort(() => Math.random() - 0.5);
    setActiveTargetObjective(p => ({
      ...(p || {}),
      id: distractorTile.tileId,
      diagnosis,
      subheading,
      marathonSubMode: marathonSubMode || p?.marathonSubMode || null
    }));
    
    setSessionAuditLog(p => [
      ...p, 
      ...board.map(t => ({ tileId: t.tileId, solved: false, skipped: false, presentedOnly: true }))
    ]);
    
    setTotalTargetCount(p => p + 1);
    setBoardTiles(board.map(c => ({ criterion: c, solved: false, errorState: false })));
    setTimeRemaining(Math.max(5, getInitialTime() - (score.correct * 2)));
    setScreen('GAME');
  };

  // Game Over Effect for Marathon
  useEffect(() => {
    if (activeGameMode === 'MIXED_MARATHON' && marathonLives <= 0 && screen === 'GAME') {
      setScreen('GAME_OVER');
    }
  }, [marathonLives, activeGameMode, screen]);

  // Timer
  useEffect(() => {
    if (screen !== 'GAME' || !gameCanvasQueueRef.current.length) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          advanceToNext();
          return 0;
        }
        if (prev <= 6) playSound('panic');
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, activeCanvasIdx, activeQuestionIdx]);

  const handleTileTap = (idx) => {
    const currentSubMode = activeGameMode === 'MIXED_MARATHON' ? activeTargetObjective?.marathonSubMode : activeGameMode;
    if (currentSubMode === 'NUMERICAL') return handleNumericalTileTap(idx);
    if (currentSubMode === 'ODD_ONE_OUT') return handleOddOneOutTileTap(idx);
    
    // Canvas Mode Handler
    const tile = boardTiles[idx];
    if (tile.solved) return;
    const isMatch = tile.criterion.diagnosis_id === activeTargetObjective?.id;
    const next = [...boardTiles];
    if (isMatch) {
      next[idx].solved = true;
      setScore(p => ({ ...p, correct: p.correct + 1 }));
      playSound('success');
      setSessionAuditLog(p => [...p, { tileId: tile.criterion.tileId, criterionId: tile.criterion.criterionId, tableId: tile.criterion.tableId, solved: true }]);
      if (next.filter(t => t.criterion.diagnosis_id === activeTargetObjective.id && !t.solved).length === 0) {
        setTimeout(advanceToNext, 500);
      }
    } else {
      next[idx].errorState = true;
      setScore(p => ({ ...p, wrong: p.wrong + 1 }));
      if (activeGameMode === 'MIXED_MARATHON') {
        setMarathonMistakes(p => {
          if (p + 1 >= 3) { setMarathonLives(l => Math.max(0, l - 1)); return 0; }
          return p + 1;
        });
      }
      playSound('error');
      setSessionAuditLog(p => [...p, { tileId: tile.criterion.tileId, criterionId: tile.criterion.criterionId, tableId: tile.criterion.tableId, solved: false }]);
      setTimeout(() => setBoardTiles(p => { const r = [...p]; if (r[idx]) r[idx].errorState = false; return r; }), 800);
    }
    setBoardTiles(next);
  };

  const handleNumericalTileTap = (idx) => {
    const tile = boardTiles[idx];
    if (tile.solved) return;
    const isMatch = tile.criterion.tileId === activeTargetObjective?.id;
    const next = [...boardTiles];
    if (isMatch) {
      next[idx].solved = true;
      setScore(p => ({ ...p, correct: p.correct + 1 }));
      playSound('success');
      setBoardTiles(next);
      setTimeout(advanceToNext, 500);
    } else {
      next[idx].errorState = true;
      setScore(p => ({ ...p, wrong: p.wrong + 1 }));
      if (activeGameMode === 'MIXED_MARATHON') {
        setMarathonMistakes(p => {
          if (p + 1 >= 3) { setMarathonLives(l => Math.max(0, l - 1)); return 0; }
          return p + 1;
        });
      }
      playSound('error');
      setBoardTiles(next);
      setTimeout(() => setBoardTiles(p => { const r = [...p]; if (r[idx]) r[idx].errorState = false; return r; }), 800);
    }
  };

  const handleOddOneOutTileTap = (idx) => {
    const tile = boardTiles[idx];
    if (tile.solved) return;
    const isMatch = tile.criterion.isDistractor;
    const next = [...boardTiles];
    if (isMatch) {
      next[idx].solved = true;
      setScore(p => ({ ...p, correct: p.correct + 1 }));
      playSound('success');
      setBoardTiles(next);
      setTimeout(advanceToNext, 500);
    } else {
      next[idx].errorState = true;
      setScore(p => ({ ...p, wrong: p.wrong + 1 }));
      if (activeGameMode === 'MIXED_MARATHON') {
        setMarathonMistakes(p => {
          if (p + 1 >= 3) { setMarathonLives(l => Math.max(0, l - 1)); return 0; }
          return p + 1;
        });
      }
      playSound('error');
      setBoardTiles(next);
      setTimeout(() => setBoardTiles(p => { const r = [...p]; if (r[idx]) r[idx].errorState = false; return r; }), 800);
    }
  };

  const advanceToNext = () => {
    
    // Log missed targets
    const currentBoard = boardTilesRef.current;
    const currentTarget = activeTargetObjectiveRef.current;
    if (currentBoard && currentTarget) {
      const missedTargets = currentBoard.filter(t => !t.solved && t.criterion.diagnosis_id === currentTarget.id);
      if (missedTargets.length > 0) {
        setSessionAuditLog(p => [...p, ...missedTargets.map(t => ({
          tileId: t.criterion.tileId,
          criterionId: t.criterion.criterionId,
          tableId: t.criterion.tableId,
          solved: false,
          skipped: true,
          label: t.criterion.label
        }))]);
      }
    }

    isTransitioningRef.current = true;
    setIsShuffling(true);
    setTimeout(() => {
      // Use ref to always read the latest game mode (avoids stale closure bugs)
      const currentMode = activeGameModeRef.current;

      if (currentMode === 'MIXED_MARATHON') {
        const currentSubMode = activeTargetObjectiveRef.current?.marathonSubMode || 'CANVAS';
        setRoundsCompletedInLevel(p => {
          const next = { ...p };
          if (currentSubMode === 'CANVAS') next.canvas += 1;
          else if (currentSubMode === 'NUMERICAL') next.numerical += 1;
          else if (currentSubMode === 'ODD_ONE_OUT') next.oddOneOut += 1;
          
          if (next.canvas >= 5 && next.numerical >= 5 && next.oddOneOut >= 5) {
            setShowLevelUp(true);
            setMarathonLevel(l => l + 1);
            setMarathonLives(l => Math.min(10, l + 3));
            setTimeout(() => setShowLevelUp(false), 2000);
            return { canvas: 0, numerical: 0, oddOneOut: 0 };
          }
          return next;
        });
        setTotalRoundsCompleted(p => p + 1);
        loadMarathonSlide();
        setIsShuffling(false);
        return;
      }

      const curCanvas = gameCanvasQueueRef.current[activeCanvasIdxRef.current];
      
      if (!curCanvas) {
        setScreen('REVIEW');
        setIsShuffling(false);
        return;
      }
      
      // If there's another question in this canvas
      if (activeQuestionIdxRef.current + 1 < curCanvas.questions.length) {
        const nextQIdx = activeQuestionIdxRef.current + 1;
        setActiveQuestionIdx(nextQIdx);
        if (currentMode === 'CANVAS') loadCanvasSlide(curCanvas, nextQIdx);
        else if (currentMode === 'NUMERICAL') loadNumericalSlide(null, curCanvas.id === 'arcade' ? null : curCanvas, nextQIdx);
        else if (currentMode === 'ODD_ONE_OUT') loadOddOneOutSlide(null, curCanvas.id === 'arcade' ? null : curCanvas, nextQIdx);
      } 
      // Else if there's another canvas in the queue
      else if (activeCanvasIdxRef.current + 1 < gameCanvasQueueRef.current.length) {
        const nextCIdx = activeCanvasIdxRef.current + 1;
        setActiveCanvasIdx(nextCIdx);
        setActiveQuestionIdx(0);
        if (currentMode === 'CANVAS') loadCanvasSlide(gameCanvasQueueRef.current[nextCIdx], 0);
        else if (currentMode === 'NUMERICAL') loadNumericalSlide(null, gameCanvasQueueRef.current[nextCIdx].id === 'arcade' ? null : gameCanvasQueueRef.current[nextCIdx], 0);
        else if (currentMode === 'ODD_ONE_OUT') loadOddOneOutSlide(null, gameCanvasQueueRef.current[nextCIdx].id === 'arcade' ? null : gameCanvasQueueRef.current[nextCIdx], 0);
      } 
      // Else game over
      else {
        setScreen('REVIEW');
      }
      setIsShuffling(false);
    }, 500);
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={`w-full min-h-screen ${(screen === 'ADMIN_HOME' || screen === 'CANVAS_COMPOSER') ? 'h-screen overflow-hidden' : ''}`}>
      {screen === 'GATE' && <GateScreen playerNickname={playerNickname} setPlayerNickname={setPlayerNickname} setScreen={setScreen} adminPassword={adminPassword} setAdminPassword={setAdminPassword} />}
      {screen === 'PLAYER_HOME' && <PlayerHome difficulty={difficulty} setDifficulty={setDifficulty} activeGameMode={activeGameMode} setActiveGameMode={setActiveGameMode} startGame={startGame} appSubjects={appSubjects} appChapters={appChapters} appSubChapters={appSubChapters} expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters} canvasConfigs={canvasConfigs} setScreen={setScreen} adminPassword={adminPassword} />}
      {screen === 'GAME' && <GameScreen activeTargetObjective={activeTargetObjective} activeGameMode={activeGameMode} boardTiles={boardTiles} showLevelUp={showLevelUp} marathonLevel={marathonLevel} marathonLives={marathonLives} activeCanvasIdx={activeCanvasIdx} gameCanvasQueue={gameCanvasQueue} score={score} difficulty={difficulty} timeRemaining={timeRemaining} parseNumericalData={parseNumericalData} handleTileTap={handleTileTap} getTileColor={getTileColor} advanceToNext={advanceToNext} setScreen={setScreen} setScore={setScore} isShuffling={isShuffling} activeQuestionIdx={activeQuestionIdx} activeCanvasConfig={activeCanvasConfig} />}
      {screen === 'GAME_OVER' && <GameOverScreen marathonLevel={marathonLevel} totalRoundsCompleted={totalRoundsCompleted} score={score} difficulty={difficulty} setScreen={setScreen} />}
      {screen === 'REVIEW' && <ReviewScreen gameCanvasQueue={gameCanvasQueue} sessionAuditLog={sessionAuditLog} criteriaTables={criteriaTables} score={score} difficulty={difficulty} isPreviewMode={isPreviewMode} setScreen={setScreen} setScore={setScore} setIsPreviewMode={setIsPreviewMode} activeGameMode={activeGameMode} parseNumericalData={parseNumericalData} activeChapterTables={activeChapterTables} />}
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
        startGame={startGame} setActiveGameMode={setActiveGameMode} setIsPreviewMode={setIsPreviewMode}
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
