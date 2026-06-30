import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { parseNumericalData } from '../../utils/gameLogic.js';
import { useGameEngine } from '../../engine/useGameEngine.js';

import AdminAuthScreen from './AdminAuthScreen';
import AdminDashboard from '../screens/AdminDashboard';
import AdminMcqDashboard from './AdminMcqDashboard';
import CriteriaTableBuilder from '../screens/CriteriaTableBuilder';
import MobilePreviewer from './MobilePreviewer';

function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

export default function AdminApp() {
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Admin Tab State (Canvas vs MCQ)
  const [adminTab, setAdminTab] = useState('CANVAS');

  const [appSubjects, setAppSubjects] = useState(['Medicine']);
  const [appChapters, setAppChapters] = useState([{ id: 'ch_cardiology', name: 'Cardiology', subject: 'Medicine' }]);
  const [appSubChapters, setAppSubChapters] = useState([]);
  const [criteriaTables, setCriteriaTables] = useState([]);
  const [canvasConfigs, setCanvasConfigs] = useState([]);

  // Fetch data
  useEffect(() => {
    async function loadCloudData() {
      try {
        const { data, error } = await supabase.from('mams_app_state').select('data').eq('id', 'main').single();
        if (data && data.data) {
           const d = data.data;
           if (d.appSubjects && d.appSubjects.length > 0) setAppSubjects(d.appSubjects);
           if (d.appChapters && d.appChapters.length > 0) setAppChapters(d.appChapters);
           if (d.appSubChapters) setAppSubChapters(d.appSubChapters);
           
           if (d.criteriaTables) {
             const parsedTables = d.criteriaTables.map(t => {
               if (!t) return null;
               const rows = Array.isArray(t.rows) ? t.rows.map(r => {
                 if (!r) return null;
                 const cells = Array.isArray(r.cells) ? r.cells.map(c => {
                   if (!c) return { text: '', tiles: [] };
                   const tiles = Array.isArray(c.tiles) ? c.tiles.map(tile => {
                     if (!tile) return null;
                     const subtiles = Array.isArray(tile.subtiles) ? tile.subtiles.filter(Boolean) : [];
                     return { ...tile, subtiles };
                   }).filter(Boolean) : [];
                   return { ...c, tiles };
                 }) : [];
                 return { ...r, cells };
               }).filter(Boolean) : [];
               return { ...t, rows };
             }).filter(Boolean);
             setCriteriaTables(parsedTables);
           }
           
           if (d.canvasConfigs) {
             const parsedCanvases = d.canvasConfigs.map(c => {
               if (!c) return null;
               const questions = Array.isArray(c.questions) && c.questions.length > 0 
                 ? c.questions 
                 : [{ id: uid('cq'), prompt: c.gamingQuestion || 'Identify Criteria', selectedTileIds: c.criteriaIds || [] }];
               return { ...c, questions };
             }).filter(Boolean);
             setCanvasConfigs(parsedCanvases);
           }
        }
      } catch(e) {
        console.error("Cloud load error:", e);
      } finally {
        setIsCloudLoaded(true);
      }
    }
    loadCloudData();
  }, []);

  // Sync data ONLY on Admin side
  useEffect(() => {
    if (!isCloudLoaded) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const data = { appSubjects, appChapters, appSubChapters, criteriaTables, canvasConfigs };
      // This will fail if RLS blocks it (i.e. if not logged in as Admin)
      const { error } = await supabase.from('mams_app_state').upsert({ id: 'main', data, updated_at: new Date().toISOString() });
      if (error) {
        console.error("Failed to sync to database! You may not have Admin permissions.", error);
      }
      setTimeout(() => setIsSyncing(false), 800);
    }, 1500);
    return () => clearTimeout(timer);
  }, [appSubjects, appChapters, appSubChapters, criteriaTables, canvasConfigs, isCloudLoaded]);

  // ── Routing ──────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('ADMIN_AUTH');
  
  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verify admin
        const { data } = await supabase.from('user_profiles').select('is_admin').eq('id', session.user.id).single();
        if (data?.is_admin && screen === 'ADMIN_AUTH') {
          setScreen('ADMIN_HOME');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setScreen('ADMIN_AUTH');
      }
    });
    return () => subscription.unsubscribe();
  }, [screen]);


  // ── Admin selection state ─────────────────────────────────────────────────
  const [selectedTableId, setSelectedTableId] = useState(() => {
    try { return localStorage.getItem('mams_selectedTableId') || null; } catch (e) { return null; }
  });
  const [selectedCanvasId, setSelectedCanvasId] = useState(() => {
    try { return localStorage.getItem('mams_selectedCanvasId') || null; } catch (e) { return null; }
  });
  const [activeComposerQuestionId, setActiveComposerQuestionId] = useState(() => {
    try { return localStorage.getItem('mams_activeComposerQuestionId') || null; } catch (e) { return null; }
  });
  const [expandedChapters, setExpandedChapters] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_expandedChapters_admin');
      return saved ? JSON.parse(saved) : { Cardiology: true };
    } catch (e) { return { Cardiology: true }; }
  });
  const [expandedNodes, setExpandedNodes] = useState(() => {
    try {
      const saved = localStorage.getItem('mams_expandedNodes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  useEffect(() => { if (selectedTableId) localStorage.setItem('mams_selectedTableId', selectedTableId); else localStorage.removeItem('mams_selectedTableId'); }, [selectedTableId]);
  useEffect(() => { if (selectedCanvasId) localStorage.setItem('mams_selectedCanvasId', selectedCanvasId); else localStorage.removeItem('mams_selectedCanvasId'); }, [selectedCanvasId]);
  useEffect(() => { if (activeComposerQuestionId) localStorage.setItem('mams_activeComposerQuestionId', activeComposerQuestionId); else localStorage.removeItem('mams_activeComposerQuestionId'); }, [activeComposerQuestionId]);
  useEffect(() => { localStorage.setItem('mams_expandedChapters_admin', JSON.stringify(expandedChapters)); }, [expandedChapters]);
  useEffect(() => { localStorage.setItem('mams_expandedNodes', JSON.stringify(expandedNodes)); }, [expandedNodes]);

  // Provide a dummy engine for Admin preview requirements inside AdminDashboard
  const engine = useGameEngine({
    appChapters, criteriaTables, canvasConfigs, activeGameMode: 'CANVAS', difficulty: 'easy', setScreen: () => {}
  });

  return (
    <div className={`w-full min-h-screen ${screen !== 'MOBILE_PREVIEW' ? 'bg-slate-900' : ''} flex flex-col`}>
      {screen === 'ADMIN_AUTH' && <AdminAuthScreen setScreen={setScreen} />}
      
      {(screen === 'ADMIN_HOME' || screen === 'CANVAS_COMPOSER') && (
        <>
          {/* Global Toggle Header */}
          {screen === 'ADMIN_HOME' && (
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-center gap-4 shrink-0">
              <button 
                onClick={() => setAdminTab('CANVAS')}
                className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${adminTab === 'CANVAS' ? 'bg-[#FFD700] text-slate-900 shadow-[0_0_20px_rgba(255,215,0,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                🎮 Canvas Games
              </button>
              <button 
                onClick={() => setAdminTab('MCQ')}
                className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${adminTab === 'MCQ' ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                📝 MCQ Database
              </button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {adminTab === 'CANVAS' ? (
              <AdminDashboard 
                appSubjects={appSubjects} setAppSubjects={setAppSubjects}
                appChapters={appChapters} setAppChapters={setAppChapters}
                appSubChapters={appSubChapters} setAppSubChapters={setAppSubChapters}
                expandedChapters={expandedChapters} setExpandedChapters={setExpandedChapters}
                criteriaTables={criteriaTables} setCriteriaTables={setCriteriaTables}
                canvasConfigs={canvasConfigs} setCanvasConfigs={setCanvasConfigs}
                selectedCanvasId={selectedCanvasId} setSelectedCanvasId={setSelectedCanvasId}
                isCloudLoaded={isCloudLoaded} isSyncing={isSyncing}
                setScreen={setScreen} setAdminPassword={() => {}} // deprecated
                setSelectedTableId={setSelectedTableId}
                activeComposerQuestionId={activeComposerQuestionId} setActiveComposerQuestionId={setActiveComposerQuestionId}
                startGame={() => setScreen('MOBILE_PREVIEW')} 
                setActiveGameMode={() => {}} 
                setIsPreviewMode={engine.setIsPreviewMode}
                parseNumericalData={parseNumericalData}
                expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes}
              />
            ) : (
              <AdminMcqDashboard 
                appSubjects={appSubjects}
                setAppSubjects={setAppSubjects}
                appChapters={appChapters}
                setAppChapters={setAppChapters}
                appSubChapters={appSubChapters}
                expandedChapters={expandedChapters} 
                setExpandedChapters={setExpandedChapters}
              />
            )}
          </div>
        </>
      )}
      
      {screen === 'CRITERIA_TABLE_BUILDER' && <CriteriaTableBuilder criteriaTables={criteriaTables} setCriteriaTables={setCriteriaTables} selectedTableId={selectedTableId} setScreen={setScreen} />}
      
      {screen === 'MOBILE_PREVIEW' && <MobilePreviewer setScreen={setScreen} />}
    </div>
  );
}
