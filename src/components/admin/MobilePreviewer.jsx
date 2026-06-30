import React from 'react';
import UserApp from '../user/UserApp';

export default function MobilePreviewer({ setScreen }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 py-12 font-sans">
      
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Mobile Preview Mode</h2>
        <p className="text-slate-400 text-sm mt-1">Interact with the mobile app exactly as a user would.</p>
        <button 
          onClick={() => setScreen('ADMIN_HOME')}
          className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full text-xs uppercase tracking-wider transition-colors"
        >
          ← Back to Admin Dashboard
        </button>
      </div>

      {/* Phone Frame */}
      <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[800px] w-[375px] shadow-2xl ring-4 ring-black/50">
        
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-3xl w-40 mx-auto z-20"></div>
        
        {/* Screen Content */}
        <div className="rounded-[2rem] overflow-hidden w-[347px] h-[772px] bg-white relative">
          
          {/* We wrap UserApp in a scaled container if we need to, but setting the width/height of the container forces the responsive tailwind classes to hit the mobile breakpoints */}
          <div className="w-full h-full overflow-y-auto no-scrollbar">
            <UserApp />
          </div>

        </div>
      </div>
      
    </div>
  );
}
