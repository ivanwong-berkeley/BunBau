'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { DeleteScope, expectedDeletePhrase, matchesDeletePhrase } from '../lib/portfolio/deletePhrase';

interface DeleteDangerZoneProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'portfolio' | 'history';
  /** Institutions that actually exist in the user's database. */
  institutions: string[];
  onConfirm: (mode: DeleteScope, institution?: string) => Promise<void> | void;
}

export function DeleteDangerZone({ isOpen, onClose, institutions, onConfirm }: DeleteDangerZoneProps) {
  const [mode, setMode] = useState<DeleteScope>('entire');
  const [selectedInst, setSelectedInst] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('entire');
      setConfirmText('');
      setError('');
      setBusy(false);
      setSelectedInst(institutions[0] ?? '');
    }
  }, [isOpen, institutions]);

  if (!isOpen) return null;

  const noData = institutions.length === 0;
  const expectedText = expectedDeletePhrase(mode, selectedInst);
  const isMatch = !noData && matchesDeletePhrase(confirmText, mode, selectedInst) && (mode === 'entire' || !!selectedInst);

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(mode, mode === 'institution' ? selectedInst : undefined);
    } catch (e: any) {
      setError(e?.message || 'Delete failed.');
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden" data-testid="danger-zone">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">Danger Zone: Clear Data</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {noData && (
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                There is no imported portfolio data to delete. (Demo data is never stored.)
              </p>
            )}
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                <input type="radio" checked={mode === 'entire'} onChange={() => { setMode('entire'); setConfirmText(''); }} className="w-4 h-4 text-red-600 focus:ring-red-500" />
                <div>
                  <p className="font-bold dark:text-white">Delete Entire Portfolio</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Wipes all institutions and triggers Demo Mode. Upload and snapshot history is kept.</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                <input type="radio" checked={mode === 'institution'} onChange={() => { setMode('institution'); setConfirmText(''); }} className="w-4 h-4 text-red-600 focus:ring-red-500" />
                <div className="w-full">
                  <div className="flex justify-between items-center w-full">
                    <p className="font-bold dark:text-white">Selected Institution</p>
                    {mode === 'institution' && (
                      <select value={selectedInst} onChange={(e) => { setSelectedInst(e.target.value); setConfirmText(''); }} className="bg-gray-100 dark:bg-slate-800 text-xs p-1 rounded border-none focus:ring-0 dark:text-white" data-testid="danger-institution">
                        {institutions.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Wipes only accounts under the selected firm.</p>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm dark:text-gray-300">To proceed, please type <strong>{expectedText}</strong> below:</p>
              <input 
                type="text" 
                value={confirmText} 
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={noData}
                data-testid="danger-phrase"
                className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono text-sm"
                placeholder={expectedText}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex gap-4">
            <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl font-medium dark:text-white hover:bg-gray-50 transition">Cancel</button>
            <button 
              disabled={!isMatch || busy} 
              onClick={handleConfirm}
              data-testid="danger-confirm"
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18}/> {busy ? 'Deleting…' : 'Delete Data'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
