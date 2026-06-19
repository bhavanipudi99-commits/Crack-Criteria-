import React from 'react';

export default function GateScreen({ playerNickname, setPlayerNickname, setScreen, adminPassword, setAdminPassword }) {
  return (
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
}
