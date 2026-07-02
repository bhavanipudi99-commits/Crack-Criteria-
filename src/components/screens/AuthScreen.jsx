import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function AuthScreen({ setScreen, adminPassword, setAdminPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Privacy Policy and Terms of Service');
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
          <p className="text-slate-500 font-bold text-sm mt-1">Keep Practicing, Keep Learning</p>
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

            <div className="flex items-start gap-3 mb-6 p-2">
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs font-semibold text-slate-500 leading-relaxed cursor-pointer select-none">
                I have read and agree to the {' '}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); setShowLegalModal(true); }}
                  className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                >
                  Privacy Policy & Terms of Service
                </button>
              </label>
            </div>

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

      {/* Legal Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h2 className="text-xl font-black text-slate-800">Privacy Policy & Terms</h2>
              <button onClick={() => setShowLegalModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-2xl">&times;</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 prose prose-sm prose-slate">
              <h3>Privacy Policy</h3>
              <p><strong>1. Information We Collect:</strong> We collect your email address and usage data strictly for user profile keeping and progress tracking.</p>
              <p><strong>2. How We Use Your Information:</strong> We do not sell, rent, or share your personal data. We use it securely to log you in.</p>
              <p><strong>3. Grievance Officer:</strong> In accordance with the Information Technology Act, please contact support for any data discrepancies.</p>
              
              <hr className="my-6 border-slate-200" />
              
              <h3>Terms of Service</h3>
              <p><strong>1. Educational Purpose:</strong> This platform is designed strictly for educational and self-assessment purposes. It is NOT professional medical advice.</p>
              <p><strong>2. Source of Content:</strong> The MCQs are derived and adapted from standard textbooks (e.g., Harrison’s) and web sources in accordance with academic norms and Fair Dealing provisions under Section 52 of the Indian Copyright Act, 1957.</p>
              <p><strong>3. Anti-Piracy:</strong> By using this platform, you agree to not reproduce, screen-record, or distribute the content. The platform employs digital watermarking and anti-piracy tracking.</p>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
              <button 
                onClick={() => { setAgreedToTerms(true); setShowLegalModal(false); }}
                className="w-full bg-slate-800 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest hover:bg-slate-700 transition-colors"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
