'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Target,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Layers,
  ArrowRight,
  Percent,
  Award,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Info,
  Table2,
} from 'lucide-react';
import { AppletContainer } from '../AppletContainer';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

export interface TaxPositionInput {
  symbol: string;
  marketValue?: number;
  currentValue?: number;
  assetClass?: string;
  category?: string;
}

interface PortfolioTaxStrategyCardProps {
  positions?: TaxPositionInput[] | any[];
  capitalLossCarryover?: number;
  suspendedPassiveLoss?: number;
  safeHarborRemaining?: number;
  highlightedCardId?: string | null;
  rentalPropertyAddress?: string;
}

export function PortfolioTaxStrategyCard({
  positions = [],
  capitalLossCarryover = 28500,
  suspendedPassiveLoss = 44500,
  safeHarborRemaining = 51062,
  highlightedCardId = null,
  rentalPropertyAddress,
}: PortfolioTaxStrategyCardProps) {
  const propertyAddr = rentalPropertyAddress || 'Schedule E Rental Property';
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // Compute total portfolio value
  const totalValue = positions.reduce((sum, p) => sum + (p.marketValue || p.currentValue || 0), 0);
  const options = positions.filter((p) => p.assetClass === 'options' || p.category === 'Option' || p.symbol?.includes(' '));
  const optionsValue = options.reduce((sum, o) => sum + Math.abs(o.marketValue || o.currentValue || 0), 0);

  // Marginal Tax Rate Benchmark (San Francisco, CA: 35% Federal + 9.3% CA = ~44.3%)
  const combinedMarginalRatePct = 44.3;
  const cdNominalRatePct = 4.75;
  const afterTaxCdYieldPct = cdNominalRatePct * (1 - combinedMarginalRatePct / 100); // ~2.65%

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Refs for scrolling to target strategy card
  const cardRefs = {
    'strategy-options-loss': useRef<HTMLDivElement>(null),
    'strategy-passive-loss': useRef<HTMLDivElement>(null),
    'strategy-muni-drag': useRef<HTMLDivElement>(null),
    'strategy-safe-harbor': useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    if (highlightedCardId && cardRefs[highlightedCardId as keyof typeof cardRefs]?.current) {
      cardRefs[highlightedCardId as keyof typeof cardRefs].current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedCardId]);

  const handleCopyCard = async (cardId: string, title: string, text: string) => {
    const formatted = `=== STRATEGY: ${title} ===\n${text}\n===================================`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(formatted);
    }
    setCopiedCardId(cardId);
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  const strategyTableComponent = (
    <div className="p-4 overflow-x-auto text-xs" data-testid="portfolio-strategy-table">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase tracking-wider font-semibold">
            <StaticTh className="py-2.5 px-3">Tax Strategy Domain</StaticTh>
            <StaticTh className="py-2.5 px-3">Statutory Code &amp; IRS Form</StaticTh>
            <StaticTh align="right" className="py-2.5 px-3">Offset Cap / Rate</StaticTh>
            <StaticTh align="right" className="py-2.5 px-3">Effective Benefit</StaticTh>
            <StaticTh className="py-2.5 px-3">Fiduciary Action</StaticTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
            <td className="py-3 px-3 font-bold text-emerald-950 dark:text-emerald-300">
              Options Premium Tax Neutralization
            </td>
            <td className="py-3 px-3 font-mono text-gray-500">IRC §1212(b) • Schedule D Line 21</td>
            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">${fmt(capitalLossCarryover)}</td>
            <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">100% Tax-Free Offset (avoids 44.3% drag)</td>
            <td className="py-3 px-3 text-gray-600 dark:text-gray-300">Harvest options profits up to carryover cap</td>
          </tr>
          <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
            <td className="py-3 px-3 font-bold text-purple-950 dark:text-purple-300">
              Suspended Passive Rental Loss Offset
            </td>
            <td className="py-3 px-3 font-mono text-gray-500">IRC §469 • Form 8582 Line 16</td>
            <td className="py-3 px-3 text-right font-mono font-bold text-purple-600">${fmt(suspendedPassiveLoss)}</td>
            <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">Absorbs PIG income or unlocks at sale</td>
            <td className="py-3 px-3 text-gray-600 dark:text-gray-300">Deploy into passive partnerships or prepare disposition of {propertyAddr}</td>
          </tr>
          <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
            <td className="py-3 px-3 font-bold text-amber-950 dark:text-amber-300">
              CD vs CA Municipal Bond Yield Arbitrage
            </td>
            <td className="py-3 px-3 font-mono text-gray-500">IRC §103 • CA R&amp;TC §17133</td>
            <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">3.25% Muni vs 4.75% CD</td>
            <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">+3.18% Spread (5.83% taxable equiv)</td>
            <td className="py-3 px-3 text-gray-600 dark:text-gray-300">Shift cash to CA munis to avoid IRMAA MAGI inflation</td>
          </tr>
          <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
            <td className="py-3 px-3 font-bold text-blue-950 dark:text-blue-300">
              Federal Safe Harbor &amp; W-4 Calibration
            </td>
            <td className="py-3 px-3 font-mono text-gray-500">IRC §6654(d)(1)(C) • Form 2210</td>
            <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">${fmt(safeHarborRemaining)} remaining</td>
            <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">Complete underpayment penalty immunity</td>
            <td className="py-3 px-3 text-gray-600 dark:text-gray-300">Adjust employer W-4 Line 4(c) withholding to cure retroactively</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 mb-6" data-testid="portfolio-tax-strategy-card">
      <AppletContainer
        title="Active Portfolio Tax Drag & Loss Shield Strategy"
        infoDescription="Correlates live brokerage positions with IRS Schedule B, D, and E to optimize after-tax yields. Leverages IRC §1212(b) capital loss carryovers, IRC §469 suspended passive rental losses, and IRC §6654(d) federal safe harbor withholding calibration."
        tableComponent={strategyTableComponent}
      >
        <div className="p-5 space-y-6">
          {/* 3 Strategic Shield Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shield 1: Capital Loss Carryover */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={15} /> 2026 Capital Loss Shield
              </span>
              <p className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                ${fmt(capitalLossCarryover)}
              </p>
              <p className="text-[11px] text-emerald-900 dark:text-emerald-400">
                Available to shelter realized short-term options &amp; equity profits 100% tax-free.
              </p>
            </div>

            {/* Shield 2: Suspended Passive Loss */}
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} /> Suspended Passive Rental Loss
              </span>
              <p className="text-2xl font-extrabold font-mono text-purple-700 dark:text-purple-300">
                ${fmt(suspendedPassiveLoss)}
              </p>
              <p className="text-[11px] text-purple-900 dark:text-purple-400">
                Carried forward under Form 8582; can absorb PKSK partnership distributions.
              </p>
            </div>

            {/* Shield 3: Combined Marginal Tax Drag */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={15} /> Combined Marginal Tax Drag
              </span>
              <p className="text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-300">
                {combinedMarginalRatePct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-amber-900 dark:text-amber-400">
                35% Federal + 9.3% CA Top Bracket on short-term option premium &amp; CD interest.
              </p>
            </div>
          </div>

          {/* Symmetrical 4-Card Deep-Dive Strategy Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 (Emerald): Options Tax Shielding */}
            <div
              ref={cardRefs['strategy-options-loss']}
              id="strategy-options-loss"
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-2.5 text-xs ${
                highlightedCardId === 'strategy-options-loss'
                  ? 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/60 ring-2 ring-emerald-400 shadow-md'
                  : 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2 text-sm">
                  <Target className="text-emerald-600 dark:text-emerald-400" size={17} />
                  1. Options Premium Tax Neutralization
                </h4>
                <div className="flex items-center gap-2">
                  {highlightedCardId === 'strategy-options-loss' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white flex items-center gap-1">
                      <Sparkles size={10} /> Target Action
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCard(
                        'strategy-options-loss',
                        'Options Premium Tax Neutralization',
                        `Short-term option premiums are taxed at ordinary rates (up to 44.3% in CA). Harvest up to $${fmt(capitalLossCarryover)} in option profits tax-free under Schedule D Line 21.`
                      )
                    }
                    className={`p-1 px-2 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition ${
                      copiedCardId === 'strategy-options-loss'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-white'
                    }`}
                    title="Copy options strategy"
                    data-testid="copy-strategy-options-btn"
                  >
                    {copiedCardId === 'strategy-options-loss' ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCardId === 'strategy-options-loss' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="text-emerald-950/80 dark:text-emerald-200/80 leading-relaxed">
                Short-term option premiums (Cash Secured Puts &amp; Covered Calls) are taxed at ordinary rates (up to 44.3% in CA).
                Because you hold an active <strong>${fmt(capitalLossCarryover)} capital loss carryover</strong>, you can harvest up to ${fmt(capitalLossCarryover)} in option trading profits in 2026 with <strong>zero federal or state tax liability</strong>.
              </p>
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                <span>IRS Schedule D Line 21 Protection</span>
                <span className="font-mono font-bold">${fmt(capitalLossCarryover)} Offset Cap</span>
              </div>
            </div>

            {/* Card 2 (Purple): Suspended Passive Loss Monetization */}
            <div
              ref={cardRefs['strategy-passive-loss']}
              id="strategy-passive-loss"
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-2.5 text-xs ${
                highlightedCardId === 'strategy-passive-loss'
                  ? 'border-purple-500 bg-purple-100/60 dark:bg-purple-950/60 ring-2 ring-purple-400 shadow-md'
                  : 'border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2 text-sm">
                  <Layers className="text-purple-600 dark:text-purple-400" size={17} />
                  2. Suspended Passive Rental Loss Offset &amp; Monetization (Form 8582)
                </h4>
                <div className="flex items-center gap-2">
                  {highlightedCardId === 'strategy-passive-loss' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-600 text-white flex items-center gap-1">
                      <Sparkles size={10} /> Target Action
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCard(
                        'strategy-passive-loss',
                        'Suspended Passive Rental Loss Offset (Form 8582)',
                        `Carry $${fmt(suspendedPassiveLoss)} in suspended passive losses from ${propertyAddr}. Absorb via PIG partnership distributions or unlock via complete taxable disposition under IRC §469(g).`
                      )
                    }
                    className={`p-1 px-2 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition ${
                      copiedCardId === 'strategy-passive-loss'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 hover:bg-white'
                    }`}
                    title="Copy passive loss strategy"
                    data-testid="copy-strategy-passive-btn"
                  >
                    {copiedCardId === 'strategy-passive-loss' ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCardId === 'strategy-passive-loss' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="text-purple-950/80 dark:text-purple-200/80 leading-relaxed">
                You carry <strong>${fmt(suspendedPassiveLoss)} in unallowed suspended passive losses</strong> from {propertyAddr} under Form 8582, suspended due to the $150,000 modified AGI phase-out rule.
              </p>
              <div className="space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-purple-200/60 dark:border-purple-800/60 text-[11px] text-purple-950 dark:text-purple-300">
                <p>
                  <strong>• Passive Income Generators (PIGs):</strong> Deploy portfolio capital into income-producing passive LP/LLC partnerships or private syndications; distributed passive income absorbs this ${fmt(suspendedPassiveLoss)} suspended loss 100% tax-free.
                </p>
                <p>
                  <strong>• IRC §469(g) Qualifying Disposition:</strong> A complete taxable disposition of {propertyAddr} to an unrelated third party fully unlocks all accumulated suspended losses, allowing them to offset ordinary W-2 earnings and interest.
                </p>
                <p>
                  <strong>• Active Participation Phase-Out:</strong> Managing taxable distributions to keep MAGI under $150,000 restores up to $25,000 in annual rental loss deductions under IRC §469(i).
                </p>
              </div>
            </div>

            {/* Card 3 (Amber): CD vs Municipal Bond Yield Comparison */}
            <div
              ref={cardRefs['strategy-muni-drag']}
              id="strategy-muni-drag"
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-2.5 text-xs ${
                highlightedCardId === 'strategy-muni-drag'
                  ? 'border-amber-500 bg-amber-100/60 dark:bg-amber-950/60 ring-2 ring-amber-400 shadow-md'
                  : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2 text-sm">
                  <TrendingUp className="text-amber-600 dark:text-amber-400" size={17} />
                  3. CD vs California Municipal Bond Tax Drag
                </h4>
                <div className="flex items-center gap-2">
                  {highlightedCardId === 'strategy-muni-drag' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white flex items-center gap-1">
                      <Sparkles size={10} /> Target Action
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCard(
                        'strategy-muni-drag',
                        'CD vs California Municipal Bond Tax Drag',
                        `A 4.75% taxable CD nets only ~${afterTaxCdYieldPct.toFixed(2)}% after 44.3% combined tax drag. A 3.25% CA double-exempt muni yields 5.83% taxable equivalent yield without inflating IRMAA MAGI.`
                      )
                    }
                    className={`p-1 px-2 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition ${
                      copiedCardId === 'strategy-muni-drag'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-white'
                    }`}
                    title="Copy muni bond strategy"
                    data-testid="copy-strategy-muni-btn"
                  >
                    {copiedCardId === 'strategy-muni-drag' ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCardId === 'strategy-muni-drag' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="text-amber-950/80 dark:text-amber-200/80 leading-relaxed">
                A 4.75% taxable CD nets only <strong>~{afterTaxCdYieldPct.toFixed(2)}%</strong> after your 44.3% combined tax drag.
                A double-exempt California municipal bond yielding 3.25% provides an equivalent taxable yield of <strong>5.83%</strong>, generating higher spendable income without pushing your AGI toward the $206k IRMAA cliff.
              </p>
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                <span>Taxable Equivalent Yield Arbitrage</span>
                <span className="font-mono font-bold">+3.18% Spread Over Taxable CD</span>
              </div>
            </div>

            {/* Card 4 (Blue): Federal Safe Harbor Prepayment & W-2 Withholding */}
            <div
              ref={cardRefs['strategy-safe-harbor']}
              id="strategy-safe-harbor"
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-2.5 text-xs ${
                highlightedCardId === 'strategy-safe-harbor'
                  ? 'border-blue-500 bg-blue-100/60 dark:bg-blue-950/60 ring-2 ring-blue-400 shadow-md'
                  : 'border-blue-200 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2 text-sm">
                  <ShieldCheck className="text-blue-600 dark:text-blue-400" size={17} />
                  4. Federal Safe Harbor Prepayment &amp; W-2 Withholding Calibration
                </h4>
                <div className="flex items-center gap-2">
                  {highlightedCardId === 'strategy-safe-harbor' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white flex items-center gap-1">
                      <Sparkles size={10} /> Target Action
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCard(
                        'strategy-safe-harbor',
                        'Federal Safe Harbor Prepayment & W-2 Withholding',
                        `Federal safe harbor requires 110% of prior year total tax (IRC §6654(d)(1)(C)). $${fmt(safeHarborRemaining)} remaining. Cure shortfall retroactively via employer W-4 Line 4(c) withholding to eliminate Form 2210 penalties.`
                      )
                    }
                    className={`p-1 px-2 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition ${
                      copiedCardId === 'strategy-safe-harbor'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-white'
                    }`}
                    title="Copy safe harbor strategy"
                    data-testid="copy-strategy-safe-btn"
                  >
                    {copiedCardId === 'strategy-safe-harbor' ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCardId === 'strategy-safe-harbor' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="text-blue-950/80 dark:text-blue-200/80 leading-relaxed">
                Your federal safe harbor requirement is <strong>110% of prior year total tax</strong> (IRC §6654(d)(1)(C) for AGI &gt; $150k).
                You applied $1,500 from your prior refund, leaving <strong>${fmt(safeHarborRemaining)} needed</strong> to achieve complete immunity from IRS Form 2210 penalties.
              </p>
              <div className="space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-950 dark:text-blue-300">
                <p>
                  <strong>• W-4 Line 4(c) Catch-Up Power:</strong> Unlike quarterly 1040-ES payments which are deemed paid on the transaction date, W-2 federal withholding is legally deemed paid equally across all 4 quarters.
                </p>
                <p>
                  <strong>• Zero-Penalty Remediation:</strong> If you had an estimated payment shortfall earlier in the year, increasing Line 4(c) withholding late in the year retroactively cures the earlier-quarter deficits and eliminates IRS underpayment interest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppletContainer>
    </div>
  );
}
