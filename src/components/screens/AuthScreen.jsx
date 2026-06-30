import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function AuthScreen({ setScreen, adminPassword, setAdminPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App.jsx will handle navigation on Auth state change
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setErrorMsg('Sign up successful! Please log in, or check email to confirm.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="flex justify-between items-center mb-4">
            <p className="text-[10px] font-black text-[#4F86F7] uppercase tracking-widest">
              {isLogin ? 'Player Login' : 'Player Sign Up'}
            </p>
            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
              className="text-[10px] font-bold text-blue-300 hover:text-white uppercase"
            >
              {isLogin ? 'Create Account' : 'Back to Login'}
            </button>
          </div>

          <form onSubmit={handleAuth}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#4F86F7] mb-3" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#4F86F7] mb-3" 
            />
            
            {errorMsg && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-2 rounded mb-3">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full bg-[#4F86F7] hover:bg-blue-500 text-white font-extrabold py-3 rounded-xl text-sm uppercase tracking-wider transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : (isLogin ? 'Login →' : 'Sign Up →')}
            </button>
          </form>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
          <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Admin Access</p>
          <input 
            type="password" 
            placeholder="Passcode" 
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && adminPassword === 'admin123' && (window.location.href = '/admin')}
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#FFD700] mt-3 mb-3" 
          />
          <button 
            onClick={() => adminPassword === 'admin123' ? (window.location.href = '/admin') : alert('Default: admin123')}
            className="w-full bg-[#FFD700]/20 hover:bg-[#FFD700]/30 border border-[#FFD700]/40 text-[#FFD700] font-extrabold py-3 rounded-xl text-sm uppercase tracking-wider transition-all"
          >
            Admin Panel →
          </button>
        </div>
      </div>
    </div>
  );
}
