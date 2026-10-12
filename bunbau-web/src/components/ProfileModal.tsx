'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ShieldAlert, Sun, Moon, Laptop } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatUsPhone, normalizePhoneDigits } from '../lib/utils/formatPhone';
import { ThemeMode, getStoredTheme, resolveActiveTheme, applyThemeToDom, setStoredTheme } from '../lib/utils/themeManager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, updateProfileData } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [themePreference, setThemePreference] = useState<ThemeMode>('dark');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever profile or modal open changes
  useEffect(() => {
    if (profile || user) {
      setDisplayName(profile?.displayName || user?.displayName || '');
      setPhone(formatUsPhone(profile?.phoneNumber || ''));
      setThemePreference(profile?.theme || getStoredTheme() || 'dark');
    }
  }, [profile, user, isOpen]);

  if (!isOpen || !user) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUsPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemePreference(mode);
    const active = resolveActiveTheme(mode);
    applyThemeToDom(active);
    setStoredTheme(mode);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Store clean unformatted digits in database
      const cleanDigits = normalizePhoneDigits(phone);
      await updateProfileData({
        displayName,
        phoneNumber: cleanDigits,
        theme: themePreference,
      });
      alert('Profile details saved!');
      onClose();
    } catch (e) {
      alert('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0b1021] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-xl font-bold dark:text-white">Profile Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full dark:text-gray-400"><X size={20}/></button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Avatar & Badge */}
            <div className="flex flex-col items-center">
              <img src={user.photoURL || ''} alt="avatar" className="w-20 h-20 rounded-full border-4 border-primary-mint/20 mb-3" />
              <div className="bg-gray-100 dark:bg-slate-800 text-xs font-semibold px-3 py-1 rounded-full dark:text-gray-300 flex items-center gap-2">
                <ShieldAlert size={14} className="text-emerald-500" /> Signed in via Google
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Email Address (Read-Only)</label>
                <input 
                  type="text" value={user.email || ''} disabled 
                  className="w-full mt-1 p-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-gray-400 cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Display Name</label>
                <input 
                  type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-primary-mint" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                <input 
                  type="text" value={phone} onChange={handlePhoneChange} placeholder="(650) 202-2366"
                  className="w-full mt-1 p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-primary-mint font-mono" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Appearance / Theme</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    data-testid="theme-select-dark"
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                      themePreference === 'dark'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon size={16} /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('light')}
                    data-testid="theme-select-light"
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                      themePreference === 'light'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun size={16} /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('system')}
                    data-testid="theme-select-system"
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                      themePreference === 'system'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Laptop size={16} /> System
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex gap-4">
            <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition dark:text-white">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-primary-mint text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition flex items-center justify-center gap-2">
              {isSaving ? 'Saving...' : <><CheckCircle size={16}/> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
