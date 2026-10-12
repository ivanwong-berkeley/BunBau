'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import { toStrategyPositions } from '../lib/portfolio/adapter';
import { analyzeYieldGap, YieldAnalysis } from '../lib/strategy';
import { equitiesBySymbol, netWorth, blendedApy, cashSummary, maturities, optionsList, cryptoBySymbol } from '../lib/portfolio/selectors';
import { AppletContainer } from './AppletContainer';
import { Target, TrendingUp, ShieldAlert, ArrowRight, Sparkles, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { DelayedQuote } from '../lib/market/yahoo';
import { isByteStringSafeApiKey } from '../lib/utils/cryptoVault';
import { useStrategist } from '../lib/strategist/useStrategist';
import { tiersFromProfile } from '../lib/strategist/tierRouter';
import { buildAllocationPlan, buildWaterfall, riskOf } from '../lib/strategist/allocationPlan';
import { StrategyPackage, StrategyReportPanel } from './strategy/StrategyReportPanel';
import { StrategistChat, SaveIndicator } from './strategy/StrategistChat';
import { StrategistHistoryDrawer } from './strategy/StrategistHistoryDrawer';
import { StrategistTerminal } from './strategy/StrategistTerminal';
import { useDetachedReport } from '../lib/strategist/useDetachedReport';
import { History as HistoryIcon, ExternalLink, MessageSquare, FileText } from 'lucide-react';

export function StrategyView() {
  const { user, profile } = useAuth();
  const { positions } = usePortfolio();
  const [targetApy, setTargetApy] = useState(10);

  // Market quotes state
  const [quotes, setQuotes] = useState<Record<string, DelayedQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const [workTab, setWorkTab] = useState<'report' | 'chat'>('report');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Portfolio calculations
  const totalNetWorth = netWorth(positions);
  const currentBlendedApy = blendedApy(positions);
  const cash = cashSummary(positions);
  const equities = equitiesBySymbol(positions);
  const upcomingMaturities = maturities(positions);
  const activeOptions = optionsList(positions);

  // Base deterministic analysis
  const analysis: YieldAnalysis = analyzeYieldGap(toStrategyPositions(positions), targetApy, profile?.riskTolerance || 'Moderate');

  // Fetch delayed quotes for top held equities
  const topSymbols = equities.slice(0, 6).map(e => e.symbol);

  useEffect(() => {
    if (topSymbols.length === 0) return;

    let mounted = true;
    const loadQuotes = async () => {
      setLoadingQuotes(true);
      setQuotesError(null);
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(topSymbols.join(','))}`);
        if (!res.ok) throw new Error(`Quotes fetch failed: HTTP ${res.status}`);
        const data = await res.json();
        if (mounted && data.success) {
          setQuotes(data.quotes);
        }
      } catch (err: any) {
        if (mounted) setQuotesError(err.message || 'Delayed quotes unavailable');
      } finally {
        if (mounted) setLoadingQuotes(false);
      }
    };

    loadQuotes();
    return () => { mounted = false; };
  }, [topSymbols.join(',')]);

  const risk = riskOf(profile?.riskTolerance);
  const plan = buildAllocationPlan(positions, risk, cash.netFreeCash);
  const crypto = cryptoBySymbol(positions, totalNetWorth);

  const getContext = () => ({
    totalValue: totalNetWorth,
    currentApy: currentBlendedApy,
    targetApy,
    risk,
    idleCash: cash.netFreeCash,
    allocation: plan.rows.map((r) => ({ slice: r.slice, currentPct: r.currentPct, targetPct: r.targetPct })),
    cryptoHoldings: crypto.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      quantity: c.quantity,
      value: c.marketValue,
      costBasis: c.costBasis,
      unrealizedPnl: c.unrealizedPnl,
      pctOfPortfolio: c.percentOfPortfolio,
    })),
    topHoldings: [
      ...equities.map((e) => ({
        symbol: e.symbol,
        value: e.value,
        assetClass: e.assetClass,
        canSellCoveredCall: (e.availableShares ?? (e.covered ? 0 : e.quantity)) >= 100,
      })),
      ...crypto.map((c) => ({
        symbol: c.symbol,
        value: c.marketValue,
        assetClass: 'Crypto',
        canSellCoveredCall: false,
      })),
    ]
      .sort((a, b) => b.value - a.value)
      .slice(0, 15),
  });

  const st = useStrategist({
    uid: user?.uid || profile?.uid,
    tiers: tiersFromProfile(profile),
    apiKey: isByteStringSafeApiKey(profile?.byokKey) ? profile?.byokKey : undefined,
    getContext,
  });

  const latest = st.latestReport;
  const actionsForPath = latest
    ? latest.report.actions.map((a) => ({ label: a.title, apyImpact: a.expectedApyImpact }))
    : analysis.recommendations.map((r) => ({ label: r.action, apyImpact: r.estimatedApyImpact }));
  const steps = buildWaterfall(currentBlendedApy, targetApy, actionsForPath);

  const pkg: StrategyPackage = {
    report: latest?.report ?? null,
    reportId: latest?.id,
    plan,
    steps,
    meta: {
      version: latest?.version ?? 0,
      generatedAt: latest?.createdAt ?? new Date().toISOString(),
      totalValue: totalNetWorth,
      currentApy: currentBlendedApy,
      targetApy,
      risk,
      modelTag: latest?.modelTag,
    },
  };

  const det = useDetachedReport(pkg, (rid, aid, status) => st.setActionStatus(rid, aid, status));

  // Identify covered call candidates (holding >= 100 shares not yet covered)
  const ccCandidates = equities.filter(
    (e) => (e.availableShares ?? (e.covered ? 0 : e.quantity)) >= 100
  );

  return (
    <div className="space-y-6">
      {/* Delayed Quotes Market Ribbon */}
      {topSymbols.length > 0 && (
        <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Delayed Quotes (15m):</span>
            {loadingQuotes && <RefreshCw size={12} className="animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
            {topSymbols.map((sym) => {
              const q = quotes[sym];
              const price = q?.regularMarketPrice;
              const chg = q?.regularMarketChangePercent ?? 0;
              const isPositive = chg >= 0;
              return (
                <div key={sym} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{sym}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {price ? `$${price.toFixed(2)}` : '—'}
                  </span>
                  {price ? (
                    <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AppletContainer 
        title="Yield Strategy Engine" 
        infoDescription="Calculates the gap between your current blended APY and your Target APY, then recommends trades based on your Risk Tolerance."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
          <div className="col-span-1 border-r border-gray-100 dark:border-slate-700 pr-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Set Target APY</h4>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-bold font-mono text-primary-amber">{targetApy}%</span>
                <span className="text-xs text-gray-400">Slider: 1% – 25%</span>
              </div>
              <input 
                type="range" min="1" max="25" step="0.5" 
                value={targetApy} onChange={e => setTargetApy(parseFloat(e.target.value))}
                className="w-full accent-primary-amber"
              />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-700/60 rounded-xl space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Risk Profile</p>
                <p className="font-semibold text-base flex items-center gap-2 dark:text-white mt-0.5">
                  <ShieldAlert size={16} className="text-secondary-violet" /> 
                  {profile?.riskTolerance || 'Moderate'}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-200/50 dark:border-slate-600/50 text-xs text-gray-500">
                Idle Free Cash Drag: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">${cash.netFreeCash.toLocaleString()}</span>
              </div>
            </div>

            {/* Covered Call Opportunities Panel */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <Layers size={14} /> Covered Call Eligibility
              </h5>
              {ccCandidates.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No unlocked 100+ share positions detected. All held equity is either covered or below 100 shares.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {ccCandidates.map(c => (
                    <div key={c.symbol} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.symbol} ({c.quantity} shs)</span>
                      <span className="text-amber-700 dark:text-amber-400 font-medium">Eligible for {Math.floor(c.quantity / 100)} CC</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strategist actions */}
            <button
              onClick={() => { setWorkTab('report'); st.generate(); }}
              disabled={!!st.busy || !profile?.uid}
              data-testid="consult-strategist"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-violet to-purple-600 hover:from-purple-600 hover:to-primary-violet text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {st.busy === 'report' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Generating report...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> {latest ? 'Generate new report' : 'Consult AI Yield Strategist'}
                </>
              )}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              data-testid="open-strategist-history"
              className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <HistoryIcon size={15} /> Strategist history &amp; memory
            </button>
          </div>
          
          <div className="col-span-2 pl-2 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <div>
                <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">Current Blended APY</p>
                <p className="text-3xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {currentBlendedApy.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Across owned assets (${totalNetWorth.toLocaleString()})</p>
              </div>
              <ArrowRight className="text-gray-300 dark:text-gray-600" size={28} />
              <div className="text-right">
                <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">Target APY</p>
                <p className="text-3xl font-bold font-mono text-primary-amber mt-1">
                  {targetApy.toFixed(2)}%
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  {targetApy > currentBlendedApy ? `Gap: -${(targetApy - currentBlendedApy).toFixed(2)}%` : 'Target Achieved 🎉'}
                </p>
              </div>
            </div>

            {/* Strategist workspace: fixed-height, scrollable; never grows the page */}
            <div className="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 p-3" data-testid="strategist-workspace">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => setWorkTab('report')} data-testid="work-tab-report" className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${workTab === 'report' ? 'bg-primary-violet text-white' : 'text-slate-500'}`}><FileText size={13} /> AI Yield Strategist {latest ? `(v${latest.version})` : ''}</button>
                  <button type="button" onClick={() => setWorkTab('chat')} data-testid="work-tab-chat" className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${workTab === 'chat' ? 'bg-primary-violet text-white' : 'text-slate-500'}`}><MessageSquare size={13} /> Discuss with strategist</button>
                </div>
                <SaveIndicator
                  state={st.saveState}
                  savedAt={st.savedAt}
                  onRetry={st.retrySave}
                  hasSavedItems={st.reports.length > 0 || st.messages.length > 0}
                />
              </div>
              {st.error && workTab === 'report' && (
                <div className="p-3 mb-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between gap-3" role="alert">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{st.error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={st.retrySync}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:opacity-90 transition shrink-0"
                    data-testid="strategist-retry-sync"
                  >
                    Retry Cloud Sync
                  </button>
                </div>
              )}
              {workTab === 'report' ? (
                st.busy === 'report' ? (
                  <StrategistTerminal context={getContext()} />
                ) : det.detached ? (
                  <div className="h-[62vh] flex flex-col items-center justify-center gap-3 text-sm text-slate-500" data-testid="report-detached-placeholder">
                    <ExternalLink size={28} />
                    <p>The report is open in a separate window.</p>
                    <button type="button" onClick={det.bringBack} data-testid="report-bring-back" className="px-4 py-2 rounded-lg bg-primary-violet text-white text-xs font-semibold">Bring back to this page</button>
                  </div>
                ) : (
                  <>
                    {det.blocked && <p className="text-xs text-rose-500 mb-1" role="alert">Pop-up blocked. Allow pop-ups for this site to detach the report, or use Full screen.</p>}
                    <StrategyReportPanel pkg={pkg} onStatus={(aid, status) => latest && st.setActionStatus(latest.id, aid, status)} onDetach={det.detach} />
                  </>
                )
              ) : (
                <StrategistChat
                  messages={st.messages}
                  recap={st.recap}
                  busy={st.busy}
                  error={st.error}
                  onSend={st.send}
                  onGenerate={() => { setWorkTab('report'); st.generate(); }}
                  onRevise={() => { setWorkTab('report'); st.revise(); }}
                  hasReport={!!latest}
                  modelTag={st.lastTag}
                />
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <Target size={16} /> Rule-Based Tactical Recommendations
              </h4>
              <div className="space-y-3.5">
                {analysis.recommendations.length > 0 ? (
                  analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 border border-primary-mint/20 bg-primary-mint/5 rounded-xl transition hover:border-primary-mint/40">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-emerald-800 dark:text-primary-mint flex items-center gap-2">
                          <CheckCircle2 size={16} /> {rec.action}
                        </h5>
                        <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          +{Number(rec.estimatedApyImpact.toFixed(2))}% APY
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{rec.rationale}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                    🎉 Excellent! You are hitting or exceeding your target yield ({targetApy}%). No rebalancing required.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppletContainer>

      {(user?.uid || profile?.uid) && (
        <StrategistHistoryDrawer
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          uid={(user?.uid || profile?.uid)!}
          messages={st.messages}
          reports={st.reports}
          memory={st.memory}
          onReload={st.reload}
          onSaveMemory={st.saveMemoryEdit}
          onRebuildMemory={st.rebuildMemory}
        />
      )}
    </div>
  );
}
