import { useState, useEffect, useRef } from 'react';
import { INITIAL_CANVAS_CONFIGS, playSound } from './data/datasets.js';

// ─── Screens ─────────────────────────────────────────────────────────────────
// GATE | PLAYER_HOME | GAME | REVIEW
// ADMIN_HOME | CRITERIA_TABLE_BUILDER | CANVAS_COMPOSER

function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

export default function App() {
  const [appSubjects, setAppSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_appSubjects');
      return (saved && Array.isArray(JSON.parse(saved))) ? JSON.parse(saved) : ['Medicine'];
    } catch (e) { return ['Medicine']; }
  });
  const [appChapters, setAppChapters] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_appChapters');
      return (saved && Array.isArray(JSON.parse(saved))) ? JSON.parse(saved) : [{ id: 'ch_cardiology', name: 'Cardiology', subject: 'Medicine' }];
    } catch (e) { return [{ id: 'ch_cardiology', name: 'Cardiology', subject: 'Medicine' }]; }
  });

  const [criteriaTables, setCriteriaTables] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_criteriaTables');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(t => {
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
        let colCount = t.columnCount;
        if (!colCount && rows.length > 0) {
          colCount = Math.max(...rows.map(r => r.cells.length));
        }
        return { ...t, rows, columnCount: (colCount && colCount > 0) ? colCount : 2 };
      }).filter(Boolean);
    } catch (e) { return []; }
  });

  const [canvasConfigs, setCanvasConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_canvasConfigs');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(c => {
        if (!c) return null;
        // Fix old schema lacking questions
        const questions = Array.isArray(c.questions) && c.questions.length > 0 
          ? c.questions 
          : [{ id: uid('cq'), prompt: c.gamingQuestion || 'Identify Criteria', selectedTileIds: c.criteriaIds || [] }];
        return { ...c, questions };
      }).filter(Boolean);
    } catch (e) { return []; }
  });

  useEffect(() => { localStorage.setItem('mams_appSubjects', JSON.stringify(appSubjects)); }, [appSubjects]);
  useEffect(() => { localStorage.setItem('mams_appChapters', JSON.stringify(appChapters)); }, [appChapters]);
  useEffect(() => { localStorage.setItem('mams_criteriaTables', JSON.stringify(criteriaTables)); }, [criteriaTables]);
  useEffect(() => { localStorage.setItem('mams_canvasConfigs', JSON.stringify(canvasConfigs)); }, [canvasConfigs]);

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

  // ── Canvas Builder local (staging) state ─────────────────────────────────
  const [builderCriteria, setBuilderCriteria] = useState([]);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const pasteAreaRef = useRef(null);

  // ── Curriculum creation ────────────────────────────────────────────────────
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newChapterInput, setNewChapterInput] = useState('');
  const [newChapterSubject, setNewChapterSubject] = useState('Medicine');
  const [newTableName, setNewTableName] = useState('');
  const [newTableChapter, setNewTableChapter] = useState('Cardiology');
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasChapter, setNewCanvasChapter] = useState('Cardiology');

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
  const [isShuffling, setIsShuffling] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [totalTargetCount, setTotalTargetCount] = useState(0);
  const [sessionAuditLog, setSessionAuditLog] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const boardTilesRef = useRef(boardTiles);
  const activeTargetObjectiveRef = useRef(activeTargetObjective);
  useEffect(() => { boardTilesRef.current = boardTiles; }, [boardTiles]);
  useEffect(() => { activeTargetObjectiveRef.current = activeTargetObjective; }, [activeTargetObjective]);
  useEffect(() => { activeCanvasIdxRef.current = activeCanvasIdx; }, [activeCanvasIdx]);
  useEffect(() => { activeQuestionIdxRef.current = activeQuestionIdx; }, [activeQuestionIdx]);
  useEffect(() => { gameCanvasQueueRef.current = gameCanvasQueue; }, [gameCanvasQueue]);

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
    const match = label.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+(?: [a-zA-Z/%]+)*)?/);
    if (!match) return null;
    const number = match[1];
    const suffix = match[2] ? match[2].trim() : '';
    const redacted = label.replace(number, '___');
    return { number, suffix, redacted, original: label };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GAME SESSION
  // ════════════════════════════════════════════════════════════════════════════

  const startGame = (chapterName, previewCanvasId = null, subjectName = null, isGlobal = false) => {
    let chapterTables = [];
    if (activeGameMode === 'MIXED_MARATHON') {
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
    setSessionAuditLog([]);
    setIsPreviewMode(!!previewCanvasId);
    setActiveChapterTables(chapterTables);

    if (activeGameMode === 'MIXED_MARATHON') {
      setMarathonLives(10);
      setMarathonMistakes(0);
      setMarathonLevel(1);
      setRoundsCompletedInLevel({ canvas: 0, numerical: 0, oddOneOut: 0 });
      setGameCanvasQueue([{ id: 'arcade', questions: new Array(100).fill({}) }]);
      setActiveCanvasIdx(0);
      setActiveQuestionIdx(0);
      loadMarathonSlide(chapterTables);
    } else if (activeGameMode === 'CANVAS') {
      let canvases = canvasConfigs.filter(c => c.chapter === chapterName && c.questions.some(q => q.selectedTileIds.length > 0));
      if (previewCanvasId) canvases = canvases.filter(c => c.id === previewCanvasId);
      if (!canvases.length) {
        alert('No playable canvases with selected tiles here yet.');
        return;
      }
      setGameCanvasQueue(canvases);
      setActiveCanvasIdx(0);
      setActiveQuestionIdx(0);
      loadCanvasSlide(canvases[0], 0, chapterTables);
    } else if (activeGameMode === 'NUMERICAL') {
      let configs = canvasConfigs.filter(c => c.chapter === chapterName && c.type === 'NUMERICAL');
      if (previewCanvasId) configs = configs.filter(c => c.id === previewCanvasId);
      
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
    } else if (activeGameMode === 'ODD_ONE_OUT') {
      let configs = canvasConfigs.filter(c => c.chapter === chapterName && c.type === 'ODD_ONE_OUT');
      if (previewCanvasId) configs = configs.filter(c => c.id === previewCanvasId);
      
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

  const loadMarathonSlide = (chapterTablesParam) => {
    const chapterTables = chapterTablesParam || activeChapterTables;
    const modes = ['CANVAS', 'NUMERICAL', 'ODD_ONE_OUT'];
    const selectedMode = modes[Math.floor(Math.random() * modes)];
    
    // Set a temporary internal game mode tag for this specific slide so the UI renders correctly
    setActiveTargetObjective(p => ({ ...p, marathonSubMode: selectedMode }));

    if (selectedMode === 'NUMERICAL') {
      const allTiles = chapterTables.flatMap(t => (t.rows||[]).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]))));
      const numericalTiles = allTiles.filter(t => parseNumericalData(t.label));
      if (numericalTiles.length >= 4) {
        return loadNumericalSlide(chapterTables);
      }
    } else if (selectedMode === 'ODD_ONE_OUT') {
      const allCanvases = canvasConfigs.filter(c => chapterTables.some(t => t.chapter === c.chapter));
      const playableQuestions = allCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 3).map(q => ({ canvas: c, question: q })));
      if (playableQuestions.length > 0) {
        return loadOddOneOutSlide(chapterTables, playableQuestions);
      }
    }
    
    // Fallback to Canvas mode if numerical/odd-one-out criteria aren't met
    const allCanvases = canvasConfigs.filter(c => chapterTables.some(t => t.chapter === c.chapter));
    const playableQs = allCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length > 0).map(q => ({ canvas: c, question: q })));
    if (playableQs.length > 0) {
      const randomQ = playableQs[Math.floor(Math.random() * playableQs.length)];
      const mockCanvas = { ...randomQ.canvas, questions: [randomQ.question] };
      return loadCanvasSlide(mockCanvas, 0, chapterTables);
    } else {
      // If literally nothing is playable
      alert("Not enough content to play a marathon. Please build at least one Canvas slide.");
      setScreen('PLAYER_HOME');
    }
  };

  const loadCanvasSlide = (canvas, qIdx, chapterTablesParam) => {
    const question = canvas.questions[qIdx];
    const selectedIds = question.selectedTileIds || [];
    
    // Skip empty questions
    if (!selectedIds.length) {
      advanceToNext();
      return;
    }

    const chapterTables = chapterTablesParam || activeChapterTables;
    setActiveCanvasConfig(canvas);
    setActiveTargetObjective(p => ({ ...p, id: question.id, diagnosis: question.prompt || 'Identify Criteria', subheading: question.subheading }));

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

  const loadNumericalSlide = (chapterTablesParam, configCanvas = null, qIdx = 0) => {
    const chapterTables = chapterTablesParam || activeChapterTables;
    const allTiles = chapterTables.flatMap(t => (t.rows||[]).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => {
      const items = [{
        tileId: tile.id, label: tile.label, criterionId: r.id, criterionFullText: c.text,
        criterionCategory: t.name, tableId: t.id, tableName: t.name
      }];
      if (tile.subtiles) items.push(...tile.subtiles.map(s => ({
        ...items[0], tileId: s.id, label: s.label
      })));
      return items;
    }))));

    const numTiles = allTiles.filter(t => parseNumericalData(t.label));
    if (numTiles.length < 4) {
      if (activeGameMode === 'MIXED_MARATHON') return loadCanvasSlide(chapterTablesParam, null, 0);
      alert('Not enough numerical tiles in this dataset (Need at least 4).');
      setScreen('PLAYER_HOME');
      return false;
    }

    let targetTile;
    let distractors = [];
    let customQuestion = null;

    if (configCanvas && configCanvas.questions[qIdx]) {
      customQuestion = configCanvas.questions[qIdx];
      targetTile = allTiles.find(t => t.tileId === customQuestion.targetTileId);
      distractors = (customQuestion.decoyTileIds || []).map(id => allTiles.find(t => t.tileId === id)).filter(Boolean);
    }

    if (!targetTile) {
       targetTile = numTiles[Math.floor(Math.random() * numTiles.length)];
       const targetData = parseNumericalData(targetTile.label);
       
       // Try to find distractors with the EXACT same suffix
       let possibleDistractors = allTiles.filter(t => {
         if (t.tileId === targetTile.tileId) return false;
         const data = parseNumericalData(t.label);
         return data && data.suffix === targetData.suffix;
       });
       
       // If we don't have enough exact suffix matches, fall back to any numerical tile
       if (possibleDistractors.length < 3) {
         possibleDistractors = numTiles.filter(t => t.tileId !== targetTile.tileId);
       }
       
       distractors = possibleDistractors.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    const targetData = parseNumericalData(targetTile.label);
    const autoPrompt = `${targetTile.criterionCategory} ${targetTile.criterionFullText} ${targetData?.redacted || ''}`.trim();
    setActiveTargetObjective(p => ({ 
      ...p, 
      id: targetTile.tileId, 
      diagnosis: customQuestion?.prompt || autoPrompt, 
      subheading: customQuestion?.subheading || "Tap the matching numerical value" 
    }));
    
    const board = [targetTile, ...distractors].sort(() => Math.random() - 0.5);

    setSessionAuditLog(p => [
      ...p, 
      ...board.map(t => ({ tileId: t.tileId, solved: false, skipped: false, presentedOnly: true }))
    ]);

    setTotalTargetCount(p => p + 1);
    setBoardTiles(board.map(c => ({ criterion: c, solved: false, errorState: false })));
    setTimeRemaining(Math.max(5, getInitialTime() - (score.correct * 2))); // speeds up
    setScreen('GAME');
  };

  const loadOddOneOutSlide = (chapterTablesParam, configCanvas = null, qIdx = 0) => {
    const chapterTables = chapterTablesParam || activeChapterTables;
    const allChapterTiles = chapterTables.flatMap(t => (t.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]).map(t_obj => ({
      tileId: t_obj.id, label: t_obj.label, criterionId: r.id, criterionFullText: c.text,
      criterionCategory: t.name, tableId: t.id, tableName: t.name
    })))));

    let correctFitTiles = [];
    let distractorTile = null;
    let diagnosis = "Which one doesn't belong?";
    let subheading = "Identify the incorrect fit for this category";

    if (configCanvas && configCanvas.questions[qIdx]) {
      const customQuestion = configCanvas.questions[qIdx];
      correctFitTiles = (customQuestion.correctTileIds || []).map(id => allChapterTiles.find(t => t.tileId === id)).filter(Boolean).map(t => ({ ...t, isDistractor: false }));
      const dTile = allChapterTiles.find(t => t.tileId === customQuestion.distractorTileId);
      if (dTile) distractorTile = { ...dTile, isDistractor: true };
      diagnosis = customQuestion.prompt || diagnosis;
      subheading = customQuestion.subheading || subheading;
    }

    if (!distractorTile || correctFitTiles.length === 0) {
      const chapterCanvases = canvasConfigs.filter(c => c.chapter === chapterTables[0]?.chapter && (!c.type || c.type === 'CANVAS'));
      const playableQuestions = chapterCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 3).map(q => ({ canvas: c, question: q })));
      if (playableQuestions.length === 0) {
        if (activeGameMode === 'MIXED_MARATHON') return loadCanvasSlide(chapterTablesParam, null, 0);
        alert('No valid Canvas configs found with >=3 tiles to base Odd-One-Outs on.');
        setScreen('PLAYER_HOME');
        return false;
      }
      const selectedQ = playableQuestions[Math.floor(Math.random() * playableQuestions.length)].question;
      correctFitTiles = allChapterTiles
        .filter(t => selectedQ.selectedTileIds.includes(t.tileId))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(t => ({ ...t, isDistractor: false }));
      const otherTiles = allChapterTiles.filter(t => !selectedQ.selectedTileIds.includes(t.tileId));
      if (!otherTiles.length) { advanceToNext(); return; }
      distractorTile = { ...otherTiles[Math.floor(Math.random() * otherTiles.length)], isDistractor: true };
      diagnosis = selectedQ.prompt || diagnosis;
    }

    const board = [...correctFitTiles, distractorTile].sort(() => Math.random() - 0.5);
    setActiveTargetObjective(p => ({ ...p, id: distractorTile.tileId, diagnosis, subheading }));
    
    setSessionAuditLog(p => [
      ...p, 
      ...board.map(t => ({ tileId: t.tileId, solved: false, skipped: false, presentedOnly: true }))
    ]);
    
    setTotalTargetCount(p => p + 1);
    setBoardTiles(board.map(c => ({ criterion: c, solved: false, errorState: false })));
    setTimeRemaining(Math.max(5, getInitialTime() - (score.correct * 2))); // speeds up
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
      if (activeGameMode === 'MIXED_MARATHON') {
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
        if (activeGameMode === 'CANVAS') loadCanvasSlide(curCanvas, nextQIdx);
        else if (activeGameMode === 'NUMERICAL') loadNumericalSlide(null, curCanvas.id === 'arcade' ? null : curCanvas, nextQIdx);
        else if (activeGameMode === 'ODD_ONE_OUT') loadOddOneOutSlide(null, curCanvas.id === 'arcade' ? null : curCanvas, nextQIdx);
      } 
      // Else if there's another canvas in the queue
      else if (activeCanvasIdxRef.current + 1 < gameCanvasQueueRef.current.length) {
        const nextCIdx = activeCanvasIdxRef.current + 1;
        setActiveCanvasIdx(nextCIdx);
        setActiveQuestionIdx(0);
        if (activeGameMode === 'CANVAS') loadCanvasSlide(gameCanvasQueueRef.current[nextCIdx], 0);
        else if (activeGameMode === 'NUMERICAL') loadNumericalSlide(null, gameCanvasQueueRef.current[nextCIdx].id === 'arcade' ? null : gameCanvasQueueRef.current[nextCIdx], 0);
        else if (activeGameMode === 'ODD_ONE_OUT') loadOddOneOutSlide(null, gameCanvasQueueRef.current[nextCIdx].id === 'arcade' ? null : gameCanvasQueueRef.current[nextCIdx], 0);
      } 
      // Else game over
      else {
        setScreen('REVIEW');
      }
      setIsShuffling(false);
    }, 500);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CRITERIA TABLE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  const handlePaste = (e) => {
    e.preventDefault();
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const rows = [];

    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      if (trs.length) {
        trs.forEach((tr, i) => {
          const cells = Array.from(tr.querySelectorAll('td,th')).map(c => c.textContent?.trim() || '');
          if (!cells.length || cells.every(c => !c)) return;
          const critId = uid('crit');
          const rowCells = Array.from({ length: table.columnCount }).map((_, i) => ({
             text: cells[i] || '', category: '', tiles: [{ id: uid('tile'), label: (cells[i] || '').slice(0, 50) }]
          }));
          rows.push({ id: critId, cells: rowCells, isHeading: false });
        });
        if (rows.length && pasteAreaRef.current) {
          const preview = trs.map(tr => {
            const cs = Array.from(tr.querySelectorAll('td,th'));
            return `<tr>${cs.map(c => `<td style="border:1px solid #e2e8f0;padding:4px 8px;font-size:11px;">${c.textContent.trim()}</td>`).join('')}</tr>`;
          }).join('');
          pasteAreaRef.current.innerHTML = `<table style="border-collapse:collapse;width:100%;">${preview}</table>`;
        }
      }
    }

    if (!rows.length) {
      plain.split('\n').filter(l => l.trim()).forEach((line, i) => {
        const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : null;
        const cols = sep ? line.split(sep).map(c => c.trim()) : [line.trim()];
        const critId = uid('crit');
        const rowCells = Array.from({ length: table.columnCount }).map((_, i) => ({
             text: cols[i] || '', category: '', tiles: [{ id: uid('tile'), label: (cols[i] || '').slice(0, 50) }]
        }));
        rows.push({ id: critId, cells: rowCells, isHeading: false });
      });
      if (pasteAreaRef.current) pasteAreaRef.current.innerText = plain;
    }
    if (rows.length) setBuilderCriteria(p => [...p, ...rows]);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2) { setSelectionPopup(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const areaRect = pasteAreaRef.current?.getBoundingClientRect();
    if (!areaRect) return;
    setSelectionPopup({ x: rect.left - areaRect.left + rect.width / 2, y: rect.top - areaRect.top - 8, text });
  };

  const addFromSelection = () => {
    if (!selectionPopup) return;
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    const critId = uid('crit');
    const cells = Array.from({ length: table.columnCount }).map((_, i) => i === 0 
      ? { text: selectionPopup.text, category: '', tiles: [{ id: uid('tile'), label: selectionPopup.text.slice(0, 50) }] }
      : { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }
    );
    setBuilderCriteria(p => [...p, { id: critId, cells, isHeading: false }]);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  const toggleTileCount = (rowId, cellIndex, count) => {
    setBuilderCriteria(p => p.map(r => {
      if (r.id !== rowId) return r;
      const cells = [...r.cells];
      const c = cells[cellIndex];
      if (count === 1) cells[cellIndex] = { ...c, tiles: [c.tiles[0] || { id: uid('tile'), label: '' }] };
      else {
        const a = c.tiles[0] || { id: uid('tile'), label: '' };
        const b = c.tiles[1] || { id: uid('tile'), label: '' };
        cells[cellIndex] = { ...c, tiles: [a, b] };
      }
      return { ...r, cells };
    }));
  };

  const updateRow = (rowId, field, val) => setBuilderCriteria(p => p.map(r => r.id === rowId ? { ...r, [field]: val } : r));
  const updateCell = (rowId, cellIndex, field, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    cells[cellIndex] = { ...cells[cellIndex], [field]: val };
    return { ...r, cells };
  }));
  const updateTileLabel = (rowId, cellIndex, ti, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    tiles[ti] = { ...tiles[ti], label: val };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const addSubtile = (rowId, cellIndex, ti) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    tiles[ti] = { ...tiles[ti], subtiles: [...(tiles[ti].subtiles || []), { id: uid('subtile'), label: '' }] };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const updateSubtileLabel = (rowId, cellIndex, ti, si, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    const subtiles = [...(tiles[ti].subtiles || [])];
    subtiles[si] = { ...subtiles[si], label: val };
    tiles[ti] = { ...tiles[ti], subtiles };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const deleteSubtile = (rowId, cellIndex, ti, si) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    const subtiles = [...(tiles[ti].subtiles || [])];
    subtiles.splice(si, 1);
    tiles[ti] = { ...tiles[ti], subtiles };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const removeCrit = (critId) => setBuilderCriteria(p => p.filter(c => c.id !== critId));

  const addColumnToTable = () => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    if (table.columnCount >= 4) { alert('Max 4 columns'); return; }
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return {
        ...t,
        columnCount: t.columnCount + 1,
        columnHeaders: [...t.columnHeaders, `Column ${t.columnCount + 1}`],
        rows: t.rows.map(r => ({ ...r, cells: [...r.cells, { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }] }))
      };
    }));
    setBuilderCriteria(p => p.map(r => ({ ...r, cells: [...r.cells, { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }] })));
  };

  const deleteColumnFromTable = (colIndex) => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    if (table.columnCount <= 1) { alert('Min 1 column'); return; }
    if (!window.confirm('Delete this column and all its contents?')) return;
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return {
        ...t,
        columnCount: t.columnCount - 1,
        columnHeaders: t.columnHeaders.filter((_, i) => i !== colIndex),
        rows: t.rows.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== colIndex) }))
      };
    }));
    setBuilderCriteria(p => p.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== colIndex) })));
  };

  const addBlankCrit = () => { 
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    const id = uid('crit'); 
    const cells = Array.from({ length: table.columnCount }).map(() => ({
      text: '', category: '', tiles: [{ id: uid('tile'), label: '' }]
    }));
    setBuilderCriteria(p => [...p, { id, cells, isHeading: false }]); 
  };

  const saveToTable = () => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    // Valid rows: at least one cell must have text. If normal, all tiles must have labels.
    const valid = builderCriteria.filter(row => {
      const hasText = row.cells.some(c => c.text.trim());
      if (!hasText) return false;
      if (row.isHeading) return true;
      return row.cells.every(c => c.tiles.every(t => t.label.trim()));
    });
    
    if (!valid.length && builderCriteria.length > 0) { alert('Complete required fields first.'); return; }
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return { ...t, rows: valid };
    }));
    alert('Table saved successfully!');
  };

  const removeCriterionFromTable = (tableId, critId) => {
    const row = criteriaTables.find(t => t.id === tableId)?.rows.find(r => r.id === critId);
    const tileIds = row && !row.isHeading ? row.cells.flatMap(c => c.tiles.map(t => t.id)) : [];
    setCriteriaTables(p => p.map(t => t.id !== tableId ? t : { ...t, rows: t.rows.filter(r => r.id !== critId) }));
    if (tileIds.length) {
      setCanvasConfigs(p => p.map(c => ({
        ...c,
        questions: c.questions.map(q => ({ ...q, selectedTileIds: q.selectedTileIds.filter(id => !tileIds.includes(id)) }))
      })));
    }
  };

  const addCriteriaTable = () => {
    const name = newTableName.trim();
    if (!name) { alert('Enter a table name.'); return; }
    const newTable = {
      id: uid('ct'),
      name: newTableName,
      chapter: newTableChapter,
      columnCount: 2,
      columnHeaders: ['Column 1', 'Column 2'],
      rows: []
    };
    setCriteriaTables(p => [...p, newTable]);
    setNewTableName('');
    setSelectedTableId(newTable.id);
    setBuilderCriteria([]);
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
        questions: c.questions.map(q => ({ ...q, selectedTileIds: q.selectedTileIds.filter(id => !allTileIds.includes(id)) }))
      })));
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CANVAS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  const addCanvas = (type = 'CANVAS') => {
    const name = newCanvasName.trim();
    if (!name) { alert('Enter a name.'); return; }
    let defaultQ;
    if (type === 'CANVAS') defaultQ = { id: uid('cq'), prompt: 'Identify Criteria', selectedTileIds: [] };
    else if (type === 'NUMERICAL') defaultQ = { id: uid('cq'), targetTileId: null, decoyTileIds: [] };
    else if (type === 'ODD_ONE_OUT') defaultQ = { id: uid('cq'), correctTileIds: [], distractorTileId: null };

    const newCanvas = { id: uid('canvas'), name, chapter: newCanvasChapter, type, maxTiles: 16, questions: [defaultQ] };
    setCanvasConfigs(p => [...p, newCanvas]);
    setNewCanvasName('');
    setSelectedCanvasId(newCanvas.id);
    setActiveComposerQuestionId(defaultQ.id);
    setScreen('CANVAS_COMPOSER');
  };

  const deleteCanvas = (id) => {
    if (window.confirm('Delete this configuration?')) setCanvasConfigs(p => p.filter(c => c.id !== id));
  };

  const toggleTileInCanvas = (tileId, canvasId, questionId) => {
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        questions: c.questions.map(q => {
          if (q.id !== questionId) return q;
          
          if (!c.type || c.type === 'CANVAS') {
            const ids = q.selectedTileIds || [];
            const next = ids.includes(tileId) ? ids.filter(i => i !== tileId) : [...ids, tileId];
            return { ...q, selectedTileIds: next };
          } else if (c.type === 'NUMERICAL') {
            if (q.targetTileId === tileId) return { ...q, targetTileId: null };
            if (q.decoyTileIds?.includes(tileId)) return { ...q, decoyTileIds: q.decoyTileIds.filter(i => i !== tileId) };
            if (!q.targetTileId) {
               let label = '';
               let heading = '';
               let subheading = '';
               for (const t of criteriaTables) {
                 for (const r of t.rows || []) {
                   if (r.isHeading) continue;
                   for (const cell of r.cells || []) {
                     for (const tile of cell.tiles || []) {
                       if (tile.id === tileId) { label = tile.label; heading = t.name; subheading = cell.text; }
                       if (tile.subtiles) tile.subtiles.forEach(s => { if (s.id === tileId) { label = s.label; heading = t.name; subheading = cell.text; } });
                     }
                   }
                 }
               }
               const redacted = parseNumericalData(label)?.redacted || '';
               const autoPrompt = `${heading} ${subheading} ${redacted}`.trim();
               return { ...q, targetTileId: tileId, prompt: autoPrompt || q.prompt };
            }
            if ((q.decoyTileIds || []).length < 3) return { ...q, decoyTileIds: [...(q.decoyTileIds || []), tileId] };
          } else if (c.type === 'ODD_ONE_OUT') {
            if (q.correctTileIds?.includes(tileId)) return { ...q, correctTileIds: q.correctTileIds.filter(i => i !== tileId) };
            if (q.distractorTileId === tileId) return { ...q, distractorTileId: null };
            if ((q.correctTileIds || []).length < 3) return { ...q, correctTileIds: [...(q.correctTileIds || []), tileId] };
            return { ...q, distractorTileId: tileId };
          }
          return q;
        })
      };
    }));
  };

  const updateCanvasField = (canvasId, field, val) =>
    setCanvasConfigs(p => p.map(c => c.id === canvasId ? { ...c, [field]: val } : c));

  const addQuestionToCanvas = (canvasId) => {
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      let newQ = { id: uid('cq'), prompt: `Question ${c.questions.length + 1}` };
      if (!c.type || c.type === 'CANVAS') newQ.selectedTileIds = [];
      else if (c.type === 'NUMERICAL') { newQ.targetTileId = null; newQ.decoyTileIds = []; }
      else if (c.type === 'ODD_ONE_OUT') { newQ.correctTileIds = []; newQ.distractorTileId = null; }
      
      setActiveComposerQuestionId(newQ.id);
      return { ...c, questions: [...c.questions, newQ] };
    }));
  };

  const updateQuestionPrompt = (canvasId, qId, val) => {
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      return { ...c, questions: c.questions.map(q => q.id === qId ? { ...q, prompt: val } : q) };
    }));
  };

  const deleteQuestionFromCanvas = (canvasId, qId) => {
    if (!window.confirm('Delete this question?')) return;
    setCanvasConfigs(p => p.map(c => {
      if (c.id !== canvasId) return c;
      const newQs = c.questions.filter(q => q.id !== qId);
      if (!newQs.length) {
        let defaultQ = { id: uid('cq'), prompt: 'Identify Criteria' };
        if (!c.type || c.type === 'CANVAS') defaultQ.selectedTileIds = [];
        else if (c.type === 'NUMERICAL') { defaultQ.targetTileId = null; defaultQ.decoyTileIds = []; }
        else if (c.type === 'ODD_ONE_OUT') { defaultQ.correctTileIds = []; defaultQ.distractorTileId = null; }
        newQs.push(defaultQ);
      }
      setActiveComposerQuestionId(newQs[0].id);
      return { ...c, questions: newQs };
    }));
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CURRICULUM
  // ════════════════════════════════════════════════════════════════════════════

  const addSubject = () => {
    const n = newSubjectInput.trim();
    if (n && !appSubjects.includes(n)) { setAppSubjects(p => [...p, n]); setNewSubjectInput(''); }
    else alert('Subject empty or exists.');
  };
  const addChapter = () => {
    const n = newChapterInput.trim();
    const subj = newChapterSubject.trim() || 'General';
    if (n && !appChapters.some(c => c.name === n)) {
      setAppChapters(p => [...p, { id: uid('ch'), name: n, subject: subj }]);
      setAppSubjects(p => p.includes(subj) ? p : [...p, subj]);
      setNewChapterInput('');
    } else alert('Chapter empty or exists.');
  };
  const deleteChapter = (id, name) => {
    if (window.confirm(`Delete "${name}" and all its tables/canvases?`)) {
      setAppChapters(p => p.filter(c => c.id !== id));
      setCriteriaTables(p => p.filter(t => t.chapter !== name));
      setCanvasConfigs(p => p.filter(c => c.chapter !== name));
    }
  };

  const exportDatabase = () => {
    const data = { appSubjects, appChapters, criteriaTables, canvasConfigs };
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: GATEWAY & PLAYER HOME
  // ════════════════════════════════════════════════════════════════════════════

  const renderGateway = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4 shadow-lg">
            <span className="text-3xl">🧩</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">MAMS</h1>
          <p className="text-blue-300 text-sm mt-1">High-Precision Jigsaw Memory Arcade</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-4 shadow-2xl">
          <p className="text-[10px] font-black text-clinical-blue uppercase tracking-widest">Player Access</p>
          <input type="text" placeholder="Your nickname (min. 2 chars)" value={playerNickname}
            onChange={e => setPlayerNickname(e.target.value)} onKeyDown={e => e.key === 'Enter' && playerNickname.trim().length >= 2 && setScreen('PLAYER_HOME')}
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-clinical-blue mt-3 mb-3" />
          <button onClick={() => playerNickname.trim().length >= 2 ? setScreen('PLAYER_HOME') : alert('Min 2 characters')}
            className="w-full bg-clinical-blue hover:bg-blue-500 text-white font-extrabold py-3 rounded-xl text-sm uppercase tracking-wider transition-all">
            Start Playing →
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
          <p className="text-[10px] font-black text-clinical-gold uppercase tracking-widest">Admin Access</p>
          <input type="password" placeholder="Passcode" value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && adminPassword === 'admin123' && setScreen('ADMIN_HOME')}
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-clinical-gold mt-3 mb-3" />
          <button onClick={() => adminPassword === 'admin123' ? setScreen('ADMIN_HOME') : alert('Default: admin123')}
            className="w-full bg-clinical-gold/20 hover:bg-clinical-gold/30 border border-clinical-gold/40 text-clinical-gold font-extrabold py-3 rounded-xl text-sm uppercase tracking-wider transition-all">
            Admin Panel →
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlayerHome = () => (
    <div className="flex flex-col items-center justify-between h-full p-6 bg-slate-50">
      <div className="mt-4 text-center">
        <span className="text-[10px] font-black text-clinical-blue uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-full">Jigsaw v3.0</span>
        <h1 className="text-3xl font-black mt-3 tracking-tight text-slate-900">MAMS PUZZLE</h1>
      </div>
      <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm my-4 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {['easy', 'medium', 'hard'].map(lvl => (
              <button key={lvl} onClick={() => setDifficulty(lvl)}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${difficulty === lvl ? 'border-clinical-blue bg-blue-50 text-clinical-blue' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                {lvl} ({lvl === 'easy' ? '60s' : lvl === 'medium' ? '45s' : '30s'})
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400 font-bold mb-2">Game Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveGameMode('CANVAS')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'CANVAS' ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>🧩 Canvas</button>
            <button onClick={() => setActiveGameMode('NUMERICAL')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'NUMERICAL' ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>🔢 Numbers</button>
            <button onClick={() => setActiveGameMode('ODD_ONE_OUT')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'ODD_ONE_OUT' ? 'border-rose-400 bg-rose-50 text-rose-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>❌ Odd One</button>
            <button onClick={() => setActiveGameMode('MIXED_MARATHON')} className={`py-2 px-3 rounded-lg text-xs font-extrabold uppercase border transition-all ${activeGameMode === 'MIXED_MARATHON' ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>🏆 Marathon</button>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400 font-bold mb-2">Choose Chapter</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {activeGameMode === 'MIXED_MARATHON' && (
              <button onClick={() => startGame(null, null, null, true)}
                className="w-full text-left py-2.5 px-3 rounded-lg bg-indigo-50 border border-indigo-200 hover:border-indigo-400 text-xs font-black text-indigo-800 transition-colors flex justify-between items-center mb-2">
                <span>🌎 Run Global Marathon (All Subjects)</span>
                <span className="text-[10px] font-black">Start Marathon →</span>
              </button>
            )}
            {activeGameMode === 'MIXED_MARATHON' && appSubjects.map(subj => (
              <button key={`subj-${subj}`} onClick={() => startGame(null, null, subj)}
                className="w-full text-left py-2.5 px-3 rounded-lg bg-fuchsia-50 border border-fuchsia-200 hover:border-fuchsia-400 text-xs font-bold text-fuchsia-800 transition-colors flex justify-between items-center">
                <span>🏆 Run Full Subject: {subj}</span>
                <span className="text-[10px] font-black">Start Marathon →</span>
              </button>
            ))}
            {appChapters.map(chap => {
              const playableCanvases = canvasConfigs.filter(c => c.chapter === chap.name && c.questions.some(q => q.selectedTileIds.length > 0)).length;
              return (
                <button key={chap.id} onClick={() => startGame(chap.name)}
                  className="w-full text-left py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-clinical-blue text-xs font-bold text-slate-700 transition-colors flex justify-between items-center">
                  <span>{chap.subject} → {chap.name}</span>
                  <span className={`text-[10px] font-black ${activeGameMode === 'CANVAS' && playableCanvases ? 'text-clinical-blue' : activeGameMode === 'CANVAS' ? 'text-slate-400' : 'text-clinical-blue'}`}>
                    {activeGameMode === 'CANVAS' ? (playableCanvases ? `${playableCanvases} canvas${playableCanvases > 1 ? 'es' : ''} →` : 'Empty') : (activeGameMode === 'MIXED_MARATHON' ? 'Chapter Marathon →' : 'Play Arcade →')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <button onClick={() => setScreen('GATE')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider">
        Sign Out
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: GAME
  // ════════════════════════════════════════════════════════════════════════════

  const renderGame = () => {
    if (!activeTargetObjective) return null;
    const currentSubMode = activeGameMode === 'MIXED_MARATHON' ? activeTargetObjective.marathonSubMode : activeGameMode;
    const total = boardTiles.length;
    const cols = currentSubMode === 'CANVAS' ? 4 : (total <= 4 ? 2 : 3);
    const rows = [];
    for (let i = 0; i < total; i += cols) rows.push(boardTiles.slice(i, i + cols));
    const rowCount = rows.length;

    return (
      <div className="flex flex-col justify-between h-full bg-slate-50 relative">
        {showLevelUp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl border-4 border-fuchsia-400 animate-in zoom-in-50 duration-500 max-w-sm w-full mx-4">
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h2 className="text-3xl font-black text-fuchsia-600 mb-2 tracking-tight">LEVEL {marathonLevel}</h2>
              <p className="text-slate-500 font-bold mb-4">Speed Increased! +3 Lives Restored</p>
              <div className="flex justify-center gap-1 text-2xl">
                {'❤️'.repeat(Math.min(10, marathonLives))}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-white">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {activeGameMode === 'MIXED_MARATHON' ? `Marathon Level ${marathonLevel}` : (currentSubMode === 'CANVAS' ? `Canvas ${activeCanvasIdx + 1}/${gameCanvasQueue.length}` : (currentSubMode === 'NUMERICAL' ? 'Rapid Fire Mode' : 'Odd One Out Mode'))}
            </span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
              {currentSubMode === 'CANVAS' ? `Question ${activeQuestionIdx + 1}/${activeCanvasConfig?.questions.length}` : `Round ${score.correct + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeGameMode === 'MIXED_MARATHON' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600 shadow-sm animate-pulse">
                <span className="text-[9px] font-bold uppercase">Lives</span>
                <span className="text-xs font-black">{'❤️'.repeat(Math.max(0, marathonLives))}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
              <span className="text-[9px] font-bold uppercase">Points</span>
              <span className="text-xs font-black">{((score.correct * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1.0)) - (score.wrong * 0.33)).toFixed(1)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${timeRemaining <= 6 ? 'border-clinical-crimson bg-red-50 text-clinical-crimson timer-panic' : 'border-slate-200 bg-white text-clinical-gold'}`}>
              <span className="text-[9px] font-bold uppercase">Clock</span>
              <span className="text-xs font-black">{timeRemaining}s</span>
            </div>
          </div>
        </div>
        <div className="mx-3 mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-bold text-clinical-blue uppercase tracking-widest">{activeTargetObjective.subheading || 'Find:'}</span>
          <h2 className={`font-black tracking-tight mt-0.5 leading-tight ${currentSubMode === 'NUMERICAL' ? 'text-4xl text-amber-600' : 'text-lg text-slate-900'}`}>{activeTargetObjective.diagnosis}</h2>
          {currentSubMode === 'CANVAS' && <p className="text-[9px] text-slate-400 mt-1 text-left">Tap all matching tiles · ½ badges = jigsaw pair</p>}
        </div>

        <div className={`flex-1 overflow-hidden transform transition-all duration-500 flex flex-col justify-center ${isShuffling ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
          {currentSubMode === 'NUMERICAL' ? (
            <div className="flex flex-col items-center justify-center gap-4 w-full px-4 h-full">
              <div className="grid grid-cols-2 gap-4 w-full max-w-md my-auto">
                {boardTiles.map((tile, idx) => (
                  <div key={idx} onClick={() => handleTileTap(idx)} 
                    className={`aspect-[3/2] flex flex-col items-center justify-center rounded-3xl cursor-pointer active:scale-95 transition-all shadow-lg border-b-4 border-2 ${tile.solved ? 'bg-clinical-green border-emerald-600 text-white pointer-events-none' : tile.errorState ? 'bg-clinical-crimson border-rose-700 text-white animate-shake' : 'bg-white border-slate-300 hover:border-amber-400 hover:bg-amber-50 hover:-translate-y-1'}`}>
                    <span className="text-5xl font-black tracking-tighter">{parseNumericalData(tile.criterion.label)?.number || tile.criterion.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed my-auto">
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((tile, ci) => {
                      const idx = ri * cols + ci;
                      const isPair = tile.criterion.tileCount === 2 && currentSubMode === 'CANVAS';
                      const color = getTileColor(tile.criterion.criterionCategory);
                      return (
                        <td key={ci} onClick={() => handleTileTap(idx)}
                          className={`h-24 p-2 relative cursor-pointer active:scale-95 transition-all text-center align-middle border border-slate-300 shadow-sm rounded-lg m-1 ${tile.solved ? 'bg-clinical-green border-clinical-green text-white pointer-events-none' : tile.errorState ? 'bg-clinical-crimson border-clinical-crimson text-white animate-shake' : color}`}
                          style={{ display: 'table-cell', borderCollapse: 'separate', borderSpacing: '4px' }}>
                          {isPair && !tile.solved && !tile.errorState && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white/70 flex items-center justify-center text-[6px] font-black opacity-80">½</div>
                          )}
                          <p className={`font-black leading-tight tracking-tight ${currentSubMode !== 'CANVAS' ? 'text-sm' : 'text-[10px]'}`}>
                            {tile.criterion.label}
                          </p>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200">
          {currentSubMode === 'CANVAS' && (
            <button onClick={advanceToNext} className="w-full bg-clinical-blue hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mb-2">
              Skip Target →
            </button>
          )}
          <button onClick={() => { setScreen('PLAYER_HOME'); setScore({ correct: 0, wrong: 0 }); }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-colors">
            Exit Game
          </button>
        </div>
      </div>
    );
  };

  const renderGameOver = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6 text-center">
      <div className="text-6xl mb-4">💀</div>
      <h1 className="text-4xl font-black text-white tracking-tight mb-2">GAME OVER</h1>
      <p className="text-fuchsia-400 font-bold mb-8 uppercase tracking-widest">Marathon Run Ended</p>
      
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm mb-8 border border-white/20">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
          <span className="text-slate-400 font-bold text-sm">Level Reached</span>
          <span className="text-2xl font-black text-white">{marathonLevel}</span>
        </div>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
          <span className="text-slate-400 font-bold text-sm">Rounds Survived</span>
          <span className="text-2xl font-black text-white">{totalRoundsCompleted}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-bold text-sm">Final Score</span>
          <span className="text-2xl font-black text-clinical-gold">{((score.correct * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1.0)) - (score.wrong * 0.33)).toFixed(1)}</span>
        </div>
      </div>

      <button onClick={() => setScreen('REVIEW')} className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/50 mb-3">
        Review Session Criteria
      </button>
      <button onClick={() => setScreen('PLAYER_HOME')} className="w-full max-w-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-fuchsia-900/50">
        Return to Dashboard
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: REVIEW
  // ════════════════════════════════════════════════════════════════════════════

  const renderReview = () => {
    // Review evaluates all canvases played in the session against the active chapter tables.
    // For simplicity, we show criteria tables if ANY of their tiles were in ANY question in the game queue.
    const allSelectedIds = new Set();
    gameCanvasQueue.forEach(c => {
      if (!c.questions) return;
      c.questions.forEach(q => {
        if (q.selectedTileIds) q.selectedTileIds.forEach(id => allSelectedIds.add(id));
        if (q.targetTileId) allSelectedIds.add(q.targetTileId);
        if (q.decoyTileIds) q.decoyTileIds.forEach(id => allSelectedIds.add(id));
        if (q.correctTileIds) q.correctTileIds.forEach(id => allSelectedIds.add(id));
        if (q.distractorTileId) allSelectedIds.add(q.distractorTileId);
      });
    });
    sessionAuditLog.forEach(log => allSelectedIds.add(log.tileId));
    
    // We construct the Review Table. We show all criteria from tables that have at least one selected tile.
    const tablesToReview = criteriaTables.filter(table => 
      table.rows.some(row => !row.isHeading && row.cells.some(c => c.tiles.some(t => allSelectedIds.has(t.id))))
    );

    const criteriaInCanvas = tablesToReview.flatMap(table =>
      table.rows.map(row => {
        if (row.isHeading) {
          return { row, isHeading: true, tableName: table.name };
        }
        
        // Is this criterion actually part of the game?
        const isSelectedInGame = row.cells.some(c => c.tiles.flatMap(t => [t, ...(t.subtiles || [])]).some(t => allSelectedIds.has(t.id)));
        if (!isSelectedInGame) return null;

        const cellResults = row.cells.map(cell => {
           const tileResults = cell.tiles
             .flatMap(t => [t, ...(t.subtiles || [])])
             .filter(tile => allSelectedIds.has(tile.id))
             .map(tile => {
               const entries = sessionAuditLog.filter(e => e.tileId === tile.id);
               const isOnlyPresented = entries.length > 0 && entries.every(e => e.presentedOnly);
               return { 
                 tile, 
                 solved: entries.some(e => e.solved && !e.skipped), 
                 attempted: entries.some(e => !e.presentedOnly),
                 skipped: entries.some(e => e.skipped),
                 presentedOnly: isOnlyPresented
               };
             });
           const allSolved = tileResults.length > 0 && tileResults.every(r => r.solved || r.presentedOnly);
           return { ...cell, tileResults, allSolved };
        });
        
        const allActiveCells = cellResults.filter(c => c.tileResults.length > 0);
        const allSolved = allActiveCells.length > 0 && allActiveCells.every(c => c.allSolved);

        return { row, isHeading: false, cellResults, allSolved, tableName: table.name };
      }).filter(Boolean)
    );

    const solvedCount = criteriaInCanvas.filter(c => !c.isHeading && c.allSolved).length;
    const totalPlayable = criteriaInCanvas.filter(c => !c.isHeading).length;

    return (
      <div className="flex flex-col justify-between h-full p-4 bg-slate-50">
        <div className="overflow-y-auto flex-1 space-y-4 pb-2">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-extrabold text-clinical-green uppercase tracking-widest bg-emerald-100 px-2.5 py-0.5 rounded-full">Complete</span>
            <h2 className="text-2xl font-black text-slate-800 mt-1">Criteria Review</h2>
            <p className="text-[11px] text-slate-500">Includes tiles across all questions played.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criteria Solved</p>
            <p className="text-4xl font-black text-clinical-blue mt-1">{solvedCount}<span className="text-xl text-slate-400"> / {totalPlayable}</span></p>
            <div className="flex justify-center gap-4 mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-bold">
              <span>✓ {score.correct} correct taps</span>
              <span className="text-slate-300">|</span>
              <span>✗ {score.wrong} wrong taps</span>
              <span className="text-slate-300">|</span>
              <span className="text-indigo-600">Points: {((score.correct * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1.0)) - (score.wrong * 0.33)).toFixed(1)}</span>
            </div>
          </div>

          {tablesToReview.map(table => {
            const tableCriteria = criteriaInCanvas.filter(c => c.tableName === table.name);
            const nonHeading = tableCriteria.filter(c => !c.isHeading);
            const tableAllSolved = nonHeading.length > 0 && nonHeading.every(c => c.allSolved);
            
            return (
              <div key={table.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 border-b ${tableAllSolved ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] font-black text-clinical-blue uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">📋 {table.name}</p>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${tableAllSolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {nonHeading.filter(c => c.allSolved).length}/{nonHeading.length} complete
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" style={{ minWidth: 480 }}>
                    <thead>
                      <tr className={`border-b ${tableAllSolved ? 'bg-emerald-100/50 border-emerald-200' : 'bg-rose-100/50 border-rose-200'}`}>
                        <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200/50 w-6">#</th>
                        {table.columnHeaders?.map((h, i) => (
                           <th key={i} className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200/50">{h}</th>
                        ))}
                        <th className="p-2 text-[9px] font-black text-slate-500 uppercase w-16 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableCriteria.map((item, ci) => {
                        if (item.isHeading) {
                          return (
                            <tr key={item.row.id} className="border-b border-amber-200 bg-amber-100/50">
                              <td className="p-2 border-r border-amber-200/50 text-[10px] text-amber-700 font-black text-center">—</td>
                              {item.row.cells.map((cell, idx) => (
                                <td key={idx} className="px-4 py-2 text-[10px] font-black text-amber-800 uppercase tracking-widest border-r border-amber-200/50 shadow-inner">
                                  {cell.text}
                                </td>
                              ))}
                              <td className="p-2"></td>
                            </tr>
                          );
                        }

                        const { row, cellResults, allSolved } = item;
                        return (
                          <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-200/50 text-[10px] text-slate-500 font-bold text-center">{ci + 1}</td>
                            {cellResults.map((cell, cellIndex) => {
                               const hasTiles = cell.tileResults.length > 0;
                               const cellSolved = hasTiles && cell.allSolved;
                               const cellFailed = hasTiles && !cell.allSolved && cell.tileResults.some(tr => !tr.solved);
                               const cellBg = cellSolved ? 'bg-emerald-100/70 shadow-inner border-emerald-200' : cellFailed ? 'bg-rose-100/70 shadow-inner border-rose-200' : 'bg-transparent border-slate-200/50';
                               
                               return (
                                 <td key={cellIndex} className={`p-2 border-r transition-colors ${cellBg}`}>
                                    {!(cell.tiles && cell.tiles.length === 1 && cell.tiles[0].label.trim() === (cell.text || '').trim()) && (
                                      <p className="text-[11px] font-semibold text-slate-700 leading-tight mb-1">{cell.text}</p>
                                    )}
                                    {hasTiles && (
                                       <div className="flex flex-col gap-1.5 mt-2">
                                         {cell.tileResults.map((tr, ti) => (
                                           <div key={tr.tile.id} className="flex items-center gap-1.5">
                                             {tr.presentedOnly ? (
                                                <div className="flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black bg-slate-300 text-slate-600 shadow-sm">ℹ</div>
                                             ) : tr.skipped ? (
                                                <div className="flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black bg-amber-400 text-white shadow-sm">⚠</div>
                                             ) : (
                                                <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${tr.solved ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'}`}>
                                                  {tr.solved ? '✓' : '✗'}
                                                </div>
                                             )}
                                             <span className={`text-[10px] font-extrabold flex-1 leading-tight ${tr.presentedOnly ? 'text-slate-600' : tr.solved ? 'text-emerald-900' : tr.skipped ? 'text-amber-800' : 'text-rose-900'}`}>{tr.tile.label}</span>
                                           </div>
                                         ))}
                                       </div>
                                    )}
                                 </td>
                               );
                            })}
                            <td className="p-2 text-center">
                              <span className={`text-[9px] font-black ${allSolved ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {allSolved ? '✓ Found' : '✗ Missed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-200 mt-2">
          {isPreviewMode ? (
            <button onClick={() => { setScreen('CANVAS_COMPOSER'); setScore({ correct: 0, wrong: 0 }); setIsPreviewMode(false); }}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-extrabold py-3 rounded-lg shadow-md transition-all text-xs uppercase tracking-wider">
              Return to Composer
            </button>
          ) : (
            <button onClick={() => { setScreen('PLAYER_HOME'); setScore({ correct: 0, wrong: 0 }); }}
              className="w-full bg-clinical-blue hover:bg-blue-700 text-white font-extrabold py-3 rounded-lg shadow-md transition-all text-xs uppercase tracking-wider">
              Return to Portal
            </button>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: ADMIN HOME
  // ════════════════════════════════════════════════════════════════════════════

  const renderAdminHome = () => {
    const allSubjects = Array.from(new Set([...appSubjects, ...appChapters.map(c => c.subject)]));

    return (
      <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 flex justify-between items-center z-30 shadow-sm relative">
          <div>
            <p className="text-[9px] font-black text-clinical-gold uppercase tracking-widest">Admin Dashboard</p>
            <h2 className="text-lg font-black text-slate-900">Curriculum Architect</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportDatabase} className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors">Export DB</button>
            <label className="text-[10px] font-extrabold text-teal-600 bg-teal-50 border border-teal-100 hover:bg-teal-100 px-3 py-1.5 rounded-lg uppercase tracking-wide transition-colors cursor-pointer">
              Import DB
              <input type="file" accept=".json" onChange={importDatabase} className="hidden" />
            </label>
            <button onClick={() => { setAdminPassword(''); setSelectedCanvasId(null); setScreen('GATE'); }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wide ml-2">Sign Out</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Universal Index */}
          <div className={`flex flex-col bg-slate-100 border-r border-slate-200 overflow-y-auto transition-all duration-300 ${selectedCanvasId ? 'w-1/3 min-w-[320px] max-w-[400px]' : 'w-full'}`}>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Curriculum Index</p>
              </div>

              {/* Add Chapter globally */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <p className="text-[9px] font-black text-clinical-blue uppercase tracking-widest mb-2">Add Chapter</p>
                <div className="flex flex-col gap-2">
                  <input type="text" placeholder="Subject (e.g. Medicine)" value={newChapterSubject}
                    onChange={e => setNewChapterSubject(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-clinical-blue" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Chapter name" value={newChapterInput}
                      onChange={e => setNewChapterInput(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-clinical-blue" />
                    <button onClick={addChapter} className="bg-clinical-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors">Add</button>
                  </div>
                </div>
              </div>

              {/* Tree View */}
              {allSubjects.map(sub => {
                const subChapters = appChapters.filter(c => c.subject === sub);
                if (subChapters.length === 0) return null;
                const isSubExpanded = expandedChapters[`sub_${sub}`] !== false; // Default expanded

                return (
                  <div key={sub} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <button onClick={() => setExpandedChapters(p => ({ ...p, [`sub_${sub}`]: !isSubExpanded }))}
                      className="w-full px-4 py-3 bg-slate-50 flex justify-between items-center border-b border-slate-200 hover:bg-slate-100 transition-colors">
                      <p className="text-sm font-black text-slate-800">📚 {sub}</p>
                      <span className="text-slate-400 font-bold text-[10px]">{isSubExpanded ? '▼' : '►'}</span>
                    </button>

                    {isSubExpanded && (
                      <div className="p-3 space-y-3 bg-white">
                        {subChapters.map(chap => {
                          const chapExpanded = expandedChapters[`chap_${chap.id}`] !== false;
                          const tables = criteriaTables.filter(t => t.chapter === chap.name);
                          const pureCanvases = canvasConfigs.filter(c => c.chapter === chap.name && (!c.type || c.type === 'CANVAS'));
                          const numConfigs = canvasConfigs.filter(c => c.chapter === chap.name && c.type === 'NUMERICAL');
                          const oddConfigs = canvasConfigs.filter(c => c.chapter === chap.name && c.type === 'ODD_ONE_OUT');

                          return (
                            <div key={chap.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <button onClick={() => setExpandedChapters(p => ({ ...p, [`chap_${chap.id}`]: !chapExpanded }))}
                                className="w-full px-3 py-2.5 bg-slate-50/80 flex justify-between items-center border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                <div className="text-left flex-1">
                                  <p className="text-xs font-extrabold text-slate-700">📖 {chap.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={e => { e.stopPropagation(); deleteChapter(chap.id, chap.name); }}
                                    className="text-[9px] text-rose-400 hover:text-rose-600 font-bold uppercase px-2 py-1">Del</button>
                                  <span className="text-slate-400 font-bold text-[9px]">{chapExpanded ? '▼' : '►'}</span>
                                </div>
                              </button>

                              {chapExpanded && (
                                <div className="p-2 space-y-4 bg-white pl-3 border-l-2 border-indigo-50 ml-1.5 my-1">
                                  
                                  {/* TABLES */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center mb-2">
                                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">📋 Tables</p>
                                    </div>
                                    {tables.length === 0 && <p className="text-[10px] text-slate-400 italic">No tables yet</p>}
                                    {tables.map(table => {
                                      const isTableExpanded = !!expandedChapters[`table_${table.id}`];
                                      const nonHeading = table.rows.filter(r => !r.isHeading);
                                      return (
                                        <div key={table.id} className="border border-indigo-100 rounded-lg bg-white overflow-hidden shadow-sm">
                                          <div className="flex justify-between items-center px-2 py-1.5 bg-indigo-50/50 border-b border-indigo-50">
                                            <button onClick={() => setExpandedChapters(p => ({ ...p, [`table_${table.id}`]: !isTableExpanded }))} className="flex-1 text-left flex items-center gap-1.5">
                                              <span className="text-indigo-400 font-bold text-[8px] w-3">{isTableExpanded ? '▼' : '►'}</span>
                                              <p className="text-[11px] font-extrabold text-indigo-900 truncate leading-tight">{table.name}</p>
                                            </button>
                                            <div className="flex gap-1">
                                              <button onClick={() => { setSelectedTableId(table.id); setBuilderCriteria(JSON.parse(JSON.stringify(table.rows))); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setScreen('CRITERIA_TABLE_BUILDER'); }}
                                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase px-1.5 py-0.5 border border-indigo-200 rounded bg-white shadow-sm">Edit</button>
                                            </div>
                                          </div>
                                          
                                          {isTableExpanded && (
                                            <div className="p-1.5 bg-slate-50/50">
                                              <div className="overflow-x-auto rounded border border-indigo-100 shadow-sm">
                                                <table className="w-full text-left border-collapse bg-white table-fixed">
                                                  <tbody>
                                                    {table.rows.map(row => {
                                                      if (row.isHeading) {
                                                        const isSub = row.headingType === 'sub';
                                                        return (
                                                          <tr key={row.id} className={isSub ? 'bg-amber-50/50' : 'bg-amber-100/80'}>
                                                            {row.cells.map((cell, ci) => (
                                                              <td key={ci} className={`px-2 py-1.5 border border-indigo-50/50 text-center ${isSub ? 'text-[8px] font-bold text-amber-600' : 'text-[9px] font-black text-amber-800'} uppercase tracking-widest`}>
                                                                {cell.text}
                                                              </td>
                                                            ))}
                                                          </tr>
                                                        );
                                                      }
                                                      return (
                                                        <tr key={row.id} className="border-b border-indigo-50 last:border-0 hover:bg-slate-50/30">
                                                          {(row.cells||[]).map((c, ci) => (
                                                            <td key={ci} className="p-2 border border-indigo-50/50 align-top">
                                                              {!(c.tiles && c.tiles.length === 1 && c.tiles[0].label.trim() === (c.text || '').trim()) && (
                                                                <div className="font-extrabold text-indigo-900 border-b border-indigo-50/50 pb-1 mb-1.5 leading-tight text-[10px]">{c.text || 'Row'}</div>
                                                              )}
                                                              <div className="flex flex-col gap-1">
                                                                {(c.tiles||[]).map(t => {
                                                                  const isChecked = selectedCanvasId && activeComposerQuestionId && canvasConfigs.find(cv=>cv.id===selectedCanvasId)?.questions.find(q=>q.id===activeComposerQuestionId)?.selectedTileIds.includes(t.id);
                                                                  return (
                                                                    <div key={t.id} className="flex flex-col gap-0.5">
                                                                      <div className={`flex items-start gap-1.5 p-1 rounded transition-colors ${isChecked ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                                                                        {selectedCanvasId && activeComposerQuestionId && (
                                                                          <input type="checkbox" className="w-3 h-3 accent-teal-500 mt-0.5 flex-shrink-0 cursor-pointer"
                                                                            checked={isChecked || false}
                                                                            onChange={() => toggleTileInCanvas(t.id, selectedCanvasId, activeComposerQuestionId)} />
                                                                        )}
                                                                        <span className={`text-[9px] leading-tight ${isChecked ? 'font-black text-teal-800' : 'font-semibold text-slate-600'}`}>{t.label}</span>
                                                                      </div>
                                                                      {t.subtiles?.length > 0 && (
                                                                        <div className="flex flex-col gap-0.5 pl-3 border-l-2 border-slate-100 ml-1.5 mt-0.5">
                                                                          {t.subtiles.map(sub => {
                                                                            const subChecked = selectedCanvasId && activeComposerQuestionId && canvasConfigs.find(cv=>cv.id===selectedCanvasId)?.questions.find(q=>q.id===activeComposerQuestionId)?.selectedTileIds.includes(sub.id);
                                                                            return (
                                                                              <div key={sub.id} className={`flex items-start gap-1.5 p-1 rounded transition-colors ${subChecked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                                                                {selectedCanvasId && activeComposerQuestionId && (
                                                                                  <input type="checkbox" className="w-2.5 h-2.5 accent-indigo-500 mt-0.5 flex-shrink-0 cursor-pointer"
                                                                                    checked={subChecked || false}
                                                                                    onChange={() => toggleTileInCanvas(sub.id, selectedCanvasId, activeComposerQuestionId)} />
                                                                                )}
                                                                                <span className={`text-[8px] leading-tight ${subChecked ? 'font-black text-indigo-800' : 'font-semibold text-slate-500'}`}>↳ {sub.label}</span>
                                                                              </div>
                                                                            );
                                                                          })}
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>
                                                            </td>
                                                          ))}
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    <div className="flex gap-1.5 mt-2">
                                      <input type="text" placeholder="+ New table" value={newTableChapter === chap.name ? newTableName : ''}
                                        onChange={e => { setNewTableName(e.target.value); setNewTableChapter(chap.name); }}
                                        onClick={() => setNewTableChapter(chap.name)}
                                        className="flex-1 px-2 py-1.5 border border-dashed border-indigo-300 rounded-lg text-[10px] font-bold bg-indigo-50/30 focus:outline-none focus:border-indigo-500" />
                                      <button onClick={() => { setNewTableChapter(chap.name); addCriteriaTable(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+</button>
                                    </div>
                                  </div>

                                  {/* CANVASES */}
                                  <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
                                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">🎮 Canvases</p>
                                    {pureCanvases.length === 0 && <p className="text-[10px] text-slate-400 italic">No canvases yet</p>}
                                    {pureCanvases.map(canvas => (
                                      <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-teal-50 border-teal-300 shadow-sm ring-1 ring-teal-200' : 'bg-teal-50/20 border-teal-100 hover:border-teal-300'}`}>
                                        <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                                          <span className="text-teal-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                                          <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-teal-900' : 'text-teal-700'}`}>{canvas.name}</p>
                                        </button>
                                        <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
                                      </div>
                                    ))}
                                    <div className="flex gap-1.5 mt-2">
                                      <input type="text" placeholder="+ New config" value={newCanvasChapter === chap.name ? newCanvasName : ''}
                                        onChange={e => { setNewCanvasName(e.target.value); setNewCanvasChapter(chap.name); }}
                                        onClick={() => setNewCanvasChapter(chap.name)}
                                        className="flex-1 px-2 py-1.5 border border-dashed border-teal-300 rounded-lg text-[10px] font-bold bg-teal-50/30 focus:outline-none focus:border-teal-500" />
                                      <button onClick={() => { setNewCanvasChapter(chap.name); addCanvas('CANVAS'); }} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+</button>
                                    </div>
                                  </div>

                                  {/* NUMERICAL */}
                                  <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">🔢 Numerical</p>
                                    {numConfigs.length === 0 && <p className="text-[10px] text-slate-400 italic">No configs yet</p>}
                                    {numConfigs.map(canvas => (
                                      <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-200' : 'bg-amber-50/20 border-amber-100 hover:border-amber-300'}`}>
                                        <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                                          <span className="text-amber-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                                          <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-amber-900' : 'text-amber-700'}`}>{canvas.name}</p>
                                        </button>
                                        <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
                                      </div>
                                    ))}
                                    <div className="flex gap-1.5 mt-2">
                                      <button onClick={() => { setNewCanvasName('Numerical Deck'); setNewCanvasChapter(chap.name); addCanvas('NUMERICAL'); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+ Build Numerical Deck</button>
                                    </div>
                                  </div>

                                  {/* ODD ONE OUT */}
                                  <div className="space-y-1.5 pt-3 border-t border-slate-100 mt-2">
                                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">❌ Odd One</p>
                                    {oddConfigs.length === 0 && <p className="text-[10px] text-slate-400 italic">No configs yet</p>}
                                    {oddConfigs.map(canvas => (
                                      <div key={canvas.id} className={`flex justify-between items-center px-3 py-2 border rounded-lg transition-all ${selectedCanvasId === canvas.id ? 'bg-rose-50 border-rose-300 shadow-sm ring-1 ring-rose-200' : 'bg-rose-50/20 border-rose-100 hover:border-rose-300'}`}>
                                        <button onClick={() => { setSelectedCanvasId(canvas.id); setActiveComposerQuestionId(canvas.questions[0]?.id); }} className="flex-1 text-left flex items-center gap-2">
                                          <span className="text-rose-500 text-xs font-black">{selectedCanvasId === canvas.id ? '●' : '○'}</span>
                                          <p className={`text-[11px] font-black ${selectedCanvasId === canvas.id ? 'text-rose-900' : 'text-rose-700'}`}>{canvas.name}</p>
                                        </button>
                                        <button onClick={() => deleteCanvas(canvas.id)} className="text-[9px] font-bold text-rose-400 hover:text-rose-600 px-2 py-1">Del</button>
                                      </div>
                                    ))}
                                    <div className="flex gap-1.5 mt-2">
                                      <button onClick={() => { setNewCanvasName('Odd One Deck'); setNewCanvasChapter(chap.name); addCanvas('ODD_ONE_OUT'); }} className="w-full bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors">+ Build Odd One Deck</button>
                                    </div>
                                  </div>

                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Canvas Composer or Placeholder */}
          {selectedCanvasId ? (
            <div className="flex-1 bg-white overflow-hidden relative shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 z-10">
              {renderCanvasComposer()}
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
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: CRITERIA TABLE BUILDER
  // ════════════════════════════════════════════════════════════════════════════

  const renderCriteriaTableBuilder = () => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return null;
    const saved = table.rows;

    return (
      <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <div>
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Criteria Tile Table</p>
                <h2 className="text-base font-black text-slate-900">{table.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400">{saved.length} rows</span>
              <button onClick={() => { setBuilderCriteria([]); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setScreen('ADMIN_HOME'); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] px-3 py-2 rounded-lg uppercase">← Back</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">① Paste Workspace</p>
                <p className="text-[9px] text-slate-500">Paste browser table → rows become criteria.</p>
              </div>
              <button onClick={() => { if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setBuilderCriteria([]); }}
                className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase">Clear</button>
            </div>
            <div className="relative">
              <div ref={pasteAreaRef} contentEditable suppressContentEditableWarning onPaste={handlePaste} onMouseUp={handleMouseUp} onClick={() => setSelectionPopup(null)}
                className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 text-xs text-slate-700 leading-relaxed focus:outline-none" style={{ overflowWrap: 'break-word' }}>
                <p className="text-slate-400">Paste table from browser here (Ctrl+V / ⌘V)…</p>
              </div>
              {selectionPopup && (
                <div className="absolute z-30 -translate-x-1/2 -translate-y-full" style={{ left: selectionPopup.x, top: selectionPopup.y }}>
                  <button onMouseDown={e => { e.preventDefault(); addFromSelection(); }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap">📌 Create Criterion from Selection</button>
                  <div className="flex justify-center"><div className="w-2 h-2 bg-indigo-600 rotate-45 -mt-1" /></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest">② Tile Table Builder</p>
                <p className="text-[9px] text-slate-500">Each row = criterion · Or mark as Heading</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={addColumnToTable} className="bg-white border border-violet-200 hover:border-violet-400 text-violet-600 font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg transition-colors">+ Column</button>
                <button onClick={addBlankCrit} className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg">+ Row</button>
              </div>
            </div>

            {/* Column Headers Config */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex gap-4 overflow-x-auto">
              <div className="w-6 flex-shrink-0" />
              {table.columnHeaders?.map((header, i) => (
                <div key={i} className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Column {i + 1}</label>
                    <button onClick={() => deleteColumnFromTable(i)} className="text-[9px] font-bold text-slate-300 hover:text-rose-500 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-transparent hover:border-rose-200 transition-colors">✕</button>
                  </div>
                  <input type="text" value={header} onChange={e => setCriteriaTables(p => p.map(t => t.id === table.id ? { ...t, columnHeaders: t.columnHeaders.map((h, hi) => hi === i ? e.target.value : h) } : t))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:border-violet-400 focus:outline-none shadow-sm" />
                </div>
              ))}
              <div className="w-24 flex-shrink-0" />
            </div>

            {builderCriteria.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-[11px]">No staged criteria — paste above or click + Row</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {builderCriteria.map((row, ci) => (
                  <div key={row.id} className={`p-3 space-y-2 ${row.isHeading ? 'bg-amber-50/50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] text-slate-400 font-black w-6 text-center mt-2">{ci + 1}</span>
                      
                      <div className="flex-1 flex gap-4 overflow-x-auto">
                        {row.cells.map((cell, cellIndex) => (
                          <div key={cellIndex} className={`flex-1 min-w-[200px] border rounded-xl p-2 flex flex-col gap-2 ${row.isHeading ? (row.headingType === 'sub' ? 'border-amber-200 bg-amber-50/50' : 'border-amber-400 bg-amber-100/80 shadow-inner') : 'border-slate-100 bg-slate-50'}`}>
                            <input type="text" value={cell.text} placeholder={row.isHeading ? `${table.columnHeaders[cellIndex]} heading...` : `${table.columnHeaders[cellIndex]} text`}
                              onChange={e => updateCell(row.id, cellIndex, 'text', e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:border-violet-400 ${row.isHeading ? (row.headingType === 'sub' ? 'border-amber-300 bg-white font-bold text-[11px] text-amber-700 uppercase shadow-sm' : 'border-amber-500 bg-white font-black text-[12px] text-amber-900 uppercase shadow-md') : 'border-slate-200 bg-white font-medium text-[11px]'}`} />
                            
                            {!row.isHeading && (
                              <>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Tiles:</span>
                                  {[1, 2].map(n => (
                                    <button key={n} onClick={() => toggleTileCount(row.id, cellIndex, n)}
                                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${cell.tiles.length === n ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                                      {n === 2 ? '2 🧩' : '1'}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex flex-col gap-2">
                                  {cell.tiles.map((tile, ti) => (
                                    <div key={tile.id} className="flex flex-col p-1.5 border border-slate-200 rounded bg-slate-50/50 shadow-sm">
                                      <div className="flex items-center gap-1.5">
                                        {ti > 0 && <span className="text-slate-300 font-black">+</span>}
                                        <input type="text" value={tile.label} placeholder={cell.tiles.length === 2 ? (ti === 0 ? 'Tile A...' : 'Tile B...') : 'Tile Label...'}
                                          onChange={e => updateTileLabel(row.id, cellIndex, ti, e.target.value)}
                                          className="flex-1 px-2 py-1 border-2 border-violet-200 rounded-lg text-[10px] font-bold bg-white focus:outline-none focus:border-violet-500" />
                                      </div>
                                      {tile.subtiles?.map((sub, si) => (
                                        <div key={sub.id} className="flex items-center gap-1 mt-1.5 pl-4 border-l-2 border-violet-200 ml-2">
                                          <span className="text-[8px] text-slate-400 font-black">↳</span>
                                          <input type="text" value={sub.label} placeholder="Subtile label..."
                                            onChange={e => updateSubtileLabel(row.id, cellIndex, ti, si, e.target.value)}
                                            className="flex-1 px-1 py-0.5 border-b border-slate-200 text-[9px] font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-transparent" />
                                          <button onClick={() => deleteSubtile(row.id, cellIndex, ti, si)} className="text-[8px] text-rose-300 hover:text-rose-500 font-black px-1">✕</button>
                                        </div>
                                      ))}
                                      <button onClick={() => addSubtile(row.id, cellIndex, ti)} className="text-[8px] font-black text-clinical-blue hover:text-blue-700 text-left mt-1 pl-6 uppercase tracking-wider">
                                        + Subtile
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 ml-2 w-24 flex-shrink-0">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-1.5 rounded border border-amber-100 cursor-pointer hover:bg-amber-100">
                          <input type="checkbox" checked={row.isHeading || false} onChange={e => { updateRow(row.id, 'isHeading', e.target.checked); if (e.target.checked && !row.headingType) updateRow(row.id, 'headingType', 'main'); }} className="accent-amber-600" />
                          Heading
                        </label>
                        {row.isHeading && (
                          <select value={row.headingType || 'main'} onChange={e => updateRow(row.id, 'headingType', e.target.value)} className="text-[9px] font-bold text-amber-700 bg-white border border-amber-200 rounded px-1 py-1 focus:outline-none">
                            <option value="main">Main Heading</option>
                            <option value="sub">Sub Heading</option>
                          </select>
                        )}
                        <button onClick={() => removeCrit(row.id)} className="text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase border border-slate-200 rounded px-2 py-1 bg-white hover:border-rose-200 hover:bg-rose-50">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {builderCriteria.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">{builderCriteria.length} rows</span>
                <button onClick={saveToTable}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-2 px-5 rounded-xl text-[10px] uppercase tracking-wider shadow-lg shadow-violet-900/20">
                  Save to Table →
                </button>
              </div>
            )}
          </div>

          {/* Deleted saved display */}
        </div>
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          <button onClick={() => { setBuilderCriteria([]); if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setScreen('ADMIN_HOME'); }}
            className="w-full bg-clinical-blue hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">Done — Back to Dashboard</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: CANVAS COMPOSER
  // ════════════════════════════════════════════════════════════════════════════

  const autoGenerateArcadeConfig = (canvasId) => {
    const canvas = canvasConfigs.find(c => c.id === canvasId);
    if (!canvas) return;
    
    const tables = criteriaTables.filter(t => t.chapter === canvas.chapter);
    const allTiles = tables.flatMap(t => (t.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => [tile, ...(tile.subtiles||[])]).map(t_obj => ({
      tileId: t_obj.id, label: t_obj.label, criterionId: r.id, criterionFullText: c.text,
      criterionCategory: t.name, tableId: t.id, tableName: t.name
    })))));

    let generatedQuestions = [];

    if (canvas.type === 'NUMERICAL') {
       const numTiles = allTiles.filter(t => parseNumericalData(t.label));
       if (numTiles.length < 4) return alert('Not enough numerical tiles in this chapter (Need 4).');
       
       for (let i = 0; i < 5; i++) {
         const target = numTiles[Math.floor(Math.random() * numTiles.length)];
         const targetData = parseNumericalData(target.label);
         
         let possibleDistractors = allTiles.filter(t => {
           if (t.tileId === target.tileId) return false;
           const data = parseNumericalData(t.label);
           return data && data.suffix === targetData.suffix;
         });
         
         if (possibleDistractors.length < 3) {
           possibleDistractors = numTiles.filter(t => t.tileId !== target.tileId);
         }
         
         const distractors = possibleDistractors.sort(() => Math.random() - 0.5).slice(0, 3);
         const autoPrompt = `${target.criterionCategory} ${target.criterionFullText} ${targetData?.redacted || ''}`.trim();
         generatedQuestions.push({
           id: crypto.randomUUID(),
           prompt: autoPrompt,
           subheading: "Tap the matching numerical value",
           targetTileId: target.tileId,
           decoyTileIds: distractors.map(d => d.tileId)
         });
       }
    } else if (canvas.type === 'ODD_ONE_OUT') {
       const chapterCanvases = canvasConfigs.filter(c => c.chapter === canvas.chapter && (!c.type || c.type === 'CANVAS'));
       const playableQuestions = chapterCanvases.flatMap(c => c.questions.filter(q => q.selectedTileIds && q.selectedTileIds.length >= 3).map(q => ({ canvas: c, question: q })));
       if (playableQuestions.length === 0) return alert('No canvas configs with >=3 tiles found in this chapter to base Odd-One-Outs on.');
       
       for (let i = 0; i < 5; i++) {
         const selectedQ = playableQuestions[Math.floor(Math.random() * playableQuestions.length)].question;
         const corrects = allTiles.filter(t => selectedQ.selectedTileIds.includes(t.tileId)).sort(() => Math.random() - 0.5).slice(0, 3);
         const otherTiles = allTiles.filter(t => !selectedQ.selectedTileIds.includes(t.tileId));
         const distractor = otherTiles[Math.floor(Math.random() * otherTiles.length)];
         
         generatedQuestions.push({
           id: crypto.randomUUID(),
           prompt: selectedQ.prompt || "Which one doesn't belong?",
           subheading: "Identify the incorrect fit for this category",
           correctTileIds: corrects.map(c => c.tileId),
           distractorTileId: distractor?.tileId
         });
       }
    }

    if (generatedQuestions.length > 0) {
       setCanvasConfigs(p => p.map(c => c.id === canvasId ? { ...c, questions: generatedQuestions } : c));
       setActiveComposerQuestionId(generatedQuestions[0].id);
    }
  };

  const renderCanvasComposer = () => {
    const canvas = canvasConfigs.find(c => c.id === selectedCanvasId);
    if (!canvas) return null;
    const activeQ = canvas.questions.find(q => q.id === activeComposerQuestionId) || canvas.questions[0];
    if (!activeQ) return null;

    const type = canvas.type || 'CANVAS';
    let selectedIds = [];
    if (type === 'CANVAS') selectedIds = activeQ.selectedTileIds || [];
    else if (type === 'NUMERICAL') selectedIds = [activeQ.targetTileId, ...(activeQ.decoyTileIds || [])].filter(Boolean);
    else if (type === 'ODD_ONE_OUT') selectedIds = [...(activeQ.correctTileIds || []), activeQ.distractorTileId].filter(Boolean);

    const totalSelectedTiles = selectedIds.length;
    const max = type === 'CANVAS' ? (canvas.maxTiles || 16) : 4;

    // Get all flat tiles across ALL chapters so we can resolve selected IDs to labels
    const allFlatTiles = criteriaTables.flatMap(t => (t.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(tile => {
      const items = [{ tileId: tile.id, label: tile.label, tileCount: (c.tiles||[]).length }];
      if (tile.subtiles) { tile.subtiles.forEach(s => items.push({ tileId: s.id, label: s.label, tileCount: 1 })); }
      return items;
    }))));
    const selectedTileObjects = selectedIds.map(id => allFlatTiles.find(t => t.tileId === id)).filter(Boolean);

    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-teal-50 p-2 rounded-xl text-teal-600 border border-teal-100 shadow-sm">🎨</span>
              <div>
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Canvas Workspace</p>
                <h2 className="text-xl font-black text-slate-900 leading-tight">{canvas.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startGame(canvas.chapter, canvas.id)} className="bg-clinical-blue hover:bg-blue-700 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-lg uppercase shadow-sm transition-all">▶ Preview Run</button>
              <button onClick={() => setSelectedCanvasId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] px-4 py-2.5 rounded-lg uppercase transition-all">Close</button>
            </div>
          </div>

          {/* QUESTIONS TABS */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex gap-1.5 overflow-x-auto shadow-inner">
              {canvas.questions.map((q, idx) => (
                <div key={q.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer min-w-max transition-all ${activeComposerQuestionId === q.id ? 'bg-white border-teal-300 shadow-sm ring-1 ring-teal-100' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`} onClick={() => setActiveComposerQuestionId(q.id)}>
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${activeComposerQuestionId === q.id ? 'text-teal-600' : 'text-slate-500'}`}>Slide {idx + 1}</span>
                    <span className="text-[10px] font-bold text-slate-700">{q.selectedTileIds.length} targets</span>
                  </div>
                  {canvas.questions.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteQuestionFromCanvas(canvas.id, q.id); }} className="ml-1 px-1.5 rounded bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 font-bold transition-colors">×</button>
                  )}
                </div>
              ))}
              <button onClick={() => addQuestionToCanvas(canvas.id)} className="px-4 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 text-[10px] font-black uppercase whitespace-nowrap transition-all">
                + Slide
              </button>
            </div>
            
            <div className="flex-shrink-0">
               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Max Canvas Slots</label>
               <select value={max} onChange={e => updateCanvasField(canvas.id, 'maxTiles', parseInt(e.target.value))} className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-teal-400 shadow-sm cursor-pointer">
                 <option value="12">12 slots</option><option value="16">16 slots</option><option value="20">20 slots</option><option value="24">24 slots</option>
               </select>
             </div>
          </div>
        </div>

        {/* Fixed Active Question Config */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-10 shadow-sm relative space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest whitespace-nowrap w-24">Heading:</span>
            <input type="text" placeholder="e.g. Identify Jones Major Criteria" value={activeQ.prompt}
              onChange={e => updateQuestionPrompt(canvas.id, activeQ.id, e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest whitespace-nowrap w-24">Subheading:</span>
            <input type="text" placeholder="e.g. Select at least 2 major criteria" value={activeQ.subheading || ''}
              onChange={e => setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, subheading: e.target.value } : q) }))}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all shadow-inner" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel of Composer: Scrolling Tables in 2 Columns */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
            {criteriaTables.filter(t => t.chapter === canvas.chapter).length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="text-[11px] text-slate-400">No criteria tables yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {criteriaTables.filter(t => t.chapter === canvas.chapter).map(table => {
                  const tableSelectedCount = (table.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]))).filter(t => selectedIds.includes(t.id)).length;
                  const tableTotalTiles = (table.rows||[]).filter(r => !r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]))).length;

                  return (
                    <div key={table.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-100 flex justify-between items-center cursor-pointer hover:bg-indigo-100 transition-colors"
                           onClick={() => setExpandedNodes(p => ({ ...p, [`composer-table-${table.id}`]: !p[`composer-table-${table.id}`] }))}>
                        <div>
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                            {expandedNodes[`composer-table-${table.id}`] ? '▼' : '▶'} 📋 {table.name}
                          </p>
                          <p className="text-[9px] text-indigo-500 mt-0.5">{tableSelectedCount}/{tableTotalTiles} tiles selected</p>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => {
                            const allTileIds = (table.rows||[]).filter(r=>!r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)])));
                            setCanvasConfigs(p => p.map(c => {
                              if (c.id !== canvas.id) return c;
                              return { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, selectedTileIds: Array.from(new Set([...(q.selectedTileIds||[]), ...allTileIds])) } : q) };
                            }));
                          }} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase px-2 py-1 border border-indigo-200 rounded-lg bg-white shadow-sm">All</button>
                          <button onClick={() => {
                            const allTileIds = new Set((table.rows||[]).filter(r=>!r.isHeading).flatMap(r => (r.cells||[]).flatMap(c => (c.tiles||[]).flatMap(t => [t.id, ...(t.subtiles || []).map(s => s.id)]))));
                            setCanvasConfigs(p => p.map(c => c.id !== canvas.id ? c : { ...c, questions: c.questions.map(q => q.id === activeQ.id ? { ...q, selectedTileIds: (q.selectedTileIds||[]).filter(id => !allTileIds.has(id)) } : q) }));
                          }} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase px-2 py-1">None</button>
                        </div>
                      </div>

                      {expandedNodes[`composer-table-${table.id}`] && (
                        <div className="divide-y divide-slate-100 flex-1">
                          {table.rows.map(row => {
                            if (row.isHeading) {
                              const isSub = row.headingType === 'sub';
                              return (
                                <div key={row.id} className={`p-3 grid gap-3 border-y ${isSub ? 'bg-amber-50/50 border-amber-100/50' : 'bg-amber-100/80 border-amber-200'}`} style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                  {row.cells.map((cell, ci) => (
                                    <div key={ci} className="text-center p-2 flex items-center justify-center">
                                      <p className={`${isSub ? 'text-[9px] font-bold text-amber-600' : 'text-[11px] font-black text-amber-800'} uppercase tracking-widest`}>{cell.text}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <div key={row.id} className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${table.columnCount || 1}, minmax(0, 1fr))` }}>
                                {(row.cells||[]).map((cell, ci) => {
                                  const allCellTileItems = (cell.tiles||[]).flatMap(t => [t, ...(t.subtiles || [])]);
                                  const critSelected = allCellTileItems.length > 0 && allCellTileItems.every(t => selectedIds.includes(t.id));
                                  const critPartial = allCellTileItems.length > 0 && allCellTileItems.some(t => selectedIds.includes(t.id)) && !critSelected;
                                  return (
                                    <div key={ci} className={`flex flex-col border rounded-lg p-2 transition-colors h-full ${critSelected ? 'bg-teal-50/50 border-teal-100' : 'bg-white border-slate-100'}`}>
                                      <div className="flex items-start justify-between mb-2 border-b border-slate-100 pb-1">
                                        <p className="text-[11px] font-black text-slate-800 leading-tight">{cell.text}</p>
                                        {critPartial && <span className="text-[8px] text-amber-500 font-bold ml-2">partial</span>}
                                      </div>
                                      {(cell.tiles||[]).length > 0 && (
                                        <div className="flex flex-col gap-2 mt-auto">
                                          {(cell.tiles||[]).map((tile, ti) => {
                                            const isSelected = selectedIds.includes(tile.id);
                                            return (
                                              <div key={tile.id} className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                                                <button onClick={() => toggleTileInCanvas(tile.id, canvas.id, activeQ.id)}
                                                  className={`w-full px-2 py-1.5 rounded-xl border-2 text-[10px] font-extrabold transition-all flex items-start gap-1.5 ${
                                                    isSelected ? (cell.tiles||[]).length === 2 ? (ti === 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-purple-600 border-purple-700 text-white') : 'bg-teal-600 border-teal-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'
                                                  }`}>
                                                  {isSelected && <span className="mt-0.5">✓</span>}
                                                  <span className="text-left leading-tight break-words whitespace-normal font-bold">{tile.label}</span>
                                                </button>
                                                {tile.subtiles?.length > 0 && (
                                                  <div className="flex flex-col gap-1 pl-4 border-l-2 border-slate-200 ml-2">
                                                    {tile.subtiles.map(sub => {
                                                      const subSelected = selectedIds.includes(sub.id);
                                                      return (
                                                        <button key={sub.id} onClick={() => toggleTileInCanvas(sub.id, canvas.id, activeQ.id)}
                                                          className={`w-full px-2 py-1 rounded-lg border text-[9px] font-extrabold transition-all flex items-start gap-1.5 ${
                                                            subSelected ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-700'
                                                          }`}>
                                                          {subSelected && <span className="mt-0.5">✓</span>}
                                                          <span className="text-left leading-tight break-words whitespace-normal font-bold">↳ {sub.label}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel of Composer: Fixed Selected Tiles Box */}
          <div className="w-64 lg:w-72 border-l border-slate-200 bg-slate-50 p-4 flex flex-col flex-shrink-0 shadow-inner z-10">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full ring-4 ring-slate-950/20">
              <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center flex-shrink-0 bg-slate-950/50">
                <div>
                  <p className="text-[10px] font-black text-clinical-blue uppercase tracking-widest">
                    {type === 'CANVAS' ? 'Selected Targets' : type === 'NUMERICAL' ? 'Target & Decoys' : 'Odd One Out Config'}
                  </p>
                </div>
                {type === 'CANVAS' && (
                  <div className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-inner">
                     <span className="text-[10px] font-black text-slate-300"><span className={totalSelectedTiles > max ? 'text-rose-400' : 'text-white'}>{totalSelectedTiles}</span> / {max}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 gap-3 content-start bg-slate-900">
                {type === 'CANVAS' && Array.from({ length: Math.max(max, totalSelectedTiles) }).map((_, i) => {
                  const tile = selectedTileObjects[i];
                  return (
                    <div key={i} onClick={() => tile && toggleTileInCanvas(tile.tileId, canvas.id, activeQ.id)}
                      className={`min-h-[4rem] p-2 rounded-xl border-2 flex flex-col items-start justify-between cursor-pointer transition-all ${tile ? 'bg-blue-600 border-blue-500 text-white shadow-md hover:bg-rose-600 hover:border-rose-500 hover:scale-[1.02]' : 'bg-slate-800/50 border-slate-700 border-dashed text-slate-500 hover:bg-slate-800 hover:border-slate-600'}`}>
                      {tile ? (
                        <>
                          <p className="text-[9px] font-bold leading-snug">{tile.label}</p>
                          {tile.tileCount === 2 && <span className="text-[8px] text-blue-200 bg-blue-800/50 px-1 py-0.5 rounded font-black uppercase mt-2">½ pair</span>}
                        </>
                      ) : <div className="w-full h-full flex items-center justify-center"><span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-center">Empty</span></div>}
                    </div>
                  );
                })}
                
                {type === 'NUMERICAL' && (
                  <>
                    <div className="col-span-2 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">📝 Question Prompt</p>
                      <input type="text" value={activeQ.prompt || ''} onChange={e => updateQuestionPrompt(canvas.id, activeQ.id, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-clinical-blue" placeholder="e.g. Systolic BP < ___ mm Hg" />
                    </div>
                    <div className="col-span-2 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🎯 Target</p>
                      {activeQ.targetTileId ? (() => { const t = allFlatTiles.find(x=>x.tileId === activeQ.targetTileId); return (
                        <div onClick={() => toggleTileInCanvas(t?.tileId, canvas.id, activeQ.id)} className="min-h-[4rem] p-2 rounded-xl border-2 bg-amber-600 border-amber-500 text-white shadow-md hover:bg-rose-600 cursor-pointer">
                          <p className="text-xl font-black leading-snug text-center mt-1">{parseNumericalData(t?.label)?.number || t?.label}</p>
                        </div>
                      ); })() : <div className="min-h-[4rem] p-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">Select 1 target</div>}
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">👻 Decoys (Max 3)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 3 }).map((_, i) => {
                          const id = (activeQ.decoyTileIds || [])[i];
                          const t = id ? allFlatTiles.find(x=>x.tileId === id) : null;
                          return (
                            <div key={i} onClick={() => t && toggleTileInCanvas(t.tileId, canvas.id, activeQ.id)} className={`min-h-[4rem] p-2 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center ${t ? 'bg-slate-700 border-slate-600 text-white hover:bg-rose-600' : 'border-dashed border-slate-700 bg-slate-800/50 flex justify-center items-center'}`}>
                               {t ? <p className="text-xl font-black leading-snug text-center">{parseNumericalData(t.label)?.number || t.label}</p> : <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Decoy {i+1}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {type === 'ODD_ONE_OUT' && (
                  <>
                    <div className="col-span-2 mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">✅ Correct Fits (Max 3)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 3 }).map((_, i) => {
                          const id = (activeQ.correctTileIds || [])[i];
                          const t = id ? allFlatTiles.find(x=>x.tileId === id) : null;
                          return (
                            <div key={i} onClick={() => t && toggleTileInCanvas(t.tileId, canvas.id, activeQ.id)} className={`min-h-[4rem] p-2 rounded-xl border-2 cursor-pointer transition-all ${t ? 'bg-teal-600 border-teal-500 text-white hover:bg-rose-600' : 'border-dashed border-slate-700 bg-slate-800/50 flex justify-center items-center'}`}>
                               {t ? <p className="text-[9px] font-bold leading-snug">{t.label}</p> : <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Correct {i+1}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">❌ Odd One Out</p>
                      {activeQ.distractorTileId ? (() => { const t = allFlatTiles.find(x=>x.tileId === activeQ.distractorTileId); return (
                        <div onClick={() => toggleTileInCanvas(t?.tileId, canvas.id, activeQ.id)} className="min-h-[4rem] p-2 rounded-xl border-2 bg-rose-600 border-rose-500 text-white shadow-md hover:bg-rose-800 cursor-pointer">
                          <p className="text-[9px] font-bold leading-snug">{t?.label}</p>
                        </div>
                      ); })() : <div className="min-h-[4rem] p-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">Select 1 odd one</div>}
                    </div>
                  </>
                )}
              </div>
              {type === 'CANVAS' && totalSelectedTiles > max && (
                <div className="p-3 border-t border-rose-900/50 bg-rose-950/80 flex-shrink-0 shadow-inner">
                  <p className="text-center text-[9px] font-black text-rose-400 leading-tight">⚠ WARNING: Too many targets for board slots!</p>
                </div>
              )}
              {type !== 'CANVAS' && (
                <div className="p-3 border-t border-slate-800 bg-slate-900 flex-shrink-0 shadow-inner mt-auto">
                  <button onClick={() => autoGenerateArcadeConfig(canvas.id)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] py-2 rounded-xl uppercase tracking-wider transition-colors shadow-lg">
                    ✨ Auto-Generate Deck
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen">
      {screen === 'GATE' && renderGateway()}
      {screen === 'PLAYER_HOME' && renderPlayerHome()}
      {screen === 'GAME' && renderGame()}
      {screen === 'GAME_OVER' && renderGameOver()}
      {screen === 'REVIEW' && renderReview()}
      {(screen === 'ADMIN_HOME' || screen === 'CANVAS_COMPOSER') && renderAdminHome()}
      {screen === 'CRITERIA_TABLE_BUILDER' && renderCriteriaTableBuilder()}
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
