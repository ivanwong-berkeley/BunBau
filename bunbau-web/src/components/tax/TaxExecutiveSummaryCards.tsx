'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Percent,
  ShieldCheck,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  BarChart2,
  Table2,
  Copy,
  Check,
  X,
  CreditCard,
  Layers,
} from 'lucide-react';
import { MultiYearTaxComparison } from '../../lib/tax/models';

interface TaxExecutiveSummaryCardsProps {
  comparison: MultiYearTaxComparison;
}

export function TaxExecutiveSummaryCards({ comparison }: TaxExecutiveSummaryCardsProps) {
  const kpis = comparison.kpis;
  const latestYear = comparison.latestYear || kpis.latestYear || 2025;
  const previousYear = comparison.previousYear || kpis.previousYear || 2024;
  const nextShieldYear = kpis.nextLossShieldYear || latestYear + 1;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('cards');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const agiLatest = kpis.agi.latest ?? kpis.agi.year2025;
  const agiPrev = kpis.agi.previous ?? kpis.agi.year2024;
  const totalTaxLatest = kpis.totalTax.latest ?? kpis.totalTax.year2025;
  const totalTaxPrev = kpis.totalTax.previous ?? kpis.totalTax.year2024;
  const effRateLatest = kpis.effectiveRatePct.latest ?? kpis.effectiveRatePct.year2025;
  const effRatePrev = kpis.effectiveRatePct.previous ?? kpis.effectiveRatePct.year2024;
  const totalLossShields = kpis.totalLossShieldsNextYear ?? kpis.totalLossShields2026 ?? 73000;
  const capLossShield = kpis.capitalLossShield ?? 30056;
  const passiveLossShield = kpis.passiveLossShield ?? 39057;

  const handleCopySummary = async () => {
    const summaryText = [
      `=== BUNBAU EXECUTIVE TAX SUMMARY (${latestYear} vs ${previousYear}) ===`,
      `• ${latestYear} Adjusted Gross Income: $${fmt(agiLatest)} (${kpis.agi.diff >= 0 ? '+' : ''}${kpis.agi.diffPct.toFixed(1)}% vs ${previousYear}: $${fmt(agiPrev)})`,
      `• ${latestYear} Total Combined Tax (Fed + CA): $${fmt(totalTaxLatest)} (${kpis.totalTax.diff >= 0 ? '+' : ''}${kpis.totalTax.diffPct.toFixed(1)}% vs ${previousYear}: $${fmt(totalTaxPrev)})`,
      `• ${latestYear} Effective Tax Rate: ${effRateLatest.toFixed(1)}% (${kpis.effectiveRatePct.diff >= 0 ? '+' : ''}${kpis.effectiveRatePct.diff.toFixed(1)}% pts vs ${previousYear}: ${effRatePrev.toFixed(1)}%)`,
      `• ${nextShieldYear} Available Forward Loss Shields: $${fmt(totalLossShields)} ($${fmt(capLossShield)} Capital Loss + $${fmt(passiveLossShield)} Passive Loss)`,
      `============================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summaryText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 space-y-3" data-testid="tax-executive-kpis-container">
      {/* Canonical BunBau Container Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <DollarSign size={14} className="text-primary-violet" />
            Executive Tax &amp; Wealth KPIs ({latestYear} Focus)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-mint/15 text-primary-mint border border-primary-mint/30">
            Latest Return: {latestYear}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Information Explainer Icon */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-primary-violet text-white border-primary-violet shadow-xs'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain KPI calculation methodology & IRC rules"
            data-testid="kpis-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* Visual Chart vs. Number Cards Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="kpi-view-cards"
            >
              <CreditCard size={12} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="kpi-view-chart"
            >
              <BarChart2 size={12} />
              <span>Chart</span>
            </button>
          </div>

          {/* One-Click Copy KPI Summary */}
          <button
            type="button"
            onClick={handleCopySummary}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy executive KPI summary to clipboard"
            data-testid="kpi-copy-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Information Explainer Popover / Banner */}
      {showInfo && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-primary-violet" />
              Executive Tax KPIs &amp; Statutory Methodology
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
            • <strong>Adjusted Gross Income (AGI - IRC §62):</strong> Total gross income minus statutory above-the-line deductions. Staying under the $250,000 threshold for Married Filing Jointly eliminates the 3.8% Net Investment Income Tax (NIIT).
          </p>
          <p className="leading-relaxed">
            • <strong>Total Combined Tax:</strong> Synthesizes Federal Form 1040 regular tax + NIIT and California Form 540 state income tax after nonrefundable credits.
          </p>
          <p className="leading-relaxed">
            • <strong>Effective Tax Rate:</strong> Blended average tax liability divided by AGI, illustrating the true household tax burden across both federal and state tax tiers.
          </p>
          <p className="leading-relaxed">
            • <strong>Forward Loss Shields:</strong> Quantifies capital loss carryovers (Schedule D Line 21, up to $3,000/yr against ordinary income; unlimited against capital gains) and unallowed passive rental losses (Form 8582) carried forward into subsequent years.
          </p>
        </div>
      )}

      {/* VIEW 1: Numeric KPI Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="tax-executive-kpis">
          {/* 1. Adjusted Gross Income (AGI) */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {latestYear} Adjusted Gross Income
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-primary-mint/15 text-primary-mint border border-primary-mint/30">
                  Latest Filing ({latestYear})
                </span>
              </div>
              <div className="p-2 bg-primary-violet/10 text-primary-violet rounded-xl shrink-0">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white" data-testid="kpi-agi-latest">
                ${fmt(agiLatest)}
              </span>
              <span className={`text-xs font-bold flex items-center ${kpis.agi.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {kpis.agi.diff >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(kpis.agi.diffPct).toFixed(1)}% vs {previousYear}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {previousYear}: ${fmt(agiPrev)} • Below $250k NIIT limit
            </p>
          </div>

          {/* 2. Total Combined Tax Liability */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {latestYear} Total Tax (Fed + CA)
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-primary-mint/15 text-primary-mint border border-primary-mint/30">
                  Latest Filing
                </span>
              </div>
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                <TrendingDown size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white" data-testid="kpi-totaltax-latest">
                ${fmt(totalTaxLatest)}
              </span>
              <span className={`text-xs font-bold flex items-center ${kpis.totalTax.diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {kpis.totalTax.diff >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(kpis.totalTax.diffPct).toFixed(1)}% vs {previousYear}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {previousYear}: ${fmt(totalTaxPrev)} • {kpis.totalTax.diff <= 0 ? `Saved $${fmt(Math.abs(kpis.totalTax.diff))} vs ${previousYear}` : `+$${fmt(kpis.totalTax.diff)} vs ${previousYear}`}
            </p>
          </div>

          {/* 3. Blended Effective Tax Rate */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {latestYear} Effective Tax Rate
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-primary-mint/15 text-primary-mint border border-primary-mint/30">
                  Latest Filing
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                <Percent size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400" data-testid="kpi-rate-latest">
                {effRateLatest.toFixed(1)}%
              </span>
              <span className={`text-xs font-bold flex items-center ${kpis.effectiveRatePct.diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {kpis.effectiveRatePct.diff >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(kpis.effectiveRatePct.diff).toFixed(1)}% pts vs {previousYear}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {previousYear}: {effRatePrev.toFixed(1)}% • Combined Fed + CA
            </p>
          </div>

          {/* 4. Active Loss Shields for Subsequent Year */}
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  {nextShieldYear} Loss Shields
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                  Forward Shield
                </span>
              </div>
              <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-xl shrink-0">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300" data-testid="kpi-shields-latest">
                ${fmt(totalLossShields)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-1">
              ${fmt(capLossShield)} Capital Loss + ${fmt(passiveLossShield)} Passive Loss
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: Comparative Bar Chart View (2025 vs 2024 Side-by-Side) */}
      {viewMode === 'chart' && (
        <div
          className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4"
          data-testid="kpi-comparative-chart"
        >
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Comparative Tax Progression Bar Analysis ({previousYear} vs {latestYear})
            </span>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> {previousYear} Filed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-violet inline-block" /> {latestYear} Filed (Latest)
              </span>
            </div>
          </div>

          {/* Bar 1: Adjusted Gross Income */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Adjusted Gross Income (AGI)</span>
              <span className="font-mono text-gray-500">
                ${fmt(agiPrev)} ({previousYear}) ➔ <strong>${fmt(agiLatest)}</strong> ({latestYear})
              </span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex relative">
              <div
                className="bg-slate-400/80 h-full"
                style={{ width: `${Math.min(100, (agiPrev / Math.max(agiPrev, agiLatest, 1)) * 100)}%` }}
                title={`${previousYear}: $${fmt(agiPrev)}`}
              />
              <div
                className="bg-primary-violet h-full -ml-[10%]"
                style={{ width: `${Math.min(100, (agiLatest / Math.max(agiPrev, agiLatest, 1)) * 100)}%` }}
                title={`${latestYear}: $${fmt(agiLatest)}`}
              />
            </div>
          </div>

          {/* Bar 2: Total Combined Tax */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Total Combined Tax (Federal + California)</span>
              <span className="font-mono text-gray-500">
                ${fmt(totalTaxPrev)} ({previousYear}) ➔ <strong>${fmt(totalTaxLatest)}</strong> ({latestYear})
              </span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex relative">
              <div
                className="bg-rose-400/70 h-full"
                style={{ width: `${Math.min(100, (totalTaxPrev / Math.max(totalTaxPrev, totalTaxLatest, 1)) * 100)}%` }}
                title={`${previousYear}: $${fmt(totalTaxPrev)}`}
              />
              <div
                className="bg-emerald-500 h-full -ml-[10%]"
                style={{ width: `${Math.min(100, (totalTaxLatest / Math.max(totalTaxPrev, totalTaxLatest, 1)) * 100)}%` }}
                title={`${latestYear}: $${fmt(totalTaxLatest)}`}
              />
            </div>
          </div>

          {/* Bar 3: Effective Tax Rate */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Blended Effective Tax Rate (%)</span>
              <span className="font-mono text-gray-500">
                {effRatePrev.toFixed(1)}% ({previousYear}) ➔ <strong>{effRateLatest.toFixed(1)}%</strong> ({latestYear})
              </span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex relative">
              <div
                className="bg-slate-400/80 h-full"
                style={{ width: `${Math.min(100, (effRatePrev / 50) * 100)}%` }}
                title={`${previousYear}: ${effRatePrev.toFixed(1)}%`}
              />
              <div
                className="bg-emerald-500 h-full -ml-[5%]"
                style={{ width: `${Math.min(100, (effRateLatest / 50) * 100)}%` }}
                title={`${latestYear}: ${effRateLatest.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
