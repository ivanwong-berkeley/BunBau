'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, X, DollarSign, Layers } from 'lucide-react';
import { CompleteTaxYearReturn } from '../../lib/tax/models';

interface TaxPreImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: () => void;
  taxReturns?: CompleteTaxYearReturn[];
}

export function TaxPreImportReviewModal({
  isOpen,
  onClose,
  onConfirmImport,
  taxReturns = [],
}: TaxPreImportReviewModalProps) {
  if (!isOpen) return null;

  const latest = taxReturns[taxReturns.length - 1];
  const lossShield = latest?.federal.capitalLossCarryoverToNextYear || 0;
  const rentalLoss = latest?.federal.form8582.unallowedSuspendedLossCarryforward || 0;
  const rentalAddr = latest?.federal.rentalProperties?.[0]?.address || 'residential rental property';
  const safeHarborCredit = latest?.federal.overpaymentAppliedToNextYear || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" data-testid="tax-pre-import-review-modal">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-violet/10 text-primary-violet rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pre-Import Tax Review &amp; Portfolio Impact
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Confirm extracted tax liabilities, carryover shields, and safe harbor credits
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Taxpayer Profile Confirmation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
              Filing Taxpayer Profile:
            </span>
            <span className="font-bold font-mono text-primary-violet" data-testid="review-taxpayer-name">
              {latest?.profile?.primaryTaxpayer?.name || 'Primary Taxpayer'}
              {latest?.profile?.spouseTaxpayer?.name ? ` & ${latest.profile.spouseTaxpayer.name}` : ''}
            </span>
          </div>

          {/* Staged Returns Summary */}
          <div className="space-y-2">
            <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
              Extracted Tax Filings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {taxReturns.map((ret) => (
                <div
                  key={ret.taxYear}
                  className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-extrabold font-mono text-primary-violet">
                      TAX YEAR {ret.taxYear}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Validated
                    </span>
                  </div>
                  <div className="font-mono space-y-1 text-slate-700 dark:text-slate-300 pt-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">AGI:</span>
                      <span className="font-bold">${ret.federal.agi.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Fed Tax:</span>
                      <span>${ret.federal.totalFederalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">California Tax:</span>
                      <span>${ret.california.caTaxAfterCredits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold border-t pt-1">
                      <span>Refund Rollover:</span>
                      <span>${ret.federal.overpaymentAppliedToNextYear.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Impact Preview */}
          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900 space-y-2">
            <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Layers size={14} /> Immediate Portfolio Intelligence Impact
            </h4>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
              {lossShield > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Activates <strong>${lossShield.toLocaleString()} capital loss shield</strong> to shelter option and equity gains tax-free.</span>
                </li>
              )}
              {rentalLoss > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Activates <strong>${rentalLoss.toLocaleString()} suspended rental loss</strong> from {rentalAddr} under Form 8582.</span>
                </li>
              )}
              {safeHarborCredit > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Confirms <strong>${safeHarborCredit.toLocaleString()} refund rollover</strong> applied toward estimated taxes.</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-850 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmImport}
            data-testid="confirm-tax-import-btn"
            className="px-5 py-2 bg-gradient-to-r from-primary-violet to-purple-600 hover:from-purple-600 hover:to-primary-violet text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <span>Confirm &amp; Finalize Ingestion</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
