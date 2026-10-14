'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Award,
  Info,
  Copy,
  Check,
  X,
  Layers,
  Table2,
} from 'lucide-react';
import { SocialSecurityStrategy } from '../../lib/tax/models';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface SocialSecurityPlannerCardProps {
  strategy: {
    ivan: SocialSecurityStrategy;
    harmony: SocialSecurityStrategy;
  };
}

export function SocialSecurityPlannerCard({ strategy }: SocialSecurityPlannerCardProps) {
  const [claimAge, setClaimAge] = useState<62 | 67 | 70>(70);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const earner = strategy.ivan;
  const spouse = strategy.harmony;

  const currentMonthly =
    claimAge === 62 ? earner.monthlyAt62 : claimAge === 67 ? earner.monthlyAt67 : earner.monthlyAt70;
  const annualTotal = currentMonthly * 12;

  const handleCopyStrategy = async () => {
    const text = [
      `=== SOCIAL SECURITY CLAIMING STRATEGY & CLAWBACK ADVICE ===`,
      `Taxpayers: ${earner.taxpayer} (W-2 Earner) & ${spouse.taxpayer}`,
      `• Optimal Claiming Age: Age 70 ($${earner.monthlyAt70.toLocaleString()}/mo | $${(earner.monthlyAt70 * 12).toLocaleString()}/yr)`,
      `• Full Retirement Age (FRA 67): $${earner.monthlyAt67.toLocaleString()}/mo ($${(earner.monthlyAt67 * 12).toLocaleString()}/yr)`,
      `• Early Filing at Age 62: $${earner.monthlyAt62.toLocaleString()}/mo (Permanent 30% reduction)`,
      `• Clawback Alert: Earning $${earner.annualW2Earnings.toLocaleString()} exceeds the $${earner.earningsTestLimit2026.toLocaleString()} exempt limit, triggering a $${Math.round(earner.earningsClawbackAmount).toLocaleString()} clawback (100% benefit wiped out).`,
      `• Fiduciary Recommendation: ${earner.recommendedRationale}`,
      `===========================================================`,
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
      data-testid="social-security-card"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={18} />
            Social Security Claiming Strategy &amp; Age 62 Clawback Trap
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {earner.taxpayer} (Age 62, W-2: ${earner.annualW2Earnings.toLocaleString()}) • {spouse.taxpayer}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Info Button */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain Social Security earnings test & delayed credit rules"
            data-testid="ss-info-btn"
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
              data-testid="ss-view-cards"
            >
              <Layers size={12} />
              <span>Tiers</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="ss-view-table"
            >
              <Table2 size={12} />
              <span>Schedule</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyStrategy}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy Social Security claiming strategy"
            data-testid="ss-copy-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied Strategy!' : 'Copy Strategy'}</span>
          </button>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            Optimal: Age 70 (+77% over Age 62)
          </span>
        </div>
      </div>

      {/* Info Popover */}
      {showInfo && (
        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-emerald-600" />
              Retirement Earnings Test &amp; Delayed Retirement Credits Statutory Rules
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
            • <strong>Earnings Test Clawback:</strong> Claiming before Full Retirement Age (FRA 67) triggers a mandatory $1 benefit reduction for every $2 earned above the annual statutory limit ($23,400 in 2026). High active W-2 earnings result in a 100% benefit forfeiture.
          </p>
          <p className="leading-relaxed">
            • <strong>Delayed Retirement Credits (DRCs):</strong> For each year claiming is postponed beyond FRA (up to age 70), benefits permanently increase by 8% per year (compounding to 124% of PIA).
          </p>
          <p className="leading-relaxed">
            • <strong>Survivor Benefit Protection:</strong> The higher-earning spouse locks in an inflation-adjusted lifetime survivor pension for the surviving spouse by waiting until age 70.
          </p>
        </div>
      )}

      {/* Critical Earnings Test Alert */}
      <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-rose-900 dark:text-rose-200">
            WARNING: 100% Benefit Clawback If Claimed at Age 62 in 2026
          </h4>
          <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
            The 2026 IRS earnings test exempt limit is ${earner.earningsTestLimit2026.toLocaleString()}. For every $2 earned above this threshold, $1 of benefits is withheld.
            With {earner.taxpayer}’s current W-2 salary of ${earner.annualW2Earnings.toLocaleString()}, the potential clawback is{' '}
            <strong>${Math.round(earner.earningsClawbackAmount).toLocaleString()}</strong>, which completely wipes out the entire annual benefit (${(earner.monthlyAt62 * 12).toLocaleString()}).
          </p>
          <p className="font-bold text-rose-950 dark:text-rose-100 pt-1">
            Fiduciary Advice: Do not file for Social Security while earning six-figure W-2 wages.
          </p>
        </div>
      </div>

      {/* VIEW 1: Claim Age Comparison Selector */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { age: 62 as const, label: 'Age 62 (Earliest)', monthly: earner.monthlyAt62, pct: '70% PIA', tag: 'Permanent 30% Cut' },
              { age: 67 as const, label: 'Age 67 (Full Retirement)', monthly: earner.monthlyAt67, pct: '100% PIA', tag: 'No Earnings Limit' },
              { age: 70 as const, label: 'Age 70 (Maximum Payout)', monthly: earner.monthlyAt70, pct: '124% PIA', tag: '+8%/Yr Guaranteed' },
            ].map((tier) => {
              const isSelected = claimAge === tier.age;
              return (
                <button
                  key={tier.age}
                  type="button"
                  onClick={() => setClaimAge(tier.age)}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{tier.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                      {tier.pct}
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    ${tier.monthly.toLocaleString()}
                    <span className="text-xs font-normal text-gray-400">/mo</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2 font-medium">{tier.tag}</p>
                </button>
              );
            })}
          </div>

          {/* Claiming Strategy Rationale */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-start gap-3">
            <Award className="text-primary-amber shrink-0 mt-0.5" size={18} />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Personalized Fiduciary Rationale ({earner.taxpayer} &amp; {spouse.taxpayer})
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {earner.recommendedRationale}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Structured Payout Schedule Table */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl" data-testid="ss-schedule-table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Claiming Milestone</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Monthly Payout</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Annual Payout</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Earnings Test Exposure</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Survivor Protection Benefit</StaticTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-bold text-rose-600">Age 62 (Earliest)</td>
                <td className="py-2.5 px-3 font-mono font-bold">${earner.monthlyAt62.toLocaleString()}/mo</td>
                <td className="py-2.5 px-3 font-mono">${(earner.monthlyAt62 * 12).toLocaleString()}/yr</td>
                <td className="py-2.5 px-3 text-rose-600 font-semibold">100% Clawback ($0 Received)</td>
                <td className="py-2.5 px-3">Permanently depressed base for survivor.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Age 67 (Full FRA)</td>
                <td className="py-2.5 px-3 font-mono font-bold">${earner.monthlyAt67.toLocaleString()}/mo</td>
                <td className="py-2.5 px-3 font-mono">${(earner.monthlyAt67 * 12).toLocaleString()}/yr</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">Zero Clawback (Earnings exempt)</td>
                <td className="py-2.5 px-3">100% of Primary Insurance Amount.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850 bg-emerald-50/30 dark:bg-emerald-950/20">
                <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-300">Age 70 (Maximum)</td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">${earner.monthlyAt70.toLocaleString()}/mo</td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">${(earner.monthlyAt70 * 12).toLocaleString()}/yr</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">Zero Clawback</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-700">Peak 124% benefit locked for life &amp; survivor.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
