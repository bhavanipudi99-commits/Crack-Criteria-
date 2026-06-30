import React from 'react';

export default function GameScreen(props) {
  const {
    activeTargetObjective, activeGameMode, boardTiles, showLevelUp,
    marathonLevel, marathonLives, activeCanvasIdx, gameCanvasQueue,
    score, difficulty, timeRemaining, parseNumericalData, handleTileTap,
    getTileColor, advanceToNext, setScreen, setScore, isShuffling,
    activeQuestionIdx, activeCanvasConfig
  } = props;

  if (!activeTargetObjective) return null;
  const currentSubMode = activeGameMode === 'MIXED_MARATHON' ? activeTargetObjective.marathonSubMode : activeGameMode;
  const isMarathon = activeGameMode === 'MARATHON' || activeGameMode === 'MIXED_MARATHON';
  const total = boardTiles.length;
  const cols = 4;
  const rows = [];
  for (let i = 0; i < total; i += cols) rows.push(boardTiles.slice(i, i + cols));

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
            {currentSubMode === 'CANVAS' ? `Question ${props.activeQuestionIdx + 1}/${props.activeCanvasConfig?.questions.length}` : `Round ${score.correct + 1}`}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white/40">
        <div className="flex items-center gap-3">
          <button onClick={() => { setScreen('PLAYER_HOME'); setScore({ correct: 0, wrong: 0 }); }} className="text-xl hover:scale-110 transition-transform active:scale-95 drop-shadow-sm">🏠</button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-800 tracking-tight leading-tight">{activeCanvasConfig?.name || "Global Marathon"}</h1>
            {activeGameMode === 'MARATHON' && (
              <p className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-widest">{marathonLevel ? `Level ${marathonLevel}` : 'Marathon Mode'}</p>
            )}
            {activeGameMode === 'MIXED_MARATHON' && (
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Global Marathon</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMarathon && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lives</span>
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-[10px] ${i < marathonLives ? 'text-rose-500' : 'text-slate-200'}`}>❤️</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 shadow-sm text-clinical-blue">
            <span className="text-[10px] font-bold uppercase tracking-wider">Score</span>
            <span className="text-sm font-black">{((score.correct * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1.0)) - (score.wrong * 0.33)).toFixed(1)}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${timeRemaining <= 6 ? 'border-rose-400 bg-rose-50 text-rose-600 timer-panic' : 'border-slate-200 bg-white/80 text-amber-500'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">Clock</span>
            <span className="text-sm font-black">{timeRemaining}s</span>
          </div>
        </div>
      </div>
      <div className="mx-2 mt-2 bg-gradient-to-br from-white to-slate-50/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 opacity-80"></div>
        <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-[0.2em]">{activeTargetObjective.subheading || 'Find:'}</span>
        {currentSubMode === 'NUMERICAL' ? (
          <div className="mt-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select the correct value for</p>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight drop-shadow-sm">{activeTargetObjective.diagnosis}</h2>
          </div>
        ) : (
          <h2 className={`font-black tracking-tight mt-1.5 leading-tight text-xl sm:text-2xl text-slate-900 drop-shadow-sm`}>{activeTargetObjective.diagnosis}</h2>
        )}
        {currentSubMode === 'CANVAS' && <p className="text-[10px] font-bold text-slate-400 mt-2 text-left flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-600">½</span> match jigsaw pairs</p>}
      </div>

      <div className={`flex-1 overflow-hidden transform transition-all duration-500 flex flex-col justify-center ${isShuffling ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
        {currentSubMode === 'CANVAS' ? (
          <div className="flex flex-col items-center justify-start w-full h-full px-4 py-4 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-4">
              {boardTiles.map((tile, idx) => {
                const isPair = tile.criterion.tileCount === 2;
                return (
                  <button key={idx} onClick={() => handleTileTap(idx)}
                    className={`relative flex items-center justify-center min-h-[4.5rem] p-4 text-center border-2 rounded-[18px] active:translate-y-[6px] active:shadow-none transition-all shadow-[0_6px_0_0_#bfdbfe] hover:shadow-[0_6px_0_0_#93c5fd] border-t-4 ${
                      tile.solved ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_6px_0_0_#059669] text-white pointer-events-none translate-y-[2px]' :
                      tile.errorState ? 'bg-gradient-to-br from-rose-400 to-rose-500 border-rose-600 shadow-[0_6px_0_0_#e11d48] text-white animate-shake translate-y-[2px]' :
                      'bg-white hover:bg-slate-50 border-blue-200 border-t-blue-400 text-slate-800'
                    }`}
                  >
                    {isPair && !tile.solved && !tile.errorState && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center text-[9px] font-black text-slate-700 shadow-sm backdrop-blur-sm z-10">½</div>
                    )}
                    <p className="font-black leading-snug tracking-tight text-sm sm:text-base drop-shadow-sm w-full break-words">
                      {tile.criterion.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full px-4 py-6 overflow-y-auto">
            <div className={`w-full ${currentSubMode === 'NUMERICAL' ? 'max-w-lg' : 'max-w-2xl'} mx-auto my-auto ${currentSubMode === 'NUMERICAL' ? 'flex flex-wrap justify-center gap-4 sm:gap-6' : boardTiles.length >= 5 ? 'grid grid-cols-2 gap-3 sm:gap-4' : 'flex flex-col gap-3 sm:gap-4'}`}>
              {boardTiles.map((tile, idx) => {
                const isNum = currentSubMode === 'NUMERICAL';
                const isDense = !isNum && boardTiles.length >= 5;
                const numData = isNum ? parseNumericalData(tile.criterion.label) : null;
                const displayText = isNum ? (numData?.number || tile.criterion.label) : tile.criterion.label;
                const suffixText = !isNum ? null : null; // Units are now strictly in the question stem for numericals

                const idleStyleNum = "bg-white hover:bg-slate-50 border-sky-200 text-slate-800 shadow-[0_6px_0_0_#bae6fd] hover:shadow-[0_6px_0_0_#7dd3fc] border-t-4 border-t-sky-400";
                const correctStyleNum = "bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_6px_0_0_#059669] text-white pointer-events-none translate-y-[2px]";
                const errorStyleNum = "bg-gradient-to-br from-rose-400 to-rose-500 border-rose-600 shadow-[0_6px_0_0_#e11d48] text-white animate-shake translate-y-[2px]";
                
                const idleStyleOdd = "bg-white hover:bg-slate-50 border-blue-200 text-slate-800 shadow-[0_6px_0_0_#bfdbfe] hover:shadow-[0_6px_0_0_#93c5fd] border-t-4 border-t-blue-400";
                const correctStyleOdd = "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_6px_0_0_#059669] text-white pointer-events-none translate-y-[2px]";
                const errorStyleOdd = "bg-gradient-to-b from-rose-400 to-rose-500 border-rose-600 shadow-[0_6px_0_0_#e11d48] text-white animate-shake translate-y-[2px]";
                
                let activeClasses = '';
                if (isNum) activeClasses = tile.solved ? correctStyleNum : tile.errorState ? errorStyleNum : idleStyleNum;
                else activeClasses = tile.solved ? correctStyleOdd : tile.errorState ? errorStyleOdd : idleStyleOdd;
                
                const shapeClass = isNum 
                  ? 'aspect-square w-[38%] max-w-[130px] rounded-full border-4 p-2 active:translate-y-[8px] active:shadow-none' 
                  : `w-full rounded-[18px] border-2 ${isDense ? 'min-h-[4.5rem] p-3' : 'min-h-[5.5rem] p-4 sm:p-5 sm:min-h-[6.5rem]'} active:translate-y-[6px] active:shadow-none`;

                return (
                  <button key={idx} onClick={() => handleTileTap(idx)}
                    className={`relative flex items-center justify-center transition-all ${shapeClass} ${activeClasses}`}>
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className={`font-black tracking-tight leading-tight ${isNum ? 'text-3xl sm:text-4xl' : isDense ? 'text-[13px] sm:text-sm' : 'text-base sm:text-lg'} ${tile.solved || tile.errorState ? 'text-white drop-shadow-md' : 'text-slate-800'} break-words`}>
                        {displayText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
}
