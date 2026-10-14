'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  TaxDeleteScope,
  expectedTaxDeletePhrase,
  matchesTaxDeletePhrase,
} from '../../lib/tax/taxDeletePhrase';

interface TaxDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableYears: number[];
  onConfirmDelete: (scope: TaxDeleteScope, targetYears: number[]) => Promise<void>;
}

export function TaxDeleteModal({
  isOpen,
  onClose,
  availableYears,
  onConfirmDelete,
}: TaxDeleteModalProps) {
  const [scope, setScope] = useState<TaxDeleteScope>('all');
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[availableYears.length - 1] || 2025);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sortedYears = [...availableYears].sort((a, b) => a - b);
  const minYear = sortedYears[0] || 2020;
  const maxYear = sortedYears[sortedYears.length - 1] || 2025;
  const [fromYear, setFromYear] = useState<number>(minYear);
  const [toYear, setToYear] = useState<number>(maxYear);

  useEffect(() => {
    if (isOpen) {
      setScope('all');
      setSelectedYear(availableYears[availableYears.length - 1] || 2025);
      setSelectedYears(availableYears);
      setFromYear(sortedYears[0] || 2020);
      setToYear(sortedYears[sortedYears.length - 1] || 2025);
      setConfirmText('');
      setError('');
      setBusy(false);
    }
  }, [isOpen, availableYears]);

  if (!isOpen) return null;

  const expectedPhrase =
    scope === 'all'
      ? expectedTaxDeletePhrase('all')
      : scope === 'single'
      ? expectedTaxDeletePhrase('single', selectedYear)
      : expectedTaxDeletePhrase('range', undefined, fromYear, toYear);

  const isPhraseMatch = matchesTaxDeletePhrase(
    confirmText,
    scope,
    selectedYear,
    fromYear,
    toYear
  );

  const handleExecuteDelete = async () => {
    if (!isPhraseMatch || busy) return;
    setBusy(true);
    setError('');

    try {
      let targetYears: number[] = [];
      if (scope === 'all') {
        targetYears = availableYears;
      } else if (scope === 'single') {
        targetYears = [selectedYear];
      } else {
        targetYears = sortedYears.filter((y) => y >= fromYear && y <= toYear);
      }

      await onConfirmDelete(scope, targetYears);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete tax history.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
      data-testid="tax-delete-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-red-500/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">Danger Zone: Delete Tax History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Financial &amp; Brokerage Data Protected</p>
              <p>This action exclusively deletes tax returns from Firestore and local storage. Your investment accounts, CSV uploads, and portfolio snapshots will not be touched.</p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 border border-gray-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-850 transition">
              <input
                type="radio"
                name="taxDeleteScope"
                checked={scope === 'all'}
                onChange={() => {
                  setScope('all');
                  setConfirmText('');
                }}
                className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                data-testid="tax-delete-scope-all"
              />
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Delete All Tax History</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Purges all uploaded returns across all years ({availableYears.join(', ') || 'None'}) and reverts immediately to Tax Demo Mode.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 border border-gray-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-850 transition">
              <input
                type="radio"
                name="taxDeleteScope"
                checked={scope === 'single'}
                onChange={() => {
                  setScope('single');
                  setConfirmText('');
                }}
                className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                data-testid="tax-delete-scope-single"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">Delete Single Tax Year</p>
                  {scope === 'single' && (
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                        setConfirmText('');
                      }}
                      className="bg-gray-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-slate-700 font-bold dark:text-white"
                      data-testid="tax-delete-select-year"
                    >
                      {sortedYears.map((y) => (
                        <option key={y} value={y}>
                          {y} Tax Return
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deletes only the selected tax return year, preserving all other historical filings.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 border border-gray-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-850 transition">
              <input
                type="radio"
                name="taxDeleteScope"
                checked={scope === 'range'}
                onChange={() => {
                  setScope('range');
                  setConfirmText('');
                }}
                className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                data-testid="tax-delete-scope-range"
              />
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Delete Multi-Year Range</p>
                {scope === 'range' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">From</span>
                    <select
                      value={fromYear}
                      onChange={(e) => {
                        setFromYear(Number(e.target.value));
                        setConfirmText('');
                      }}
                      className="bg-gray-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-slate-700 font-bold dark:text-white"
                      data-testid="tax-delete-from-year"
                    >
                      {sortedYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-500">To</span>
                    <select
                      value={toYear}
                      onChange={(e) => {
                        setToYear(Number(e.target.value));
                        setConfirmText('');
                      }}
                      className="bg-gray-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-slate-700 font-bold dark:text-white"
                      data-testid="tax-delete-to-year"
                    >
                      {sortedYears.filter((y) => y >= fromYear).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deletes all tax filings in the specified range.
                </p>
              </div>
            </label>
          </div>

          {/* Typing confirmation safety box */}
          <div className="p-4 bg-gray-50 dark:bg-slate-850 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              To confirm deletion, type exactly:{' '}
              <strong className="text-slate-900 dark:text-white font-mono select-all bg-gray-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {expectedPhrase}
              </strong>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedPhrase}
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-slate-900 dark:text-white"
              data-testid="tax-delete-confirm-input"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteDelete}
              disabled={!isPhraseMatch || busy}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${
                isPhraseMatch && !busy
                  ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-600/20'
                  : 'bg-rose-300 dark:bg-rose-950/50 cursor-not-allowed opacity-60'
              }`}
              data-testid="tax-delete-confirm-button"
            >
              <Trash2 size={14} />
              {busy ? 'Deleting...' : 'Delete Tax History'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
