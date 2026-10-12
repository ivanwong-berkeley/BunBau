'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  Copy,
  Check,
} from 'lucide-react';
import { StitchedAccountResult } from '../lib/portfolio/webullStitching';
import { SmartTable } from './common/SmartTable';
import { AccessibilityZoomBar } from './common/AccessibilityZoomBar';

interface PortfolioPreviewModalProps {
  isOpen: boolean;
  data?: {
    institution: string;
    account: string;
    positions: any[];
    reconciliation?: { statedTotal: number; computedTotal: number; diff: number; ok: boolean };
  };
  accounts?: StitchedAccountResult[];
  sourceType?: 'CSV' | 'Screenshot';
  onClose: () => void;
}

export function PortfolioPreviewModal({
  isOpen,
  data,
  accounts,
  sourceType,
  onClose,
}: PortfolioPreviewModalProps) {
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedAccountTab, setSelectedAccountTab] = useState<string>('all');

  if (!isOpen || !data) return null;

  const hasMultipleAccounts = accounts && accounts.length > 1;

  // Determine active dataset based on selected tab
  let activePositions: any[] = data.positions || [];
  let displayTarget = `${data.institution} (${data.account})`;
  let rec = data.reconciliation;

  const targetAcc =
    accounts && selectedAccountTab !== 'all'
      ? accounts.find((a) => a.accountId === selectedAccountTab)
      : accounts && accounts.length === 1
      ? accounts[0]
      : undefined;

  const isScreenshotSource =
    sourceType === 'Screenshot'
      ? true
      : sourceType === 'CSV'
      ? false
      : targetAcc
      ? (targetAcc.screenshotCount !== undefined ? targetAcc.screenshotCount > 0 : false)
      : accounts && accounts.length > 0
      ? accounts.some((a) => (a.screenshotCount ?? 0) > 0)
      : true;

  if (hasMultipleAccounts && selectedAccountTab === 'all') {
    const sumStated = accounts.reduce((acc, a) => acc + (a.netAccountValue || 0), 0);
    if (sumStated > 0) {
      const computedTotal = Math.round(activePositions.reduce((sum, p) => sum + (p.value || 0), 0) * 100) / 100;
      const diff = Math.round((computedTotal - sumStated) * 100) / 100;
      rec = {
        statedTotal: sumStated,
        computedTotal,
        diff,
        ok: Math.abs(diff) <= 1.0,
      };
    }
  } else if (hasMultipleAccounts && selectedAccountTab !== 'all') {
    if (targetAcc) {
      displayTarget = `${targetAcc.institution || 'WeBull'} - ${targetAcc.accountType} (${
        targetAcc.accountMasked || targetAcc.accountId
      })`;

      // Category mapper for canonical positions
      const catMap: Record<string, string> = {
        Cash: 'Cash',
        Stock: 'Stock',
        ETF: 'ETF',
        CoveredCall: 'Covered Call',
        CSP: 'CSP',
        Crypto: 'Crypto',
        CD: 'CD',
        Treasury: 'Treasury',
      };

      activePositions = targetAcc.deduplicatedPositions.map((p) => ({
        symbol: p.symbol,
        value: p.marketValue,
        quantity: p.quantity,
        name: p.name,
        category: catMap[p.assetClass] || 'Stock',
        costBasis: p.costBasis,
        metadata: p.option
          ? {
              underlyingSymbol: p.option.underlying,
              strikePrice: p.option.strike,
              expiry: p.option.expiry,
            }
          : undefined,
      }));

      // Defense-in-depth: inject cash if present on account but omitted from positions
      if (targetAcc.cashBalance > 0 && !activePositions.some((p) => p.category === 'Cash')) {
        activePositions.unshift({
          symbol: 'Cash (USD)',
          name: 'Cash Balance',
          category: 'Cash',
          value: targetAcc.cashBalance,
          quantity: targetAcc.cashBalance,
          costBasis: targetAcc.cashBalance,
        });
      }

      const computedTotal = Math.round(activePositions.reduce((sum, p) => sum + (p.value || 0), 0) * 100) / 100;
      const statedTotal = targetAcc.netAccountValue !== undefined && targetAcc.netAccountValue > 0
        ? targetAcc.netAccountValue
        : undefined;
      const diff = statedTotal !== undefined
        ? Math.round((computedTotal - statedTotal) * 100) / 100
        : 0;
      rec = {
        statedTotal: statedTotal ?? computedTotal,
        computedTotal,
        diff,
        ok: statedTotal !== undefined ? Math.abs(diff) <= 1.0 : true,
      };
    }
  } else if (accounts && accounts.length === 1) {
    const singleAcc = accounts[0];
    displayTarget = `${singleAcc.institution} - ${singleAcc.accountType} (${
      singleAcc.accountMasked || singleAcc.accountId
    })`;

    if (singleAcc.cashBalance > 0 && !activePositions.some((p) => p.category === 'Cash')) {
      activePositions.unshift({
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        category: 'Cash',
        value: singleAcc.cashBalance,
        quantity: singleAcc.cashBalance,
        costBasis: singleAcc.cashBalance,
      });
    }

    const computedTotal = Math.round(activePositions.reduce((sum, p) => sum + (p.value || 0), 0) * 100) / 100;
    const statedTotal = singleAcc.netAccountValue !== undefined && singleAcc.netAccountValue > 0
      ? singleAcc.netAccountValue
      : undefined;
    const diff = statedTotal !== undefined
      ? Math.round((computedTotal - statedTotal) * 100) / 100
      : 0;
    rec = {
      statedTotal: statedTotal ?? computedTotal,
      computedTotal,
      diff,
      ok: statedTotal !== undefined ? Math.abs(diff) <= 1.0 : true,
    };
  }

  const rawCash = activePositions
    .filter((p) => p.category === 'Cash')
    .reduce((sum, p) => sum + (p.value || 0), 0);

  const csps = activePositions.filter((p) => p.category === 'CSP');
  const ccs = activePositions.filter((p) => p.category === 'Covered Call');
  const stocks = activePositions.filter((p) => p.category === 'Stock');
  const etfs = activePositions.filter((p) => p.category === 'ETF');

  // Never let a missing strike/quantity produce NaN: treat as 0 and flag the row for review.
  const reserveOf = (pos: any) =>
    (Number(pos.metadata?.strikePrice) || 0) * 100 * (Math.abs(Number(pos.quantity)) || 1);
  const missingStrike = (pos: any) => !Number(pos.metadata?.strikePrice);

  const totalCspReserve = csps.reduce((acc, pos) => acc + reserveOf(pos), 0);
  const netPortfolioCash = rawCash - totalCspReserve;

  // Anything not shown in a section above (CDs, Treasuries, Crypto...) so no imported row is ever hidden.
  const SHOWN = new Set(['Cash', 'CSP', 'Covered Call', 'Stock', 'ETF']);
  const others = activePositions.filter((p) => !SHOWN.has(p.category));
  const fmt = (n: number) =>
    (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Helper to check if equity is covered
  const isCovered = (symbol: string) => {
    return ccs.some((cc) => cc.metadata?.underlyingSymbol === symbol);
  };

  const handleCopyPreviewSummary = async () => {
    try {
      const lines = [
        `Portfolio Impact Preview Summary`,
        `Target: ${displayTarget}`,
        `==================================`,
        `Cash Breakdown:`,
        `  • Raw Extracted Cash: $${fmt(rawCash)}`,
        `  • Net Portfolio Cash: $${fmt(netPortfolioCash)}`,
      ];
      if (csps.length > 0) {
        lines.push(`  • CSP Cash Reserves: -$${fmt(totalCspReserve)}`);
      }
      lines.push(``, `Equities (Stocks) [${stocks.length}]:`);
      for (const s of stocks) {
        lines.push(`  • ${s.symbol}: $${fmt(s.value)}`);
      }
      if (etfs.length > 0) {
        lines.push(``, `Exchange Traded Funds (ETFs) [${etfs.length}]:`);
        for (const e of etfs) {
          lines.push(`  • ${e.symbol}: $${fmt(e.value)}`);
        }
      }
      if (others.length > 0) {
        lines.push(``, `Other Holdings [${others.length}]:`);
        for (const o of others) {
          lines.push(`  • ${o.symbol} (${o.category}): $${fmt(o.value)}`);
        }
      }
      if (ccs.length > 0 || csps.length > 0) {
        lines.push(``, `Active Options [${ccs.length + csps.length}]:`);
        for (const c of [...csps, ...ccs]) {
          lines.push(`  • ${c.symbol} (${c.category}): $${fmt(Math.abs(c.value))} (premium ignored)`);
        }
      }
      if (rec) {
        lines.push(
          ``,
          `Reconciliation:`,
          `  • ${isScreenshotSource ? 'Account total on screenshot' : 'Account total on statement'}: $${fmt(rec.statedTotal)}`,
          `  • Sum of imported rows: $${fmt(rec.computedTotal)}`,
          `  • Status: ${rec.ok ? '✓ Reconciled' : '⚠ Mismatch'} (${rec.diff >= 0 ? '+' : '-'}$${fmt(Math.abs(rec.diff))})`
        );
      }
      const summaryText = lines.join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy preview summary:', err);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className={`bg-white dark:bg-[#0b1021] w-full rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-200 origin-center ${
            isFullscreen ? 'fixed inset-0 z-[70] h-screen max-w-none rounded-none' : 'max-w-4xl h-[88vh]'
          }`}
        >
          {/* Modal Header with Standard Interactive Toolbar */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 shrink-0">
            <div>
              <h2 className="text-lg font-bold dark:text-white">Portfolio Impact Preview</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Target: {displayTarget}</p>
            </div>

            {/* Standard Toolbar: Zoom +/-, Reset, Fullscreen, Copy, Close */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <AccessibilityZoomBar
                scale={zoom}
                onZoomIn={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
                onZoomOut={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}
                onReset={() => setZoom(1.0)}
                minScale={0.7}
                maxScale={1.5}
                testIdPrefix="preview"
              />

              <button
                onClick={() => setIsFullscreen((f) => !f)}
                data-testid="preview-fullscreen-btn"
                className="p-1.5 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition border border-gray-200 dark:border-slate-600 cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>

              <button
                onClick={handleCopyPreviewSummary}
                data-testid="preview-copy-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded-lg transition cursor-pointer"
                title="Copy Preview Summary to Clipboard"
              >
                {isCopied ? (
                  <>
                    <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="hidden sm:inline">Copy Summary</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                data-testid="preview-close-btn"
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Account Segmentation Filter Tabs (Shown when multiple accounts exist) */}
          {hasMultipleAccounts && (
            <div className="px-6 py-2.5 bg-gray-100/70 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
                Account View:
              </span>
              <button
                onClick={() => setSelectedAccountTab('all')}
                data-testid="tab-account-all"
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedAccountTab === 'all'
                    ? 'bg-primary-mint text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                }`}
              >
                All Accounts (Combined)
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.accountId}
                  onClick={() => setSelectedAccountTab(acc.accountId)}
                  data-testid={`tab-account-${acc.accountId}`}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedAccountTab === acc.accountId
                      ? 'bg-primary-mint text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {acc.institution || 'WeBull'} {acc.accountType} ({acc.accountMasked || acc.accountId})
                </button>
              ))}
            </div>
          )}

          {/* Content Body with Zoom Transformation */}
          <div className="overflow-auto flex-1 p-6">
            <div
              className="space-y-6 transition-transform duration-150 origin-top"
              style={{ transform: `scale(${zoom})`, width: zoom !== 1.0 ? `${100 / zoom}%` : '100%' }}
            >
              {/* Cash Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Cash Breakdown</h3>
                <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Raw Extracted Cash</span>
                    <span className="font-mono dark:text-white" data-testid="raw-extracted-cash">
                      ${fmt(rawCash)}
                    </span>
                  </div>
                  {csps.map((csp, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                        CSP Reserve <ArrowRight size={14} /> ({csp.symbol} x {Math.abs(Number(csp.quantity)) || 1})
                        {missingStrike(csp) && <span className="text-red-500 text-xs"> strike not detected</span>}
                      </span>
                      <span className="font-mono text-amber-600 dark:text-amber-500">
                        -${fmt(reserveOf(csp))}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between font-bold">
                    <span className="text-emerald-600 dark:text-emerald-500">Net Portfolio Cash</span>
                    <span
                      className="font-mono text-emerald-600 dark:text-emerald-500"
                      data-testid="net-portfolio-cash"
                    >
                      ${fmt(netPortfolioCash)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Equities Section */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Equities (Stocks) [{stocks.length}]
                  </h3>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <SmartTable<(typeof stocks)[number]>
                      tableId="preview-equities"
                      title="Equities (Stocks)"
                      infoDescription="Stock positions extracted for this import. (CC) marks collateral locked by a covered call."
                      headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                      rows={stocks}
                      columns={[
                        { key: 'symbol', label: 'Symbol', render: (stock) => (
                          <span className="font-medium dark:text-slate-300 inline-flex items-center gap-2">
                            {stock.symbol}
                            {isCovered(stock.symbol) && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                (CC) <Lock size={10} />
                              </span>
                            )}
                          </span>
                        ) },
                        { key: 'value', label: 'Value', align: 'right', preferredDir: 'desc', render: (stock) => <span className="text-gray-500">${fmt(stock.value)}</span> },
                      ]}
                    />
                  </div>
                </div>

                {/* ETFs Section */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Exchange Traded Funds (ETFs) [{etfs.length}]
                  </h3>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    {etfs.length > 0 ? (
                      <SmartTable<(typeof etfs)[number]>
                        tableId="preview-etfs"
                        title="Exchange Traded Funds (ETFs)"
                        infoDescription="ETF positions extracted for this import. (CC) marks collateral locked by a covered call."
                        headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                        rows={etfs}
                        columns={[
                          { key: 'symbol', label: 'Symbol', render: (etf) => (
                            <span className="font-medium dark:text-slate-300 inline-flex items-center gap-2">
                              {etf.symbol}
                              {isCovered(etf.symbol) && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                  (CC) <Lock size={10} />
                                </span>
                              )}
                            </span>
                          ) },
                          { key: 'value', label: 'Value', align: 'right', preferredDir: 'desc', render: (etf) => <span className="text-gray-500">${fmt(etf.value)}</span> },
                        ]}
                      />
                    ) : (
                      <div className="p-4 text-xs text-center text-gray-400">No ETF holdings in this view</div>
                    )}
                  </div>
                </div>
              </div>

              {others.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Other Holdings (CDs, Treasuries, Crypto) [{others.length}]
                  </h3>
                  <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <SmartTable<(typeof others)[number]>
                      tableId="preview-other-holdings"
                      title="Other Holdings (CDs, Treasuries, Crypto)"
                      infoDescription="CDs, Treasuries and crypto positions extracted for this import."
                      density="regular"
                      headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                      rows={others}
                      columns={[
                        { key: 'symbol', label: 'Symbol', render: (o) => (
                          <span className="font-medium dark:text-slate-300">
                            {o.symbol} <span className="text-xs text-gray-500 ml-2">({o.category})</span>
                            {o.apy ? (
                              <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {Number(o.apy).toFixed(2)}% APY
                              </span>
                            ) : null}
                          </span>
                        ) },
                        { key: 'value', label: 'Value', align: 'right', preferredDir: 'desc', render: (o) => <span className="text-gray-500">${fmt(o.value)}</span> },
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Stated vs Computed Reconciliation */}
              {rec && (
                <div
                  data-testid="reconciliation"
                  className={`rounded-lg p-4 text-sm border ${
                    rec.ok
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{isScreenshotSource ? 'Account total on screenshot' : 'Account total on statement'}</span>
                    <span className="font-mono">${fmt(rec.statedTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sum of imported rows</span>
                    <span className="font-mono">${fmt(rec.computedTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-current/20 mt-1">
                    <span>
                      {rec.ok
                        ? isScreenshotSource
                          ? '✓ 100% Reconciled with screenshot'
                          : '✓ 100% Reconciled with statement total'
                        : isScreenshotSource
                        ? '⚠ Mismatch: a row may be missing or misread'
                        : '⚠ Variance vs statement total'}
                    </span>
                    <span className="font-mono">
                      {rec.diff >= 0 ? '+' : '-'}${fmt(Math.abs(rec.diff))}
                    </span>
                  </div>
                </div>
              )}

              {/* Options Section */}
              {(csps.length > 0 || ccs.length > 0) && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Active Options Filter [{csps.length + ccs.length}]
                  </h3>
                  <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      The following premium values will be ignored in Net Worth calculation to prevent double-counting:
                    </p>
                    {[...csps, ...ccs].map((opt, i) => {
                      const dateStr = opt.metadata?.expiry;
                      const isCsp = opt.category === 'CSP';
                      const strike = opt.metadata?.strikePrice;
                      const contracts = Math.abs(Number(opt.quantity)) || 1;
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-slate-800 last:border-b-0"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="dark:text-slate-200 font-semibold">{opt.symbol}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  isCsp
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}
                              >
                                {opt.category}
                              </span>
                              {dateStr && (
                                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                                  Exp: {dateStr}
                                </span>
                              )}
                            </div>
                            {isCsp && strike ? (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Cash collateral locked: ${(strike * 100 * contracts).toLocaleString()} ({contracts}{' '}
                                contract @ ${strike})
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-gray-400 line-through">
                              ${fmt(Math.abs(opt.value))}
                            </span>
                            <div className="text-[10px] text-gray-400">ignored</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}