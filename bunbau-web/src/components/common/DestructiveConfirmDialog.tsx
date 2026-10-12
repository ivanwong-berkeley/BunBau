'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { phraseMatches } from '../../lib/strategist/historyOps';

/**
 * Standard UX S-DEL: every destructive action previews what will be lost and requires a typed phrase.
 * The Delete button is disabled until the phrase matches exactly (case-sensitive).
 */
export function DestructiveConfirmDialog({
  isOpen,
  title,
  preview,
  phrase,
  onConfirm,
  onClose,
  children,
  progress,
}: {
  isOpen: boolean;
  title: string;
  preview: string;
  phrase: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  children?: React.ReactNode;
  progress?: { done: number; total: number } | null;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText('');
      setBusy(false);
      setError('');
    }
  }, [isOpen, phrase]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;
  const ok = phraseMatches(text, phrase) && !busy;

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (e: any) {
      setError(e?.message || 'Delete failed. You can retry.');
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div role="alertdialog" aria-modal="true" aria-label={title} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden" data-testid="destructive-confirm">
          <div className="p-4 flex items-center gap-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500">
            <AlertTriangle size={22} />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-200" data-testid="destructive-preview">{preview}</p>
            {children}
            <div>
              <p className="text-xs text-slate-500 mb-1">Type this phrase to confirm:</p>
              <code className="block text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5 select-all" data-testid="destructive-phrase">{phrase}</code>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                spellCheck={false}
                data-testid="destructive-input"
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                placeholder="Type the phrase exactly"
              />
            </div>
            {progress && (
              <div className="h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden" data-testid="destructive-progress">
                <div className="h-full bg-red-500" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            )}
            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} data-testid="destructive-cancel" className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
              <button type="button" onClick={run} disabled={!ok} data-testid="destructive-delete" className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
