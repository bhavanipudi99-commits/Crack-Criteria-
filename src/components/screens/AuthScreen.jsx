import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const QUOTES = [
  { text: "The art of medicine consists of amusing the patient while nature cures the disease.", author: "Voltaire" },
  { text: "Wherever the art of medicine is loved, there is also a love of humanity.", author: "Hippocrates" },
  { text: "Medicine is not only a science; it is also an art.", author: "Paracelsus" },
  { text: "The good physician treats the disease; the great physician treats the patient.", author: "William Osler" },
  { text: "To study the phenomenon of disease without books is to sail an uncharted sea. To study books without patients is not to go to sea at all.", author: "William Osler" },
  { text: "Every patient you see is a lesson in much more than the disease.", author: "Paul Kalanithi" },
  { text: "The practice of medicine is an art, not a trade.", author: "William Osler" },
  { text: "In nothing do men more nearly approach the gods than in giving health to men.", author: "Cicero" },
];

export default function AuthScreen({ setScreen, adminPassword, setAdminPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx(prev => (prev + 1) % QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('Please enter email and password'); return; }
    if (!agreedToTerms) { setErrorMsg('You must agree to the Privacy Policy and Terms of Service'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL: Branding ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f2744 100%)' }}
      >
        {/* Background logo watermark */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(/logo.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(30%)'
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.7) 100%)' }} />

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-between h-full">
          {/* Top: Logo + Brand */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <img src="/logo.jpg" alt="Estudiante-DM Logo" className="w-16 h-16 rounded-2xl object-cover shadow-2xl border border-white/10" />
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Estudiante<span className="text-cyan-400">-DM</span></h1>
                <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Learn Medicine Right Way</p>
              </div>
            </div>
          </div>

          {/* Middle: Rotating Quote */}
          <div className="flex-1 flex items-center">
            <div key={quoteIdx} className="border-l-4 border-cyan-400 pl-6" style={{ animation: 'fadeIn 0.8s ease-in-out' }}>
              <p className="text-white text-xl font-light leading-relaxed italic mb-4">
                "{QUOTES[quoteIdx].text}"
              </p>
              <p className="text-cyan-400 text-sm font-bold tracking-wide">— {QUOTES[quoteIdx].author}</p>
            </div>
          </div>

          {/* Bottom: Info box */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">📚 Platform</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              MCQs derived from standard medical textbooks and evidence-based web sources. Designed for INI-SS, NEET-PG, and USMLE aspirants.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">

          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-xl mx-auto mb-4" />
            <h1 className="text-3xl font-black text-slate-800">Estudiante<span className="text-cyan-500">-DM</span></h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Learn Medicine Right Way</p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-xs font-black text-cyan-600 uppercase tracking-widest mb-1">{isLogin ? 'Welcome Back' : 'Join Us'}</p>
                <h2 className="text-2xl font-black text-slate-800">{isLogin ? 'Sign In' : 'Create Account'}</h2>
              </div>
              <button
                onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
                className="text-xs font-bold text-slate-400 hover:text-cyan-600 uppercase tracking-wide border border-slate-200 px-3 py-2 rounded-xl transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </div>

            <form onSubmit={handleAuth}>
              <div className="mb-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-start gap-3 mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs font-semibold text-slate-500 leading-relaxed cursor-pointer select-none">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowLegalModal(true); }}
                    className="text-cyan-600 hover:text-cyan-800 underline underline-offset-2"
                  >
                    Privacy Policy & Terms of Service
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-sm uppercase tracking-widest font-black transition-all ${loading ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500' : 'bg-slate-900 hover:bg-slate-700 text-white hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In →' : 'Create Account →')}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-semibold">
            © 2026 Estudiante-DM · For Educational Use Only
          </p>
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
            <div className="p-8 overflow-y-auto flex-1 text-sm text-slate-700 space-y-4 leading-relaxed">
              <h3 className="font-black text-slate-800 text-base">Privacy Policy</h3>
              <p><strong>1. Information We Collect:</strong> We collect your email address and usage data strictly for user profile keeping and progress tracking.</p>
              <p><strong>2. How We Use Your Information:</strong> We do not sell, rent, or share your personal data. We use it securely to log you in and track your learning progress.</p>
              <p><strong>3. Grievance Officer:</strong> In accordance with the Information Technology Act, please contact support for any data discrepancies.</p>
              <hr className="border-slate-200" />
              <h3 className="font-black text-slate-800 text-base">Terms of Service</h3>
              <p><strong>1. Educational Purpose:</strong> This platform is designed strictly for educational and self-assessment purposes. It is NOT professional medical advice.</p>
              <p><strong>2. Source of Content:</strong> MCQs are derived and adapted from standard textbooks (e.g., Harrison's) and web sources in accordance with academic norms and Fair Dealing provisions under Section 52 of the Indian Copyright Act, 1957.</p>
              <p><strong>3. Anti-Piracy:</strong> By using this platform, you agree not to reproduce, screen-record, or distribute the content. The platform employs digital watermarking and anti-piracy tracking.</p>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
              <button
                onClick={() => { setAgreedToTerms(true); setShowLegalModal(false); }}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest hover:bg-slate-700 transition-colors"
              >
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
