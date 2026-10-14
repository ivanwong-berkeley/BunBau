'use client';

import React, { useState } from 'react';
import {
  Clock,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Award,
  Info,
  Copy,
  Check,
  X,
  Layers,
  Table2,
} from 'lucide-react';
import { RmdRothConversionPlan } from '../../lib/tax/models';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface RmdRothConversionCardProps {
  rmdPlan: RmdRothConversionPlan;
  taxpayerLabels?: { older: string; younger: string };
}

export function RmdRothConversionCard({ rmdPlan, taxpayerLabels }: RmdRothConversionCardProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const olderLabel = taxpayerLabels?.older || 'Harmony';
  const youngerLabel = taxpayerLabels?.younger || 'Ivan';

  const handleCopyRmd = async () => {
    const text = [
      `=== SECURE 2.0 MANDATORY RMD & 10-YEAR ROTH CONVERSION ROADMAP ===`,
      `Taxpayers: ${olderLabel} (RMD in ${rmdPlan.olderSpouseRmdAge75Year}) • ${youngerLabel} (RMD in ${rmdPlan.youngerSpouseRmdAge75Year})`,
      `• Mandatory RMD Age: Age 75 under SECURE 2.0 (born 1960 or later)`,
      `• The 10-Year Tax Valley: ${rmdPlan.taxValleyWindowYears}`,
      `• Recommended Annual Roth Conversion: ~$${rmdPlan.recommendedAnnualRothConversion.toLocaleString()}/year`,
      `• Target Bracket Ceiling: $${rmdPlan.targetBracketCeilingMfj.toLocaleString()} (fills 12% & 22% federal brackets without crossing IRMAA cliff)`,
      `• Estimated Lifetime Tax Savings: ~$${rmdPlan.estimatedLifetimeTaxSavings.toLocaleString()}`,
      `• Fiduciary Rationale: ${rmdPlan.rationale}`,
      `==================================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm mb-6 space-y-4"
      data-testid="rmd-roth-card"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="text-primary-violet" size={18} />
            SECURE 2.0 Mandatory RMD (Age 75) &amp; 10-Year Roth "Tax Valley" Roadmap
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {olderLabel} (RMD in {rmdPlan.olderSpouseRmdAge75Year}) • {youngerLabel} (RMD in {rmdPlan.youngerSpouseRmdAge75Year})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Info Button */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-primary-violet text-white border-primary-violet shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain SECURE 2.0 RMD rules & Roth conversion tax valley"
            data-testid="rmd-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="rmd-view-cards"
            >
              <Layers size={12} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="rmd-view-table"
            >
              <Table2 size={12} />
              <span>Table</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyRmd}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy Roth conversion plan"
            data-testid="rmd-copy-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied Plan!' : 'Copy Plan'}</span>
          </button>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            Est. Savings: ~${rmdPlan.estimatedLifetimeTaxSavings.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Info Popover */}
      {showInfo && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-primary-violet" />
              SECURE Act 2.0 §107 &amp; Pre-75 Roth Conversion Optimization
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <p className="leading-relaxed">
            • <strong>SECURE 2.0 RMD Age 75:</strong> Under Section 107 of the SECURE 2.0 Act, taxpayers born in 1960 or later do not have required distributions until the year they turn 75.
          </p>
          <p className="leading-relaxed">
            • <strong>The "Tax Valley" Arbitrage:</strong> The years between W-2 retirement and age 75 represent a low-income valley. Systematic conversions from pre-tax IRAs/401ks to Roth accounts fill the 12% and 22% federal tax brackets at historic low rates.
          </p>
          <p className="leading-relaxed">
            • <strong>IRMAA Coordination:</strong> Annual conversions must be capped below the $206,000 modified AGI threshold to avoid Medicare Part B/D surcharges.
          </p>
        </div>
      )}

      {/* VIEW 1: 3-Pillar Opportunity Grid */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mandatory RMD Age</span>
              <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">Age 75</p>
              <p className="text-[11px] text-gray-400">
                SECURE Act 2.0 applies to taxpayers born in 1960 or later.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">The "Tax Valley" Window</span>
              <p className="text-2xl font-extrabold font-mono text-primary-violet">Ages 65 – 75</p>
              <p className="text-[11px] text-gray-400">
                {rmdPlan.taxValleyWindowYears}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Annual Conversion Target
              </span>
              <p className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                ~${rmdPlan.recommendedAnnualRothConversion.toLocaleString()}
                <span className="text-xs font-normal">/yr</span>
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                Fills 12% &amp; 22% Federal Brackets
              </p>
            </div>
          </div>

          {/* Rationale & Fiduciary Strategy */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-start gap-3">
            <Sparkles className="text-primary-violet shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Tax Valley Strategic Logic &amp; Pre-75 Bracket Filling
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {rmdPlan.rationale}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Depletion Schedule Table */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl" data-testid="rmd-depletion-table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Phase</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Age Range</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Annual Conversion</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Target Tax Bracket</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Strategic Fiduciary Benefit</StaticTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">Pre-Retirement</td>
                <td className="py-2.5 px-3 font-mono">Ages 62–64</td>
                <td className="py-2.5 px-3 font-mono">$0</td>
                <td className="py-2.5 px-3">Top Bracket (W-2 active)</td>
                <td className="py-2.5 px-3">Maximize pre-tax 401(k) and HSA contributions.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850 bg-emerald-50/20 dark:bg-emerald-950/10">
                <td className="py-2.5 px-3 font-bold text-emerald-600">Golden Tax Valley</td>
                <td className="py-2.5 px-3 font-mono font-bold">Ages 65–74</td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">~${rmdPlan.recommendedAnnualRothConversion.toLocaleString()}/yr</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-700">12% – 22% Federal (Below $206k IRMAA)</td>
                <td className="py-2.5 px-3 font-medium">Depletes pre-tax accounts before Age 75 RMD mandate.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-purple-600">Mandatory RMD Phase</td>
                <td className="py-2.5 px-3 font-mono">Age 75+</td>
                <td className="py-2.5 px-3 font-mono">Per IRS Uniform Table</td>
                <td className="py-2.5 px-3">Variable RMD Bracket</td>
                <td className="py-2.5 px-3">Minimizes forced distributions and Medicare IRMAA surcharges.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
