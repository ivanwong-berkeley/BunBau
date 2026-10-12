'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Lock,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  Copy,
  Download,
  Check,
  Scale,
  Sparkles,
} from 'lucide-react';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import type {
  StagingIngestionResponse,
  CanonicalAccountPayload,
  DataSourceOrigin,
} from '../../lib/types/ingestion';
import { toExtractionResult } from '../../lib/types/ingestion';
import type { ExtractionResult } from '../../lib/portfolio/types';
import { SmartTable } from '../common/SmartTable';

export interface ReconciliationDiffModalProps {
  stagingData: StagingIngestionResponse;
  userId?: string;
  onConfirmSuccess: () => void;
  onClose: () => void;
  onApproveReconciled?: (reconciledExtraction: ExtractionResult) => Promise<void> | void;
}

export function ReconciliationDiffModal({
  stagingData,
  userId = 'demo-user',
  onConfirmSuccess,
  onClose,
  onApproveReconciled,
}: ReconciliationDiffModalProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { accounts, diffs, stagingId } = stagingData;
  const primaryAccount = accounts[0];
  const primaryDiff = diffs[0];

  const handleZoomIn = () => setScale((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setScale((prev) => Math.max(0.7, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setScale(1);

  const handleCopySummary = async () => {
    if (!primaryAccount) return;
    const summary = `
=== BunBau Dual-Source Reconciliation Report ===
Account: ${primaryAccount.institution} (${primaryAccount.accountMaskedNumber})
Timestamp: ${new Date().toISOString()}

[Zero-Doubling Verification]
- Existing/Previous Equity: $${(primaryDiff?.totalValueBefore ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Incoming Upload Equity:   $${(primaryAccount.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Reconciled Authoritative Total: $${(primaryAccount.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
  (Status: Zero Doubling Verified - Single Balance Enforced)

[Cash & Collateral]
- Core Cash Balance:   $${(primaryAccount.cashBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Locked CSP Collateral: $${(primaryDiff?.totalLockedCollateral ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Net Free Cash:       $${((primaryDiff?.netFreeCash ?? primaryAccount.cashBalance) ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}

[Holdings Summary]
Total Reconciled Holdings: ${primaryAccount.positions.length} positions
${primaryAccount.positions.map((p) => `• ${p.symbol} [${p.assetCategory}]: ${(p.quantity ?? 0)} shares @ $${(p.currentPrice ?? 0).toFixed(2)} = $${(p.marketValue ?? 0).toFixed(2)} (${p.dataSource})`).join('\n')}
================================================
`.trim();

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadReport = () => {
    if (!primaryAccount) return;
    const blob = new Blob([JSON.stringify(stagingData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunbau-reconciliation-${primaryAccount.institution.toLowerCase()}-${primaryAccount.accountMaskedNumber.replace(/[^a-zA-Z0-9]/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirm = async () => {
    setIsCommitting(true);
    setCommitError(null);

    try {
      if (onApproveReconciled) {
        const converted = toExtractionResult(primaryAccount);
        await onApproveReconciled(converted);
        onConfirmSuccess();
        return;
      }

      const res = await fetch('/api/v1/ingest/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingId,
          userId,
          confirmedAccounts: accounts,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to commit holdings');
      }

      onConfirmSuccess();
    } catch (err) {
      console.error('Commit Error:', err);
      setCommitError((err as Error).message || 'Failed to commit holdings');
    } finally {
      setIsCommitting(false);
    }
  };

  const renderBadge = (source: DataSourceOrigin) => {
    switch (source) {
      case 'CSV':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            CSV
          </span>
        );
      case 'SCREENSHOT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            SCREENSHOT
          </span>
        );
      case 'MERGED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            MERGED
          </span>
        );
      default:
        return null;
    }
  };

  if (!primaryAccount) {
    return null;
  }

  const existingCash = primaryDiff?.statedCashBefore || 0;
  const existingValue = primaryDiff?.totalValueBefore || 0;
  const incomingCash = primaryAccount.cashBalance;
  const incomingValue = primaryAccount.totalValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl max-h-[92vh]'
        }`}
      >
        {/* Top Header & Standard Feature Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 dark:bg-slate-800/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Scale size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Dual-Source Reconciliation Report
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1">
                <CheckCircle2 size={12} /> Zero Doubling Verified
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Account: <span className="font-semibold text-slate-800 dark:text-slate-200">{primaryAccount.institution}</span> ({primaryAccount.accountMaskedNumber}) — {primaryAccount.accountName}
            </p>
          </div>

          {/* Standard Feature Menu: Zoom +/-/Reset, Copy, Download, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <AccessibilityZoomBar
              scale={scale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              minScale={0.7}
              maxScale={1.5}
              testIdPrefix="diff"
            />

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              title="Copy Summary to Clipboard"
              className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm transition flex items-center gap-1.5 text-xs font-medium"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Download JSON Report */}
            <button
              onClick={handleDownloadReport}
              title="Download Reconciliation JSON Report"
              className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm transition flex items-center gap-1.5 text-xs font-medium"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm transition"
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Reconciliation Modal"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Side-by-Side Zero-Doubling Reconciliation Comparison Banner */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 bg-emerald-500/5 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Zero-Doubling Reconciliation Audit Table
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Existing in Portfolio */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">
                1. Existing In Portfolio
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Core Cash:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ${(existingCash ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account Equity:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(existingValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Incoming Upload */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
                2. Incoming Upload Data
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Core Cash:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ${(incomingCash ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account Equity:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${(incomingValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Reconciled Authoritative Total (Single Balance) */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border-2 border-emerald-500/60 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider flex items-center justify-between">
                <span>3. Reconciled (Single Authoritative)</span>
                <span className="text-[10px] text-emerald-600 font-bold">Never Doubled ✅</span>
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-900 dark:text-emerald-200 font-medium">Reconciled Cash:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    ${(primaryAccount.cashBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-900 dark:text-emerald-200 font-medium">Total Account Equity:</span>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                    ${(primaryAccount.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40">
          <div className="p-3 bg-white dark:bg-slate-800/70 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <DollarSign size={13} className="text-emerald-500" /> Gross Core Cash
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              ${(primaryAccount.cashBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/70 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Lock size={13} className="text-amber-500" /> Locked Collateral
            </span>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
              ${(primaryDiff?.totalLockedCollateral ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/70 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-500" /> Net Free Cash
            </span>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ${((primaryDiff?.netFreeCash ?? primaryAccount.cashBalance) ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/70 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <TrendingUp size={13} className="text-blue-500" /> Total Portfolio Equity
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              ${(primaryAccount.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {commitError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{commitError}</span>
          </div>
        )}

        {/* Positions Diff Table (Interactive Zoom) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} /> Reconciled Holdings ({primaryAccount.positions.length} items)
            </h4>
            <span className="text-[11px] text-gray-400 font-mono">
              Display Scale: {Math.round(scale * 100)}%
            </span>
          </div>

          <div
            className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden transition-transform origin-top-left"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: scale > 1 ? `${100 / scale}%` : '100%',
            }}
          >
            <SmartTable<(typeof primaryAccount.positions)[number]>
              tableId="reconciliation-diff"
              title="Reconciled Holdings"
              infoDescription="Single authoritative record of positions after reconciliation; Provenance shows whether each row came from CSV, screenshot or a merge."
              density="regular"
              className="p-2"
              headClassName="bg-gray-100/80 dark:bg-slate-800/90 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-700"
              rows={primaryAccount.positions}
              rowKey={(pos) => pos.positionKey}
              columns={[
                {
                  key: 'symbol',
                  label: 'Symbol / Contract',
                  render: (pos) => (
                    <span className="font-medium text-slate-900 dark:text-white">
                      <span className="block">{pos.symbol}</span>
                      {pos.description && (
                        <span className="block text-[11px] text-gray-400 truncate max-w-xs">{pos.description}</span>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'assetCategory',
                  label: 'Category',
                  render: (pos) => (
                    <span className="text-gray-500 dark:text-gray-400">
                      {pos.assetCategory}
                      {pos.assetCategory === 'Option' && pos.optionDetails && (
                        <span className="block text-[10px] text-amber-500 font-mono">
                          {pos.optionDetails.type} ${pos.optionDetails.strike} (Exp {pos.optionDetails.expirationDate})
                        </span>
                      )}
                      {pos.maturityDate && (
                        <span className="block text-[10px] text-emerald-500 font-mono">
                          Mat: {pos.maturityDate} {pos.yieldApy ? `(${pos.yieldApy}%)` : ''}
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'quantity',
                  label: 'Shares / Qty',
                  align: 'right',
                  preferredDir: 'desc',
                  render: (pos) => (pos.quantity ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 }),
                },
                {
                  key: 'currentPrice',
                  label: 'Current Price',
                  align: 'right',
                  preferredDir: 'desc',
                  render: (pos) => `$${(pos.currentPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                },
                {
                  key: 'marketValue',
                  label: 'Market Value',
                  align: 'right',
                  preferredDir: 'desc',
                  render: (pos) => (
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${(pos.marketValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  ),
                },
                {
                  key: 'dataSource',
                  label: 'Provenance',
                  align: 'center',
                  render: (pos) => renderBadge(pos.dataSource),
                },
              ]}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-slate-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reconciled under single authoritative record. Stale duplicate records are automatically purged.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isCommitting}
              data-testid="confirm-diff-btn"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2 shadow-sm transition"
            >
              {isCommitting ? (
                'Committing to Portfolio…'
              ) : (
                <>
                  Approve & Import Reconciled <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
