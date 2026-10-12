'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Scale,
  Eye,
  Download,
  Building2,
  PieChart,
  Calendar,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Activity,
  Percent,
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { buildConsolidatedReport, ConsolidatedPortfolioReport } from '../../lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv, downloadCsvFile } from '../../lib/reports/csvExporter';
import { ReportPreviewModal } from './ReportPreviewModal';
import { ReconciliationAuditModal } from './ReconciliationAuditModal';
import { AccountSelectionModal } from './AccountSelectionModal';
import { buildSeedAccounts } from '../../lib/portfolio/seed';
import { netWorth, cashSummary, blendedApy } from '../../lib/portfolio/selectors';

interface ReportsViewProps {
  isSidebarExpanded?: boolean;
}

export function ReportsView({ isSidebarExpanded = true }: ReportsViewProps) {
  const { accounts, positions, isDemo, institutions } = usePortfolio();

  // Active modal state
  const [activePreviewReport, setActivePreviewReport] = useState<ConsolidatedPortfolioReport | null>(null);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  // Effective accounts (in demo mode, ensure seed accounts are accessible for reporting)
  const effectiveAccounts = isDemo && accounts.length === 0 ? buildSeedAccounts() : accounts;

  const totalNW = netWorth(positions);
  const cash = cashSummary(positions);
  const totalApy = blendedApy(positions);
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Handlers for Flagship Consolidated Report
  const handleOpenConsolidatedPreview = () => {
    const report = buildConsolidatedReport(positions, effectiveAccounts, {
      isDemo,
      reportTitle: 'Portfolio Consolidated Audit Report (All Institutions & Accounts)',
    });
    setActivePreviewReport(report);
  };

  const handleDownloadConsolidatedCsv = () => {
    const report = buildConsolidatedReport(positions, effectiveAccounts, {
      isDemo,
      reportTitle: 'Portfolio Consolidated Audit Report (All Institutions & Accounts)',
    });
    const csv = generateConsolidatedReportCsv(report);
    downloadCsvFile(csv, `bunbau_consolidated_portfolio_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Handlers for Scoped / Filtered Report
  const handlePreviewFilteredReport = (accountIds: string[]) => {
    const report = buildConsolidatedReport(positions, effectiveAccounts, {
      isDemo,
      filterAccountIds: accountIds,
      reportTitle: 'Custom Filtered Account Audit Report',
    });
    setActivePreviewReport(report);
  };

  // Handler for Asset Class & Yield Report
  const handleOpenAssetClassReport = () => {
    const report = buildConsolidatedReport(positions, effectiveAccounts, {
      isDemo,
      reportTitle: 'Asset Allocation & Fixed Income Yield Ledger',
    });
    setActivePreviewReport(report);
  };

  // Handler for Options Ledger Report
  const handleOpenOptionsReport = () => {
    const report = buildConsolidatedReport(positions, effectiveAccounts, {
      isDemo,
      reportTitle: 'Active Options & Collateral Exposure Ledger',
    });
    setActivePreviewReport(report);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-mint via-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Portfolio Reports & Deep Audit Center
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multi-level consolidated roll-ups, granular reconciliation, and live statement audit.
              </p>
            </div>
          </div>
        </div>

        {/* Global Summary Badge Ribbon */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 shadow-sm flex items-center gap-2 text-xs">
            <span className="text-gray-400">Total Net Worth:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              ${fmt(totalNW)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 shadow-sm flex items-center gap-2 text-xs">
            <span className="text-gray-400">Net Free Cash:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ${fmt(cash.netFreeCash)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 shadow-sm flex items-center gap-2 text-xs">
            <span className="text-gray-400">Blended APY:</span>
            <span className="font-mono font-bold text-secondary-violet">
              {totalApy.toFixed(2)}%
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 shadow-sm flex items-center gap-2 text-xs">
            <span className="text-gray-400">Institutions:</span>
            <span className="font-bold text-primary-mint">{institutions.length || 1}</span>
          </div>
        </div>
      </div>

      {/* REPORT TILE CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TILE 1: FLAGSHIP PORTFOLIO CONSOLIDATED REPORT */}
        <div className="relative group rounded-2xl bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border-2 border-primary-mint/40 hover:border-primary-mint p-6 shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary-mint/15 text-primary-mint font-bold uppercase tracking-wider flex items-center gap-1.5 border border-primary-mint/30 shadow-sm">
                <Sparkles size={13} /> Flagship Deep Audit
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {positions.length} Total Positions
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-primary-mint transition">
                Portfolio Consolidated Audit Report
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 leading-relaxed">
                The most powerful and comprehensive multi-tier data dump in BunBau. Rolls up all institutions, accounts, cash reserves, equities, options, and fixed income. Designed for human audit and machine reconciliation mirroring BunBau&apos;s UX containers.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>Level 1: Global Portfolio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>Level 2: Institution Roll-up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>Level 3: Account Balances</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>Level 4: Granular Positions</span>
              </div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setIsReconModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200/80 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <Scale size={15} /> Run Live Reconciliation
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadConsolidatedCsv}
                title="Direct CSV Download"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5"
              >
                <Download size={15} /> CSV
              </button>

              <button
                onClick={handleOpenConsolidatedPreview}
                className="px-4 py-2 text-xs font-bold text-white bg-primary-mint hover:bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Eye size={15} /> Preview Report
              </button>
            </div>
          </div>
        </div>

        {/* TILE 2: INDIVIDUAL & FILTERED ACCOUNT REPORT */}
        <div className="relative group rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-secondary-violet/60 p-6 shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary-violet/15 text-secondary-violet font-bold uppercase tracking-wider flex items-center gap-1.5 border border-secondary-violet/30 shadow-sm">
                <Building2 size={13} /> Custom Account Scope
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {effectiveAccounts.length} Connected Accounts
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-secondary-violet transition">
                Individual & Filtered Account Report
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 leading-relaxed">
                Scope your audit to specific institutions (Fidelity, WeBull, Schwab) and selected accounts. Select accounts hierarchically to generate targeted reports and CSV exports.
              </p>
            </div>

            {/* Hierarchical Selector Preview Badge */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-gray-500">Available Scope:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {institutions.join(', ') || 'WeBull'} ({effectiveAccounts.length} accounts)
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Interactive multi-account selector
            </span>
            <button
              onClick={() => setIsSelectionModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-secondary-violet bg-secondary-violet/10 hover:bg-secondary-violet/20 border border-secondary-violet/30 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Layers size={15} />
              Select Accounts
            </button>
          </div>
        </div>

        {/* TILE 3: ASSET CLASS & YIELD DRILLDOWN */}
        <div className="relative group rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-500/60 p-6 shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 shadow-sm">
                <PieChart size={13} /> Asset & Yield Breakdown
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {totalApy.toFixed(2)}% Blended APY
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-blue-500 transition">
                Asset Allocation & Fixed Income Yield Ledger
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 leading-relaxed">
                Mirrors the Cash Manager and Maturity Calendar drilldowns. Detailed breakdowns of liquid cash, sweep funds, equities market value, CDs, and Treasuries with stated yields.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">Cash, Stocks, CDs & Treasuries</span>
            <button
              onClick={handleOpenAssetClassReport}
              className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl transition flex items-center gap-1.5"
            >
              <Eye size={15} /> Preview Ledger
            </button>
          </div>
        </div>

        {/* TILE 4: OPTIONS & COLLATERAL EXPOSURE */}
        <div className="relative group rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-primary-amber/60 p-6 shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary-amber/15 text-primary-amber font-bold uppercase tracking-wider flex items-center gap-1.5 border border-primary-amber/30 shadow-sm">
                <ShieldAlert size={13} /> Options & Collateral Exposure
              </span>
              <span className="text-xs text-gray-400 font-mono">
                ${fmt(cash.cspReserve)} Locked
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-primary-amber transition">
                Active Options & Collateral Exposure Ledger
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 leading-relaxed">
                Audits all active Cash-Secured Puts and Covered Calls. Tracks locked cash reserves, stock collateral backing, strike moneyness, and chronological expiration schedules.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">CSPs & Covered Calls Ledger</span>
            <button
              onClick={handleOpenOptionsReport}
              className="px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl transition flex items-center gap-1.5"
            >
              <Eye size={15} /> Preview Options Ledger
            </button>
          </div>
        </div>
      </div>

      {/* ACCOUNT SELECTION POP-UP MODAL (REPLACES INLINE BOTTOM APPLET) */}
      <AccountSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        accounts={effectiveAccounts}
        positions={positions}
        onPreviewReport={handlePreviewFilteredReport}
        isSidebarExpanded={isSidebarExpanded}
      />

      {/* REPORT PREVIEW MODAL */}
      <ReportPreviewModal
        isOpen={!!activePreviewReport}
        onClose={() => setActivePreviewReport(null)}
        report={activePreviewReport}
        isSidebarExpanded={isSidebarExpanded}
        onRunReconciliation={() => {
          setActivePreviewReport(null);
          setIsReconModalOpen(true);
        }}
      />

      {/* STATEMENT RECONCILIATION AUDIT MODAL */}
      <ReconciliationAuditModal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        accounts={effectiveAccounts}
        positions={positions}
        institutions={institutions}
        isSidebarExpanded={isSidebarExpanded}
      />
    </div>
  );
}
