import React from 'react';

export default function GameOverScreen({ marathonLevel, totalRoundsCompleted, score, difficulty, setScreen }) {
  return (
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
}
