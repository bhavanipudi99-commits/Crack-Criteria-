import React from 'react';

// ── Config Objects ────────────────────────────────────────────────────────────

const DIFF_TILES = [
  { key: 'easy',   label: 'Easy',   time: '60s', icon: '🟢', activeClass: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm',  labelCls: 'text-emerald-700' },
  { key: 'medium', label: 'Medium', time: '45s', icon: '🟡', activeClass: 'border-amber-400   bg-amber-50   ring-2 ring-amber-200   shadow-sm',  labelCls: 'text-amber-700'   },
  { key: 'hard',   label: 'Hard',   time: '30s', icon: '🔴', activeClass: 'border-rose-400    bg-rose-50    ring-2 ring-rose-200    shadow-sm',  labelCls: 'text-rose-700'    },
];

const MODE_TILES = [
  { key: 'CANVAS',         label: 'Jigsaw',   icon: '🧩', activeClass: 'border-indigo-400   bg-indigo-50   ring-2 ring-indigo-200   shadow-sm', labelCls: 'text-indigo-700'   },
  { key: 'NUMERICAL',      label: 'Numbers',  icon: '🔢', activeClass: 'border-amber-400    bg-amber-50    ring-2 ring-amber-200    shadow-sm', labelCls: 'text-amber-700'    },
  { key: 'ODD_ONE_OUT',    label: 'Odd One',  icon: '❌', activeClass: 'border-rose-400     bg-rose-50     ring-2 ring-rose-200     shadow-sm', labelCls: 'text-rose-700'     },
  { key: 'MIXED_MARATHON', label: 'Marathon', icon: '🏆', activeClass: 'border-fuchsia-400  bg-fuchsia-50  ring-2 ring-fuchsia-200  shadow-sm', labelCls: 'text-fuchsia-700'  },
];

const CANVAS_CARD_CFG = {
  CANVAS:      { icon: '🧩', label: 'Jigsaw',   badge: 'bg-indigo-50  text-indigo-600 border-indigo-200',  hoverBorder: 'hover:border-indigo-300' },
  NUMERICAL:   { icon: '🔢', label: 'Numbers',  badge: 'bg-amber-50   text-amber-700  border-amber-200',   hoverBorder: 'hover:border-amber-300'  },
  ODD_ONE_OUT: { icon: '❌', label: 'Odd One',  badge: 'bg-rose-50    text-rose-700   border-rose-200',    hoverBorder: 'hover:border-rose-300'   },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerHome(props) {
  try {
    const {
      difficulty, setDifficulty,
      activeGameMode, setActiveGameMode,
      startGame,
      appSubjects, appChapters, appSubChapters,
      expandedChapters, setExpandedChapters,
      canvasConfigs,
      setScreen, adminPassword
    } = props;

  const isPlayable = (c) => {
    if (!c || !c.questions || !Array.isArray(c.questions)) return false;
    if (!c.type || c.type === 'CANVAS')   return c.questions.some(q => (q.selectedTileIds || []).length > 0);
    if (c.type === 'NUMERICAL')           return c.questions.some(q => q.targetTileId);
    if (c.type === 'ODD_ONE_OUT')         return c.questions.some(q => q.distractorTileId || (q.correctTileIds || []).length >= 2);
    return false;
  };

  const renderCanvasCard = (canvas, chap) => {
    const cfg = CANVAS_CARD_CFG[canvas.type] || CANVAS_CARD_CFG['CANVAS'];
    return (
      <button
        key={canvas.id}
        onClick={() => {
          const mode = canvas.type || 'CANVAS';
          setActiveGameMode(mode);
          startGame(chap.name, canvas.id, null, false, false, mode);
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-slate-200 ${cfg.hoverBorder} hover:shadow-sm transition-all group`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base flex-shrink-0">{cfg.icon}</span>
          <div className="text-left min-w-0">
            <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 leading-tight truncate">{canvas.name}</p>
            <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
          </div>
        </div>
        <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-600 flex-shrink-0 ml-2 transition-colors">PLAY →</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 pb-4 flex-shrink-0">
        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Jigsaw v3.0</span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">MAMS Puzzle</h1>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pick a topic below and start playing</p>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Settings Panel ─────────────────────────────── */}
        <div className="mx-3 mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Difficulty Tiles */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFF_TILES.map(({ key, label, time, icon, activeClass, labelCls }) => {
                const active = difficulty === key;
                return (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`flex flex-col items-center py-3 px-2 rounded-2xl border transition-all ${
                      active ? activeClass : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl mb-1">{icon}</span>
                    <span className={`text-[11px] font-black uppercase ${active ? labelCls : 'text-slate-600'}`}>{label}</span>
                    <span className={`text-[9px] font-medium mt-0.5 ${active ? labelCls + ' opacity-70' : 'text-slate-400'}`}>{time}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Game Mode Tiles */}
          <div className="px-4 py-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Game Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {MODE_TILES.map(({ key, label, icon, activeClass, labelCls }) => {
                const active = activeGameMode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveGameMode(key)}
                    className={`flex flex-col items-center py-3 px-3 rounded-2xl border transition-all ${
                      active ? activeClass : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl mb-1">{icon}</span>
                    <span className={`text-[11px] font-black uppercase ${active ? labelCls : 'text-slate-600'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Curriculum Index label ────────────────────── */}
        <div className="px-4 mt-4 mb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Curriculum Index</p>
        </div>

        {/* Marathon quick-start banners */}
        {activeGameMode === 'MIXED_MARATHON' && (
          <div className="px-3 mb-2 space-y-2">
            <button
              onClick={() => startGame(null, null, null, true)}
              className="w-full text-left py-3 px-4 rounded-2xl text-sm font-black text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex justify-between items-center"
            >
              <span className="flex items-center gap-2"><span>🌎</span> Global Marathon</span>
              <span className="text-slate-400 text-xs">ALL →</span>
            </button>
            {appSubjects.map(subj => (
              <button
                key={`marathon-${subj}`}
                onClick={() => startGame(null, null, subj)}
                className="w-full text-left py-3 px-4 rounded-2xl text-sm font-black text-fuchsia-800 bg-fuchsia-50 border border-fuchsia-200 hover:border-fuchsia-300 hover:shadow-sm transition-all flex justify-between items-center"
              >
                <span className="flex items-center gap-2"><span>🏆</span> {subj} Marathon</span>
                <span className="text-fuchsia-400 text-xs">PLAY →</span>
              </button>
            ))}
          </div>
        )}

        {/* Subject → Chapter → Sub-chapter tree */}
        <div className="px-3 pb-6 space-y-3">
          {appSubjects.map(subj => {
            const subjChapters = appChapters.filter(c => c.subject === subj);
            if (subjChapters.length === 0) return null;
            const isSubExpanded = !!expandedChapters[`player_sub_${subj}`];

            return (
              <div key={subj} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Subject Header Tile */}
                <button
                  onClick={() => setExpandedChapters(p => ({ ...p, [`player_sub_${subj}`]: !isSubExpanded }))}
                  className="w-full px-4 py-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-lg flex-shrink-0">📚</div>
                    <div className="text-left">
                      <h1 className="text-sm font-black text-slate-800 leading-tight">{subj}</h1>
                      <p className="text-[9px] text-slate-400 font-medium">{subjChapters.length} chapter{subjChapters.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className={`text-slate-300 text-xs transition-transform duration-200 ${isSubExpanded ? 'rotate-90' : ''}`}>▶</span>
                </button>

                {isSubExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {subjChapters.map(chap => {
                      const chapSubChaps = appSubChapters.filter(sc => sc.chapterName === chap.name);
                      const isMarathon   = activeGameMode === 'MIXED_MARATHON';
                      const isChapExpanded = !!expandedChapters[`player_chap_${chap.id}`];

                      return (
                        <div key={chap.id}>
                          {/* Chapter Row */}
                          <button
                            onClick={() => setExpandedChapters(p => ({ ...p, [`player_chap_${chap.id}`]: !isChapExpanded }))}
                            className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">📖</span>
                              <h2 className="text-sm font-bold text-slate-700 text-left">{chap.name}</h2>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isMarathon ? (
                                <button
                                  onClick={e => { e.stopPropagation(); startGame(chap.name); }}
                                  className="text-[10px] font-black bg-fuchsia-100 text-fuchsia-700 px-3 py-1.5 rounded-full hover:bg-fuchsia-200 transition-colors"
                                >
                                  ▶ MARATHON
                                </button>
                              ) : (
                                <span className={`text-slate-300 text-[10px] transition-transform duration-200 ${isChapExpanded ? 'rotate-90' : ''}`}>▶</span>
                              )}
                            </div>
                          </button>

                          {/* Games & Sub-chapters */}
                          {!isMarathon && isChapExpanded && (() => {
                            const rootCanvases = canvasConfigs.filter(c => c.chapter === chap.name && !c.subChapterId && isPlayable(c));
                            const allRoot = [
                              ...rootCanvases.filter(c => !c.type || c.type === 'CANVAS'),
                              ...rootCanvases.filter(c => c.type === 'NUMERICAL'),
                              ...rootCanvases.filter(c => c.type === 'ODD_ONE_OUT'),
                            ];

                            const scWithGames = chapSubChaps.filter(sc =>
                              canvasConfigs.some(c => c.chapter === chap.name && c.subChapterId === sc.id && isPlayable(c))
                            );

                            const hasContent = allRoot.length > 0 || scWithGames.length > 0;

                            return (
                              <div className="px-3 pb-3 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-1.5">
                                {/* Root-level game cards */}
                                {allRoot.map(c => renderCanvasCard(c, chap))}

                                {/* Sub-chapters */}
                                {scWithGames.map(sc => {
                                  const scAll   = canvasConfigs.filter(c => c.chapter === chap.name && c.subChapterId === sc.id && isPlayable(c));
                                  const scItems = [
                                    ...scAll.filter(c => !c.type || c.type === 'CANVAS'),
                                    ...scAll.filter(c => c.type === 'NUMERICAL'),
                                    ...scAll.filter(c => c.type === 'ODD_ONE_OUT'),
                                  ];
                                  const isScExpanded = !!expandedChapters[`player_sc_${sc.id}`];

                                  return (
                                    <div key={sc.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                      <button
                                        onClick={() => setExpandedChapters(p => ({ ...p, [`player_sc_${sc.id}`]: !isScExpanded }))}
                                        className="w-full px-3 py-2.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-400 text-xs">📂</span>
                                          <span className="text-xs font-bold text-slate-600">{sc.name}</span>
                                          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{scItems.length}</span>
                                        </div>
                                        <span className={`text-slate-300 text-[10px] transition-transform duration-200 ${isScExpanded ? 'rotate-90' : ''}`}>▶</span>
                                      </button>
                                      {isScExpanded && (
                                        <div className="p-2 space-y-1.5 border-t border-slate-100 bg-slate-50/50">
                                          {scItems.map(c => renderCanvasCard(c, chap))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Empty state */}
                                {!hasContent && (
                                  <div className="py-5 text-center">
                                    <span className="text-2xl block mb-1">📭</span>
                                    <p className="text-[10px] font-bold text-slate-400">No playable games yet.</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-2 bg-white border-t border-slate-200 flex-shrink-0">
        <button
          onClick={() => adminPassword === 'admin123' ? (window.location.href = '/admin') : setScreen('GATE')}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          {adminPassword === 'admin123' ? 'Back to Admin Dashboard' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
  } catch (err) {
    return (
      <div className="p-8 bg-red-50 min-h-screen">
        <h1 className="text-xl font-bold text-red-600 mb-4">Rendering Error</h1>
        <pre className="text-xs bg-white p-4 border border-red-200 rounded text-red-800 overflow-auto whitespace-pre-wrap">
          {err.message}
          {'\n\n'}
          {err.stack}
        </pre>
      </div>
    );
  }
}
