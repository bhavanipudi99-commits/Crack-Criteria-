import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminAuthScreen({ setScreen }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Verify admin status
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();
        
      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(`Database Error: ${profileError.message}`);
      }
      
      if (!profileData?.is_admin) {
        await supabase.auth.signOut();
        throw new Error('Access Denied: Account does not have Administrator privileges.');
      }
      
      setScreen('ADMIN_HOME');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4 shadow-lg">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Authorized Personnel Only</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleAdminLogin}>
            <input 
              type="email" 
              placeholder="Admin Email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#FFD700] mb-4 transition-colors" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#FFD700] mb-4 transition-colors" 
            />
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-3 rounded-lg mb-4 text-center">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full bg-[#FFD700] hover:bg-yellow-400 text-slate-900 font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Verifying...' : 'Secure Login →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
