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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 mb-4 shadow-sm border border-indigo-200">
            <span className="text-3xl">🧩</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Medicine Arcade</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Keep practicing, keep learning</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              {isLogin ? 'Player Login' : 'Player Sign Up'}
            </p>
            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase transition-colors"
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
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-4 transition-all" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-4 transition-all" 
            />
            
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : (isLogin ? 'Login →' : 'Sign Up →')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
