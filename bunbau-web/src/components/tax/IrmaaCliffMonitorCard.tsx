'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Info,
  Copy,
  Check,
  X,
  Layers,
  Table2,
} from 'lucide-react';
import { IrmaaCliffAnalysis } from '../../lib/tax/models';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface IrmaaCliffMonitorCardProps {
  irmaa: IrmaaCliffAnalysis;
}

export function IrmaaCliffMonitorCard({ irmaa }: IrmaaCliffMonitorCardProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const pctUsed = Math.min(100, Math.round((irmaa.actualMagi / irmaa.tier1Threshold) * 100));

  const handleCopyIrmaa = async () => {
    const text = [
      `=== IRMAA 2-YEAR LOOKBACK CLIFF MONITOR ===`,
      `• 2025 Actual MAGI: $${irmaa.actualMagi.toLocaleString()}`,
      `• Tier 1 MFJ Cliff: $${irmaa.tier1Threshold.toLocaleString()}`,
      `• Remaining Safety Buffer: $${irmaa.bufferRemaining.toLocaleString()} (${(100 - pctUsed).toFixed(1)}% buffer)`,
      `• Potential Surcharge Exposure: ~$${irmaa.estimatedAnnualHouseholdSurchargeIfTriggered.toLocaleString()}/year ($${irmaa.partBSurchargeMonthlyPerPerson.toFixed(2)}/mo Part B + $${irmaa.partDSurchargeMonthlyPerPerson.toFixed(2)}/mo Part D per spouse)`,
      `• Fiduciary Protection Strategy: ${irmaa.mitigationStrategy}`,
      `===========================================`,
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
      data-testid="irmaa-cliff-card"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={18} />
            IRMAA Cliff 2-Year Lookback Monitor ($206,000 Threshold)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            2025 MAGI determines 2027 Medicare Part B &amp; Part D Surcharges (Married Filing Jointly)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Info Button */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain IRMAA brackets & 2-year lookback rules"
            data-testid="irmaa-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="irmaa-view-gauge"
            >
              <Layers size={12} />
              <span>Gauge</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="irmaa-view-table"
            >
              <Table2 size={12} />
              <span>Tiers</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyIrmaa}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy IRMAA analysis and mitigation advice"
            data-testid="irmaa-copy-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied Guidance!' : 'Copy Guidance'}</span>
          </button>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            Tight Buffer: ${irmaa.bufferRemaining.toLocaleString()} Below Cliff
          </span>
        </div>
      </div>

      {/* Info Popover */}
      {showInfo && (
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-amber-600" />
              Income-Related Monthly Adjustment Amount (IRMAA) Statutory Rules
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
            • <strong>2-Year Lookback Rule:</strong> The Social Security Administration evaluates federal tax returns from 2 years prior (e.g. 2025 return sets 2027 premiums) to establish Medicare Part B and Part D monthly surcharge tiers.
          </p>
          <p className="leading-relaxed">
            • <strong>The "Cliff" Dynamic:</strong> Unlike progressive tax brackets where only excess dollars are taxed, crossing an IRMAA threshold by even $1 triggers the full monthly surcharge across both spouses for all 12 months.
          </p>
          <p className="leading-relaxed">
            • <strong>Mitigation:</strong> Capital loss carryovers and municipal bond interest (or timing Roth conversions during low-income years) prevent accidental surcharge spikes.
          </p>
        </div>
      )}

      {/* VIEW 1: Visual Threshold Gauge */}
      {viewMode === 'chart' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                2025 Actual MAGI: <strong className="font-mono text-slate-900 dark:text-white">${irmaa.actualMagi.toLocaleString()}</strong>
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                Tier 1 Cliff: ${irmaa.tier1Threshold.toLocaleString()}
              </span>
            </div>

            <div className="w-full h-3.5 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-slate-700 relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  irmaa.isAtRisk ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-primary-mint'
                }`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-gray-400">
              <span>0%</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Buffer Remaining: ${irmaa.bufferRemaining.toLocaleString()} (99.2% of Limit)
              </span>
              <span>$206k (Cliff)</span>
            </div>
          </div>

          {/* Surcharge Impact & Mitigation Details */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-amber-900 dark:text-amber-200">
                  Potential Surcharge Impact: ~${irmaa.estimatedAnnualHouseholdSurchargeIfTriggered.toLocaleString()}/Year
                </h4>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  If taxable income rises by just $1,698, crossing into Tier 1, each spouse incurs an extra ${irmaa.partBSurchargeMonthlyPerPerson.toFixed(2)}/mo for Part B plus ${irmaa.partDSurchargeMonthlyPerPerson.toFixed(2)}/mo for Part D. This results in an immediate <strong>${irmaa.estimatedAnnualHouseholdSurchargeIfTriggered.toLocaleString()} annual penalty for the household</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <ShieldCheck className="text-emerald-500" size={15} /> Fiduciary Protection Strategy
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {irmaa.mitigationStrategy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Multi-Tier IRMAA Bracket Table */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl" data-testid="irmaa-tiers-table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">IRMAA Tier</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">MFJ MAGI Range</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Part B Surcharge / Person</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Part D Surcharge / Person</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Annual Household Penalty</StaticTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850 bg-emerald-50/20 dark:bg-emerald-950/10">
                <td className="py-2.5 px-3 font-bold text-emerald-600">Standard Tier (Current)</td>
                <td className="py-2.5 px-3 font-mono font-semibold">≤ $206,000</td>
                <td className="py-2.5 px-3 font-mono">$0.00/mo</td>
                <td className="py-2.5 px-3 font-mono">$0.00/mo</td>
                <td className="py-2.5 px-3 font-bold text-emerald-600">$0.00</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850 bg-amber-50/30 dark:bg-amber-950/20">
                <td className="py-2.5 px-3 font-bold text-amber-600">Tier 1 (Cliff Risk)</td>
                <td className="py-2.5 px-3 font-mono">$206,001 – $258,000</td>
                <td className="py-2.5 px-3 font-mono">+${irmaa.partBSurchargeMonthlyPerPerson.toFixed(2)}/mo</td>
                <td className="py-2.5 px-3 font-mono">+${irmaa.partDSurchargeMonthlyPerPerson.toFixed(2)}/mo</td>
                <td className="py-2.5 px-3 font-mono font-bold text-rose-600">~${irmaa.estimatedAnnualHouseholdSurchargeIfTriggered.toLocaleString()}/yr</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Tier 2</td>
                <td className="py-2.5 px-3 font-mono">$258,001 – $322,000</td>
                <td className="py-2.5 px-3 font-mono">+$174.70/mo</td>
                <td className="py-2.5 px-3 font-mono">+$33.30/mo</td>
                <td className="py-2.5 px-3 font-mono">~$4,992/yr</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Tier 3</td>
                <td className="py-2.5 px-3 font-mono">$322,001 – $386,000</td>
                <td className="py-2.5 px-3 font-mono">+$279.50/mo</td>
                <td className="py-2.5 px-3 font-mono">+$53.80/mo</td>
                <td className="py-2.5 px-3 font-mono">~$7,999/yr</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
