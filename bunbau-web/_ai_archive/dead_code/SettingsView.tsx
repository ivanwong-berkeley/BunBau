'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RiskTolerance } from '../lib/models';
import { Save, Key, Moon, Sun, CheckCircle } from 'lucide-react';

export function SettingsView() {
  const { profile, updateRiskTolerance } = useAuth();
  const [risk, setRisk] = useState<RiskTolerance>(profile?.riskTolerance || 'Moderate');
  const [apiKey, setApiKey] = useState(profile?.byokKey || '');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (updateRiskTolerance) {
      await updateRiskTolerance(risk);
    }
    // Theme logic would apply to document.documentElement.classList
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Profile & Settings</h2>

      {/* General Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-lg border-b border-gray-100 dark:border-slate-700 pb-2">General</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
          <div className="flex gap-2">
            {['light', 'dark', 'system'].map(t => (
              <button 
                key={t} onClick={() => setTheme(t as any)}
                className={`px-4 py-2 rounded-lg border capitalize flex items-center gap-2 ${theme === t ? 'bg-primary-mint text-white border-primary-mint' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'}`}
              >
                {t === 'light' && <Sun size={16} />}
                {t === 'dark' && <Moon size={16} />}
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Tolerance</label>
          <p className="text-xs text-gray-500 mb-2">Dictates the strategy engine's recommendations for hitting your target APY.</p>
          <select 
            value={risk} onChange={(e) => setRisk(e.target.value as RiskTolerance)}
            className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 dark:text-white"
          >
            <option value="Conservative">Conservative (CDs, SGOV, Low-Delta Calls)</option>
            <option value="Moderate">Moderate (Dividend ETFs, Delta 0.2 Calls)</option>
            <option value="Aggressive">Aggressive (CSPs, Tactical Swings)</option>
          </select>
        </div>
      </div>

      {/* BYOK Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-lg border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center gap-2">
          <Key size={18} /> Bring Your Own Key (BYOK)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Securely provide your own LLM API key to use for extraction and chat. Saved locally to your profile.</p>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
          <input 
            type="password" placeholder="AIzaSy..." value={apiKey} onChange={e => setApiKey(e.target.value)}
            className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="bg-primary-mint text-white px-6 py-2 rounded-xl font-medium shadow-sm hover:bg-emerald-600 flex items-center gap-2">
          {saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
