import React from 'react';

export default function GameScreen(props) {
  const {
    activeTargetObjective, activeGameMode, boardTiles, showLevelUp,
    marathonLevel, marathonLives, activeCanvasIdx, gameCanvasQueue,
    score, difficulty, timeRemaining, parseNumericalData, handleTileTap,
    getTileColor, advanceToNext, setScreen, setScore, isShuffling
  } = props;

  if (!activeTargetObjective) return null;
  const currentSubMode = activeGameMode === 'MIXED_MARATHON' ? activeTargetObjective.marathonSubMode : activeGameMode;
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
        {currentSubMode === 'NUMERICAL' ? (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 mb-1">Select the correct value for:</p>
            <h2 className="text-base font-black text-slate-900 leading-snug">{activeTargetObjective.diagnosis}</h2>
          </>
        ) : (
          <h2 className={`font-black tracking-tight mt-0.5 leading-tight text-lg text-slate-900`}>{activeTargetObjective.diagnosis}</h2>
        )}
        {currentSubMode === 'CANVAS' && <p className="text-[9px] text-slate-400 mt-1 text-left">Tap all matching tiles · ½ badges = jigsaw pair</p>}
      </div>

      <div className={`flex-1 overflow-hidden transform transition-all duration-500 flex flex-col justify-center ${isShuffling ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
        {currentSubMode === 'CANVAS' ? (
          <div className="w-full h-full p-2 flex flex-col justify-center my-auto overflow-y-auto max-h-full">
            <table className="w-full h-full table-fixed border-separate" style={{ borderSpacing: '6px' }}>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((tile, ci) => {
                      const idx = ri * cols + ci;
                      const color = getTileColor(tile.criterion.criterionCategory);
                      const isPair = tile.criterion.tileCount === 2;
                      return (
                        <td key={ci} onClick={() => handleTileTap(idx)}
                          className={`h-20 sm:h-24 p-2 relative cursor-pointer active:scale-95 transition-all text-center align-middle border-2 shadow-sm rounded-xl ${
                            tile.solved ? 'bg-emerald-500 border-emerald-700 text-white pointer-events-none' :
                            tile.errorState ? 'bg-rose-500 border-rose-700 text-white animate-shake' :
                            color
                          }`}
                          style={{ display: 'table-cell', borderCollapse: 'separate' }}>
                          {isPair && !tile.solved && !tile.errorState && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white/70 flex items-center justify-center text-[6px] font-black opacity-80 shadow-sm">½</div>
                          )}
                          <p className={`font-black leading-tight tracking-tight text-xs`}>
                            {tile.criterion.label}
                          </p>
                        </td>
                      );
                    })}
                    {/* Fill empty cells if row is not full so the layout doesn't break */}
                    {Array.from({ length: cols - row.length }).map((_, emptyIdx) => (
                      <td key={`empty-${emptyIdx}`} style={{ display: 'table-cell' }} className="border-2 border-transparent"></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full px-4 py-6 overflow-y-auto">
            <div className={`w-full max-w-md my-auto ${currentSubMode === 'NUMERICAL' ? 'flex flex-wrap justify-center gap-5 sm:gap-8' : boardTiles.length >= 5 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}`}>
              {boardTiles.map((tile, idx) => {
                const isNum = currentSubMode === 'NUMERICAL';
                const isDense = !isNum && boardTiles.length >= 5;
                const numData = isNum ? parseNumericalData(tile.criterion.label) : null;
                const displayText = isNum ? (numData?.number || tile.criterion.label) : tile.criterion.label;
                const suffixText = !isNum ? null : null; // Units are now strictly in the question stem for numericals

                const idleStyleNum = "bg-gradient-to-br from-white to-sky-100 border-sky-300 shadow-[0_6px_0_0_#7dd3fc] hover:border-sky-400";
                const correctStyleNum = "bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_6px_0_0_#059669] text-white pointer-events-none";
                const errorStyleNum = "bg-gradient-to-br from-rose-400 to-rose-500 border-rose-600 shadow-[0_6px_0_0_#e11d48] text-white animate-shake";
                
                const idleStyleOdd = "bg-gradient-to-b from-white to-purple-50 border-purple-200 shadow-[0_5px_0_0_#e9d5ff] hover:border-purple-300";
                const correctStyleOdd = "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_5px_0_0_#059669] text-white pointer-events-none";
                const errorStyleOdd = "bg-gradient-to-b from-rose-400 to-rose-500 border-rose-600 shadow-[0_5px_0_0_#e11d48] text-white animate-shake";
                
                let activeClasses = '';
                if (isNum) activeClasses = tile.solved ? correctStyleNum : tile.errorState ? errorStyleNum : idleStyleNum;
                else activeClasses = tile.solved ? correctStyleOdd : tile.errorState ? errorStyleOdd : idleStyleOdd;
                
                const shapeClass = isNum 
                  ? 'aspect-square w-[42%] max-w-[140px] rounded-full border-4 p-2 active:translate-y-[6px]' 
                  : `w-full rounded-2xl border-2 ${isDense ? 'min-h-[4rem] p-3' : 'min-h-[5.5rem] p-4'} active:translate-y-[5px]`;

                return (
                  <button key={idx} onClick={() => handleTileTap(idx)}
                    className={`relative flex items-center justify-center transition-all active:shadow-none ${shapeClass} ${activeClasses}`}>
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className={`font-black tracking-tight leading-none ${isNum ? 'text-3xl sm:text-4xl' : isDense ? 'text-sm' : 'text-lg'} ${tile.solved || tile.errorState ? 'text-white' : isNum ? 'text-sky-900' : 'text-purple-900'} break-words line-clamp-3`}>
                        {displayText}
                      </span>
                      {suffixText && (
                        <span className={`text-xs sm:text-sm font-extrabold mt-1.5 uppercase tracking-wider ${tile.solved ? 'text-emerald-100' : tile.errorState ? 'text-rose-100' : 'text-sky-600/80'}`}>
                          {suffixText}
                        </span>
                      )}
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
