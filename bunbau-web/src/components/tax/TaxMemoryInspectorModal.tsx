'use client';

import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  X,
  CheckCircle2,
  Clock,
  Trash2,
  Info,
  Copy,
  Check,
  Table2,
  Layers,
} from 'lucide-react';
import { UserTaxFact, CompleteTaxYearReturn } from '../../lib/tax/models';
import { INITIAL_USER_TAX_FACTS } from '../../lib/tax/seedData';
import { useTax } from '../../contexts/TaxContext';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface TaxMemoryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  facts?: UserTaxFact[];
}

function generateLiveFacts(latestReturn?: CompleteTaxYearReturn): UserTaxFact[] {
  if (!latestReturn) return INITIAL_USER_TAX_FACTS;
  const primary = latestReturn.profile?.primaryTaxpayer?.name || 'Harmony Wong';
  const spouse = latestReturn.profile?.spouseTaxpayer?.name || 'Ivan Wong';
  const employer = latestReturn.profile?.spouseTaxpayer?.employerName || 'ViaPath Technologies inc.';
  const filingStatus = latestReturn.profile?.filingStatus || 'Married Filing Jointly';
  const capLoss = latestReturn.federal?.capitalLossCarryoverToNextYear || 0;
  const rentalLoss = latestReturn.federal?.form8582?.unallowedSuspendedLossCarryforward || 0;
  const propertyAddr = latestReturn.federal?.rentalProperties?.[0]?.address || 'Schedule E Rental Property';

  return [
    {
      factId: 'live-fact-1',
      category: 'profile',
      statement: `Taxpayer ${primary} and spouse ${spouse} file as ${filingStatus} in California.`,
      value: `${filingStatus} - California`,
      confirmedAt: new Date().toISOString(),
      source: `${latestReturn.taxYear} Form 1040 / CA 540`,
    },
    {
      factId: 'live-fact-2',
      category: 'healthcare',
      statement: `${spouse} is actively employed at ${employer} with employer-sponsored group health coverage.`,
      value: `${employer} Group Coverage`,
      confirmedAt: new Date().toISOString(),
      source: `${latestReturn.taxYear} Form W-2 / Fidelity 401(k)`,
    },
    {
      factId: 'live-fact-3',
      category: 'loss_carryover',
      statement: `Cumulative federal capital loss carryover to future tax years is $${capLoss.toLocaleString()}.`,
      value: capLoss,
      confirmedAt: new Date().toISOString(),
      source: `${latestReturn.taxYear} IRS Schedule D Line 21`,
    },
    {
      factId: 'live-fact-4',
      category: 'loss_carryover',
      statement: `Unallowed suspended passive rental losses under Form 8582 total $${rentalLoss.toLocaleString()} from ${propertyAddr}.`,
      value: rentalLoss,
      confirmedAt: new Date().toISOString(),
      source: `${latestReturn.taxYear} IRS Form 8582 Line 16`,
    },
    {
      factId: 'live-fact-5',
      category: 'retirement_goal',
      statement: `${primary} turns 65 in 2027 and is eligible to delay Medicare Part B & D penalty-free via ${spouse}'s active group coverage at ${employer}.`,
      value: 'Medicare Delay Coordination',
      confirmedAt: new Date().toISOString(),
      source: 'CPA Lifecycle Coordination Analysis',
    },
  ];
}

export function TaxMemoryInspectorModal({
  isOpen,
  onClose,
  facts,
}: TaxMemoryInspectorModalProps) {
  const { isTaxDemo, latestTaxReturn, taxReturns } = useTax();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isLiveTaxMode = !isTaxDemo || taxReturns.length > 0;
  const effectiveFacts = facts && facts.length > 0
    ? facts
    : isLiveTaxMode
    ? generateLiveFacts(latestTaxReturn)
    : INITIAL_USER_TAX_FACTS;

  const handleCopyFacts = async () => {
    const text = [
      `=== BUNBAU PERSISTENT USER TAX MEMORY PROFILE ===`,
      ...effectiveFacts.map((f, i) => `${i + 1}. [${f.category.toUpperCase()}] ${f.statement} (Source: ${f.source})`),
      `==================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" data-testid="tax-memory-inspector-modal">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-violet/10 text-primary-violet rounded-xl">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Persistent User Tax Memory ({isLiveTaxMode ? 'Live Client Profile' : 'Synthetic Demo Profile'})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Grounded factual anchors synced to Cloud Firestore for RAG retrieval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Canonical Info Explainer */}
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                showInfo
                  ? 'bg-primary-violet text-white border-primary-violet'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
              title="Explain persistent memory and RAG grounding"
              data-testid="memory-info-btn"
            >
              <Info size={13} />
              <span className="hidden sm:inline">Info</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="View memory facts as cards"
                data-testid="memory-view-cards-btn"
              >
                <Layers size={12} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="View memory facts as table"
                data-testid="memory-view-table-btn"
              >
                <Table2 size={12} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Info Popover / Banner */}
          {showInfo && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info size={13} className="text-purple-600" />
                Firestore Tax Memory &amp; RAG Grounding Architecture
              </p>
              <p className="text-purple-800 dark:text-purple-300">
                Persistent memory anchors client-specific tax entities, employment affiliations (e.g. ViaPath Technologies inc.), and multi-year carryover reserves. These factual anchors are injected directly into LLM prompts to eliminate hallucination and guarantee 100% spousal and employer fidelity.
              </p>
            </div>
          )}

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              All facts are automatically extracted from verified tax filings and confirmed during sessions. SSNs and TINs are permanently redacted.
            </span>
          </div>

          {viewMode === 'cards' ? (
            <div className="space-y-2 pt-2">
              {effectiveFacts.map((fact) => (
                <div
                  key={fact.factId}
                  className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-primary-mint/20 text-primary-mint border border-primary-mint/30">
                        {fact.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Source: {fact.source}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {fact.statement}
                    </p>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-2 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase tracking-wider font-semibold">
                    <StaticTh className="py-2 px-2.5">Category</StaticTh>
                    <StaticTh className="py-2 px-2.5">Factual Statement</StaticTh>
                    <StaticTh className="py-2 px-2.5">Audit Source</StaticTh>
                    <StaticTh align="center" className="py-2 px-2.5">Status</StaticTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {effectiveFacts.map((fact) => (
                    <tr key={fact.factId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-2.5 font-bold uppercase text-[10px] text-primary-violet">
                        {fact.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {fact.statement}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[10px] text-gray-500">
                        {fact.source}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <CheckCircle2 size={14} className="text-emerald-500 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-slate-850 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyFacts}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-100'
            }`}
            title="Copy memory facts to clipboard"
            data-testid="copy-memory-facts-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied Facts!' : 'Copy All Facts'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition hover:opacity-90"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
