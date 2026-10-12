'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  Download,
  Search,
  FileSpreadsheet,
  Layers,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { ConsolidatedPortfolioReport } from '../../lib/reports/consolidatedReport';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { generateConsolidatedReportCsv, downloadCsvFile } from '../../lib/reports/csvExporter';
import { SmartTable } from '../common/SmartTable';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ConsolidatedPortfolioReport | null;
  onRunReconciliation?: () => void;
  isSidebarExpanded?: boolean;
}

export function ReportPreviewModal({
  isOpen,
  onClose,
  report,
  onRunReconciliation,
  isSidebarExpanded = true,
}: ReportPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'visual' | 'table'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true,
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !report || !mounted) return null;

  const handleZoomIn = () => setZoomScale((s) => Math.min(1.5, Math.round((s + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomScale((s) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoomScale(1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = generateConsolidatedReportCsv(report);
    const safeTitle = report.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fileName = `${safeTitle}_${report.metadata.asOfDate}.csv`;
    downloadCsvFile(csvContent, fileName);
  };

  const handleCopyCsv = () => {
    const csvContent = generateConsolidatedReportCsv(report);
    navigator.clipboard.writeText(csvContent);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const q = searchQuery.toLowerCase().trim();

  // Search filtering across sections
  const filteredRecon = report.section1_ExecutiveSummary.accountsReconciliation.filter(
    (a) =>
      !q ||
      a.institution.toLowerCase().includes(q) ||
      a.accountMasked.toLowerCase().includes(q) ||
      a.accountType.toLowerCase().includes(q)
  );

  const filteredCash = report.section2_CashManager.rows.filter(
    (r) =>
      !q ||
      r.institution.toLowerCase().includes(q) ||
      r.accountMasked.toLowerCase().includes(q) ||
      r.coreFund.toLowerCase().includes(q)
  );

  const filteredEquities = report.section3_Equities.rows.filter(
    (e) =>
      !q ||
      e.symbol.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.institution.toLowerCase().includes(q) ||
      e.accountMasked.toLowerCase().includes(q)
  );

  const filteredInstitutionGroups = (report.section3_Equities.institutionGroups || [])
    .map((inst) => {
      const matchingAccounts = inst.accounts
        .map((acc) => {
          const matchingRows = acc.rows.filter(
            (e) =>
              !q ||
              e.symbol.toLowerCase().includes(q) ||
              e.name.toLowerCase().includes(q) ||
              acc.institution.toLowerCase().includes(q) ||
              acc.accountMasked.toLowerCase().includes(q)
          );
          return {
            ...acc,
            rows: matchingRows,
          };
        })
        .filter((acc) => acc.rows.length > 0);

      return {
        ...inst,
        accounts: matchingAccounts,
      };
    })
    .filter((inst) => inst.accounts.length > 0);

  const filteredOptions = report.section4_ActiveOptions.rows.filter(
    (o) =>
      !q ||
      o.symbol.toLowerCase().includes(q) ||
      o.underlying.toLowerCase().includes(q) ||
      o.institution.toLowerCase().includes(q) ||
      o.accountMasked.toLowerCase().includes(q)
  );

  const filteredFixedIncome = report.section5_FixedIncome.rows.filter(
    (f) =>
      !q ||
      f.symbol.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.institution.toLowerCase().includes(q) ||
      f.accountMasked.toLowerCase().includes(q)
  );

  const cryptoRows = report.section6_DigitalCurrency?.rows || [];
  const filteredCrypto = cryptoRows.filter(
    (c) =>
      !q ||
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.institution.toLowerCase().includes(q) ||
      c.accountMasked.toLowerCase().includes(q)
  );

  const flatRows = report.section7_MasterFlatLedger || report.section6_MasterFlatLedger || [];
  const filteredFlatLedger = flatRows.filter(
    (row) =>
      !q ||
      row.symbol.toLowerCase().includes(q) ||
      row.name.toLowerCase().includes(q) ||
      row.institution.toLowerCase().includes(q) ||
      row.accountMasked.toLowerCase().includes(q) ||
      row.assetClass.toLowerCase().includes(q)
  );

  const modalContent = (
    <div
      ref={modalRef}
      className={`fixed inset-y-0 right-0 ${
        isFullscreen
          ? 'left-0 z-[100] p-0'
          : isSidebarExpanded
            ? 'left-0 md:left-64 z-40 p-2 sm:p-4 md:p-6'
            : 'left-0 md:left-20 z-40 p-2 sm:p-4 md:p-6'
      } flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) onClose();
      }}
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-full rounded-none' : 'max-w-7xl h-[94vh] rounded-2xl'
        } flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300`}
      >
        {/* Top Control Header & Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-mint/15 text-primary-mint flex items-center justify-center font-bold">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {report.metadata.title}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-mint/10 text-primary-mint font-semibold border border-primary-mint/20">
                  {report.metadata.mode} Mode
                </span>
                {report.section1_ExecutiveSummary.isReconciled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Reconciled
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} /> Variance Identified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                As of: {report.metadata.asOfDate} • Generated: {new Date(report.metadata.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Standard Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* View Switcher */}
            <div className="flex items-center bg-gray-200 dark:bg-slate-800 rounded-lg p-1 text-xs font-semibold">
              <button
                onClick={() => setActiveView('visual')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  activeView === 'visual'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Layers size={14} /> Hierarchical View
              </button>
              <button
                onClick={() => setActiveView('table')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  activeView === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <TableIcon size={14} /> Raw CSV Grid
              </button>
            </div>

            {/* Zoom Controls */}
            <AccessibilityZoomBar
              scale={zoomScale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              minScale={0.7}
              maxScale={1.5}
              testIdPrefix="report-preview"
            />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Copy CSV */}
            <button
              onClick={handleCopyCsv}
              title="Copy CSV to clipboard"
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5"
            >
              {copiedToast ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copiedToast ? 'Copied!' : 'Copy'}
            </button>

            {/* Download CSV Action Button */}
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-1.5 text-xs font-bold text-white bg-primary-mint hover:bg-emerald-600 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Download size={14} /> Download CSV
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Sub-bar */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by symbol, account, or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-mint/50"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Net Worth:{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                ${fmt(report.section1_ExecutiveSummary.computedNetWorth)}
              </strong>
            </span>
            <span>
              Net Free Cash:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                ${fmt(report.section1_ExecutiveSummary.netFreeCash)}
              </strong>
            </span>
            <span>
              Portfolio Blended APY:{' '}
              <strong className="text-secondary-violet font-mono">
                {report.section1_ExecutiveSummary.blendedApy.toFixed(2)}%
              </strong>
            </span>
            <span>
              Yield-bearing APY:{' '}
              <strong className="text-teal-500 font-mono">
                {report.section1_ExecutiveSummary.yieldBearingApy.toFixed(2)}%
              </strong>
            </span>
            {onRunReconciliation && (
              <button
                onClick={onRunReconciliation}
                className="text-xs text-primary-mint font-bold hover:underline ml-2"
              >
                Reconcile Statement →
              </button>
            )}
          </div>
        </div>

        {/* Scalable Report Content Body */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-slate-950/40">
          <div
            style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}
            className="transition-transform duration-150 space-y-6"
          >
            {activeView === 'visual' ? (
              <>
                {/* SECTION 1: EXECUTIVE SUMMARY & RECONCILIATION */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec1')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec1 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 1: Portfolio Executive Summary & Net Worth Reconciliation
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary-mint">
                      ${fmt(report.section1_ExecutiveSummary.computedNetWorth)}
                    </span>
                  </div>

                  {expandedSections.sec1 && (
                    <div className="pt-4 space-y-4">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                          <span className="text-xs text-gray-500">Stated Balance</span>
                          <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                            ${fmt(report.section1_ExecutiveSummary.statedNetWorth)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                          <span className="text-xs text-gray-500">Computed Net Worth</span>
                          <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                            ${fmt(report.section1_ExecutiveSummary.computedNetWorth)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                          <span className="text-xs text-gray-500">Locked CSP Collateral</span>
                          <p className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                            -${fmt(report.section1_ExecutiveSummary.cspReserve)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                          <span className="text-xs text-gray-500">Global Net Free Cash</span>
                          <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ${fmt(report.section1_ExecutiveSummary.netFreeCash)}
                          </p>
                        </div>
                      </div>

                      {/* Account Reconciliation Table */}
                      <div className="overflow-x-auto">
                        <SmartTable<(typeof filteredRecon)[number]>
                          tableId="report-account-reconciliation"
                          title="Section 1: Account Reconciliation"
                          infoDescription="Stated statement total versus computed total per account, with the asset-class split."
                          density="compact"
                          headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                          rows={filteredRecon}
                          columns={[
                            { key: 'institution', label: 'Institution', render: (a) => <span className="font-semibold">{a.institution}</span> },
                            { key: 'accountMasked', label: 'Account #', render: (a) => <span className="font-mono">{a.accountMasked}</span> },
                            { key: 'accountType', label: 'Type', render: (a) => <span className="text-gray-500">{a.accountType}</span> },
                            { key: 'statedTotal', label: 'Stated Total', align: 'right', render: (a) => `$${fmt(a.statedTotal)}` },
                            { key: 'computedTotal', label: 'Computed Total', align: 'right', render: (a) => <span className="font-bold">${fmt(a.computedTotal)}</span> },
                            { key: 'variance', label: 'Variance', align: 'right', render: (a) => (
                              <span className={a.isReconciled ? 'text-emerald-600' : 'text-amber-600 font-bold'}>
                                {a.variance >= 0 ? `+$${fmt(a.variance)}` : `-$${fmt(Math.abs(a.variance))}`}
                              </span>
                            ) },
                            { key: 'isReconciled', label: 'Status', align: 'center', sortValue: (a) => (a.isReconciled ? 'Reconciled' : 'Mismatch'), render: (a) => a.isReconciled ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">✓ Reconciled</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">⚠ Mismatch</span>
                            ) },
                            { key: 'cashValue', label: 'Cash', align: 'right', render: (a) => `$${fmt(a.cashValue)}` },
                            { key: 'equitiesValue', label: 'Equities', align: 'right', render: (a) => `$${fmt(a.equitiesValue)}` },
                            { key: 'optionsValue', label: 'Options Net', align: 'right', render: (a) => `$${fmt(a.optionsValue)}` },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: CASH MANAGER */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec2')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec2 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 2: Cash Manager & Liquid Reserves Ledger
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      ${fmt(report.section2_CashManager.totalNetFreeCash)} Free Cash
                    </span>
                  </div>

                  {expandedSections.sec2 && (
                    <div className="pt-4 overflow-x-auto">
                      <SmartTable<(typeof filteredCash)[number]>
                        tableId="report-cash-manager"
                        title="Section 2: Cash Manager & Liquid Reserves Ledger"
                        infoDescription="Raw cash per account, cash locked as Cash-Secured Put collateral, and the resulting Net Free Cash."
                        density="compact"
                        headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                        rows={filteredCash}
                        columns={[
                          { key: 'institution', label: 'Institution', render: (r) => <span className="font-semibold">{r.institution}</span> },
                          { key: 'accountMasked', label: 'Account #', render: (r) => <span className="font-mono">{r.accountMasked}</span> },
                          { key: 'accountType', label: 'Type', render: (r) => <span className="text-gray-500">{r.accountType}</span> },
                          { key: 'coreFund', label: 'Core / Sweep Fund', render: (r) => <span className="font-mono text-gray-500">{r.coreFund}</span> },
                          { key: 'rawCash', label: 'Raw Cash', align: 'right', render: (r) => `$${fmt(r.rawCash)}` },
                          { key: 'cspReserve', label: 'Locked CSP Collateral', align: 'right', sortValue: (r) => -r.cspReserve, render: (r) => <span className="text-amber-600 dark:text-amber-400">{r.cspReserve > 0 ? `-$${fmt(r.cspReserve)}` : '$0.00'}</span> },
                          { key: 'netFreeCash', label: 'Global Net Free Cash', align: 'right', render: (r) => <span className="font-bold text-emerald-600 dark:text-emerald-400">${fmt(r.netFreeCash)}</span> },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 3: EQUITIES & COVERED CALL ALLOCATION */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec3')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec3 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 3: Equities & Covered Call Allocation Ledger (By Institution & Account)
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary-mint">
                      ${fmt(report.section3_Equities.totalEquitiesValue)} ({report.section3_Equities.totalShares.toFixed(2)} shs)
                    </span>
                  </div>

                  {expandedSections.sec3 && (
                    <div className="pt-4 space-y-6">
                      {/* Top Section 3 Aggregate KPI Summary */}
                      <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500">
                            Total Aggregated Equity:{' '}
                            <strong className="text-slate-900 dark:text-white font-mono font-bold">
                              ${fmt(report.section3_Equities.totalEquitiesValue)}
                            </strong>
                          </span>
                          <span className="text-gray-500">
                            Total Shares Held:{' '}
                            <strong className="text-slate-900 dark:text-white font-mono font-bold">
                              {fmt(report.section3_Equities.totalShares)}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                            {report.section3_Equities.uniqueInstitutions} Institutions
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                            {report.section3_Equities.uniqueHoldingAccounts} Accounts
                          </span>
                        </div>
                      </div>

                      {/* Grouped by Institution */}
                      {filteredInstitutionGroups.map((inst, iIdx) => (
                        <div
                          key={iIdx}
                          className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-gray-50/30 dark:bg-slate-900/40 space-y-4"
                        >
                          {/* Institution Header */}
                          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-700 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                {inst.institution}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-mint/10 text-primary-mint font-semibold">
                                {inst.accounts.length} Accounts
                              </span>
                            </div>
                            <div className="text-xs font-mono">
                              <span className="text-gray-500">Institution Total: </span>
                              <strong className="text-slate-900 dark:text-white font-bold">
                                ${fmt(inst.totalInstitutionValue)}
                              </strong>
                            </div>
                          </div>

                          {/* Grouped by Account */}
                          {inst.accounts.map((acc, aIdx) => (
                            <div
                              key={aIdx}
                              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xs"
                            >
                              {/* Account Subheader & Section 1 Anchor */}
                              <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {acc.institution} - {acc.accountType} ({acc.accountMasked})
                                  </span>
                                  <span className="text-[10px] text-gray-500">({acc.positionCount} positions)</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono">
                                    Account Equity:{' '}
                                    <strong className="text-slate-900 dark:text-white font-bold">
                                      ${fmt(acc.totalAccountValue)}
                                    </strong>
                                  </span>
                                  {acc.isAnchorReconciled ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Matches Section 1 (${fmt(acc.section1AnchorValue)})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1">
                                      <AlertTriangle size={11} /> Variance vs Section 1 (${fmt(acc.section1AnchorValue)})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Table of Positions */}
                              <div className="overflow-x-auto">
                                <SmartTable<(typeof acc.rows)[number]>
                                  tableId={`report-equities-${acc.institution}-${acc.accountMasked}`.replace(/[^A-Za-z0-9-]/g, '-')}
                                  title={`Equities: ${acc.institution} ${acc.accountMasked}`}
                                  infoDescription="Equity positions for this account. Sorting reorders positions only; the account subtotal row stays pinned and equals the Section 1 anchor."
                                  density="compact"
                                  headClassName="bg-gray-50/50 dark:bg-slate-800/40 text-gray-500 uppercase text-[11px] font-mono"
                                  rows={acc.rows}
                                  columns={[
                                    { key: 'symbol', label: 'Symbol', render: (e) => <span className="font-mono font-bold">{e.symbol}</span> },
                                    { key: 'name', label: 'Description', render: (e) => <span className="text-gray-500 truncate max-w-[150px] inline-block">{e.name}</span> },
                                    { key: 'quantity', label: 'Shares', align: 'right', render: (e) => <span className="font-bold">{e.quantity.toFixed(4)}</span> },
                                    { key: 'currentPrice', label: 'Price', align: 'right', render: (e) => `$${fmt(e.currentPrice)}` },
                                    { key: 'marketValue', label: 'Market Value', align: 'right', render: (e) => <span className="font-bold">${fmt(e.marketValue)}</span> },
                                    { key: 'costBasis', label: 'Cost Basis', align: 'right', sortValue: (e) => e.costBasis || 0, render: (e) => `$${fmt(e.costBasis || 0)}` },
                                    { key: 'unrealizedPnl', label: 'Unrealized P&L', align: 'right', sortValue: (e) => e.unrealizedPnl ?? 0, render: (e) => {
                                      const pnl = e.unrealizedPnl ?? 0;
                                      return <span className={pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}>{pnl >= 0 ? `+$${fmt(pnl)}` : `-$${fmt(Math.abs(pnl))}`}</span>;
                                    } },
                                    { key: 'percentOfAccount', label: '% Account', align: 'right', render: (e) => <span className="text-blue-600">{e.percentOfAccount.toFixed(2)}%</span> },
                                    { key: 'ccStatus', label: 'Covered Call Status', align: 'center', render: (e) => (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.isCovered ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : e.isPartial ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{e.ccStatus}</span>
                                    ) },
                                  ]}
                                  footerRows={
                                    <tr className="bg-gray-100/70 dark:bg-slate-800/70 font-mono font-bold text-xs border-t border-gray-200 dark:border-slate-700">
                                      <td colSpan={2} className="py-2 px-3 text-slate-900 dark:text-white">
                                        Subtotal: {acc.institution} {acc.accountMasked} ({acc.positionCount} pos)
                                      </td>
                                      <td className="py-2 px-3 text-right">{acc.totalAccountShares.toFixed(4)}</td>
                                      <td className="py-2 px-3 text-right text-gray-400">—</td>
                                      <td className="py-2 px-3 text-right text-slate-900 dark:text-white">${fmt(acc.totalAccountValue)}</td>
                                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">${fmt(acc.totalAccountCostBasis)}</td>
                                      <td className={`py-2 px-3 text-right ${acc.totalAccountUnrealizedPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {acc.totalAccountUnrealizedPnl >= 0 ? `+$${fmt(acc.totalAccountUnrealizedPnl)}` : `-$${fmt(Math.abs(acc.totalAccountUnrealizedPnl))}`}
                                      </td>
                                      <td className="py-2 px-3 text-right text-blue-600">100.00%</td>
                                      <td className="py-2 px-3 text-center text-[10px] text-emerald-600 dark:text-emerald-400">{acc.isAnchorReconciled ? '✓ Reconciled' : '⚠ Variance'}</td>
                                    </tr>
                                  }
                                />
                              </div>
                            </div>
                          ))}

                          {/* Institution Subtotal Banner */}
                          <div className="p-2.5 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-between text-xs font-mono font-bold">
                            <span className="text-gray-600 dark:text-gray-300">
                              Institution Subtotal: {inst.institution} ({inst.accounts.length} accounts, {inst.positionCount} positions)
                            </span>
                            <div className="flex items-center gap-4">
                              <span>Shares: {inst.totalInstitutionShares.toFixed(4)}</span>
                              <span className="text-primary-mint">${fmt(inst.totalInstitutionValue)}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Global Equities Summary Banner */}
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-emerald-800 dark:text-emerald-300">
                          Global Equities Reconciled Total ({report.section3_Equities.uniqueInstitutions} Institutions, {report.section3_Equities.uniqueHoldingAccounts} Accounts)
                        </span>
                        <div className="flex items-center gap-4 text-emerald-800 dark:text-emerald-300">
                          <span>Total Shares: {report.section3_Equities.totalShares.toFixed(4)}</span>
                          <span className="text-sm font-extrabold">${fmt(report.section3_Equities.totalEquitiesValue)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 4: ACTIVE OPTIONS */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec4')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec4 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 4: Active Options & Collateral Exposure Ledger
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary-amber">
                      ${fmt(report.section4_ActiveOptions.totalCollateralLocked)} Collateral Locked
                    </span>
                  </div>

                  {expandedSections.sec4 && (
                    <div className="pt-4 overflow-x-auto">
                      <SmartTable<(typeof filteredOptions)[number]>
                        tableId="report-active-options"
                        title="Section 4: Active Options & Collateral Exposure Ledger"
                        infoDescription="Open Cash-Secured Puts and Covered Calls with collateral locked and premium."
                        density="compact"
                        headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                        rows={filteredOptions}
                        columns={[
                          { key: 'underlying', label: 'Underlying', render: (o) => <span className="font-mono font-bold">{o.underlying}</span> },
                          { key: 'symbol', label: 'Option Symbol', render: (o) => <span className="font-mono">{o.symbol}</span> },
                          { key: 'right', label: 'Right', render: (o) => (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.right === 'CALL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>{o.right}</span>
                          ) },
                          { key: 'strike', label: 'Strike', align: 'right', render: (o) => <span className="font-bold">${fmt(o.strike)}</span> },
                          { key: 'contracts', label: 'Contracts', align: 'right' },
                          { key: 'expiry', label: 'Expiration', render: (o) => <span className="font-mono">{o.expiry || 'N/A'}</span> },
                          { key: 'institution', label: 'Institution', render: (o) => <span className="font-semibold text-slate-800 dark:text-slate-200">{o.institution}</span> },
                          { key: 'accountMasked', label: 'Account #', render: (o) => <span className="font-mono">{o.accountMasked}</span> },
                          { key: 'collateralLocked', label: 'Collateral Locked', align: 'right', render: (o) => <span className="font-bold text-amber-600">${fmt(o.collateralLocked)}</span> },
                          { key: 'premiumReceived', label: 'Premium / Net', align: 'right', render: (o) => `$${fmt(o.premiumReceived)}` },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 5: FIXED INCOME */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec5')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec5 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 5: Fixed Income & Yield Schedule
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-secondary-violet">
                      ${fmt(report.section5_FixedIncome.totalYieldValue)} ({report.section5_FixedIncome.blendedApy.toFixed(2)}% APY)
                    </span>
                  </div>

                  {expandedSections.sec5 && (
                    <div className="pt-4 overflow-x-auto">
                      <SmartTable<(typeof filteredFixedIncome)[number]>
                        tableId="report-fixed-income"
                        title="Section 5: Fixed Income & Yield Schedule"
                        infoDescription="CDs, Treasuries and bond funds with stated APY, estimated annual income and maturity."
                        density="compact"
                        headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                        rows={filteredFixedIncome}
                        columns={[
                          { key: 'symbol', label: 'Symbol', render: (fi) => <span className="font-mono font-bold">{fi.symbol}</span> },
                          { key: 'name', label: 'Asset Name', render: (fi) => <span className="text-gray-500">{fi.name}</span> },
                          { key: 'category', label: 'Category', render: (fi) => <span className="text-gray-500">{fi.category}</span> },
                          { key: 'institution', label: 'Institution', render: (fi) => <span className="font-semibold text-slate-800 dark:text-slate-200">{fi.institution}</span> },
                          { key: 'accountMasked', label: 'Account #', render: (fi) => <span className="font-mono">{fi.accountMasked}</span> },
                          { key: 'marketValue', label: 'Market Value', align: 'right', render: (fi) => <span className="font-bold">${fmt(fi.marketValue)}</span> },
                          { key: 'apy', label: 'Stated APY%', align: 'right', render: (fi) => <span className="text-emerald-600 font-bold">{fi.apy.toFixed(2)}%</span> },
                          { key: 'annualIncome', label: 'Est. Annual Income', align: 'right', render: (fi) => `$${fmt(fi.annualIncome)}` },
                          { key: 'maturityDate', label: 'Maturity Date', render: (fi) => <span className="font-mono">{fi.maturityDate || 'N/A'}</span> },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 6: DIGITAL CURRENCY & CRYPTO ASSETS */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                  <div
                    onClick={() => toggleSection('sec6')}
                    className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-slate-800 pb-3"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.sec6 ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Section 6: Digital Currency & Crypto Assets Ledger
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-500">
                      ${fmt(report.section6_DigitalCurrency?.totalCryptoValue || 0)} ({filteredCrypto.length} Positions)
                    </span>
                  </div>

                  {expandedSections.sec6 && (
                    <div className="pt-4 overflow-x-auto">
                      <SmartTable<(typeof filteredCrypto)[number]>
                        tableId="report-digital-currency"
                        title="Section 6: Digital Currency & Crypto Assets Ledger"
                        infoDescription="Direct cryptocurrency and digital token positions held across connected institutions."
                        density="compact"
                        headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase"
                        rows={filteredCrypto}
                        columns={[
                          { key: 'symbol', label: 'Symbol', render: (c) => <span className="font-mono font-bold">{c.symbol}</span> },
                          { key: 'name', label: 'Asset Name', render: (c) => <span className="text-gray-500 truncate max-w-[140px] inline-block">{c.name}</span> },
                          { key: 'quantity', label: 'Quantity', align: 'right', render: (c) => <span className="font-mono font-bold">{c.quantity < 1 ? c.quantity.toFixed(8).replace(/\.?0+$/, '') : c.quantity.toFixed(4)}</span> },
                          { key: 'currentPrice', label: 'Price', align: 'right', render: (c) => `$${fmt(c.currentPrice)}` },
                          { key: 'marketValue', label: 'Market Value', align: 'right', render: (c) => <span className="font-bold">${fmt(c.marketValue)}</span> },
                          { key: 'costBasis', label: 'Cost Basis', align: 'right', render: (c) => (c.costBasis > 0 ? `$${fmt(c.costBasis)}` : 'N/A') },
                          { key: 'unrealizedPnl', label: 'Unrealized P&L', align: 'right', render: (c) => (
                            <span className={`font-mono font-bold ${c.unrealizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {c.unrealizedPnl >= 0 ? '+' : ''}${fmt(c.unrealizedPnl)} ({c.unrealizedPnl >= 0 ? '+' : ''}{c.unrealizedPnlPct.toFixed(1)}%)
                            </span>
                          ) },
                          { key: 'institution', label: 'Institution', render: (c) => <span className="font-semibold text-slate-800 dark:text-slate-200">{c.institution}</span> },
                          { key: 'accountMasked', label: 'Account #', render: (c) => <span className="font-mono">{c.accountMasked}</span> },
                          { key: 'percentOfPortfolio', label: '% Portfolio', align: 'right', render: (c) => `${c.percentOfPortfolio.toFixed(1)}%` },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* TABULAR RAW CSV GRID (SECTION 7 FULL AUDIT DUMP) */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Section 7: Comprehensive Flat Master Audit Ledger ({filteredFlatLedger.length} rows)
                  </h4>
                  <span className="text-xs text-gray-400">RFC 4180 Columnar Format</span>
                </div>

                <div className="pt-4 overflow-x-auto">
                  <SmartTable<(typeof filteredFlatLedger)[number]>
                    tableId="report-flat-ledger"
                    title="Section 7: Comprehensive Flat Master Audit Ledger"
                    infoDescription="Every position in the report as one flat, Excel-ready ledger (same rows as the CSV export)."
                    density="compact"
                    headClassName="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase font-mono text-[11px]"
                    rows={filteredFlatLedger}
                    columns={[
                      { key: 'institution', label: 'Institution', render: (r) => <span className="font-semibold">{r.institution}</span> },
                      { key: 'accountMasked', label: 'Account #', render: (r) => <span className="font-mono">{r.accountMasked}</span> },
                      { key: 'accountType', label: 'Type', render: (r) => <span className="text-gray-500">{r.accountType}</span> },
                      { key: 'assetClass', label: 'Asset Class', render: (r) => (<span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{r.assetClass}</span>) },
                      { key: 'symbol', label: 'Symbol', render: (r) => <span className="font-mono font-bold">{r.symbol}</span> },
                      { key: 'name', label: 'Description', render: (r) => <span className="text-gray-500 truncate max-w-[120px] inline-block">{r.name}</span> },
                      { key: 'quantity', label: 'Quantity', align: 'right', render: (r) => <span className="font-bold">{r.quantity.toFixed(4)}</span> },
                      { key: 'currentPrice', label: 'Price', align: 'right', render: (r) => `$${fmt(r.currentPrice)}` },
                      { key: 'marketValue', label: 'Market Value', align: 'right', render: (r) => <span className="font-bold">${fmt(r.marketValue)}</span> },
                      { key: 'costBasis', label: 'Cost Basis', align: 'right', render: (r) => <span className="text-gray-500">${fmt(r.costBasis)}</span> },
                      { key: 'apy', label: 'APY%', align: 'right', render: (r) => (r.apy !== undefined ? `${r.apy.toFixed(2)}%` : '—') },
                      { key: 'maturity', label: 'Maturity / Expiry', sortValue: (r) => r.maturityDate || r.optionExpiry, render: (r) => <span className="font-mono text-gray-500">{r.maturityDate || r.optionExpiry || '—'}</span> },
                      { key: 'optionStrike', label: 'Opt Strike', render: (r) => <span className="font-mono">{r.optionStrike !== undefined ? `$${fmt(r.optionStrike)}` : '—'}</span> },
                      { key: 'collateralLocked', label: 'Collateral', align: 'right', render: (r) => <span className="text-amber-600">{r.collateralLocked > 0 ? `$${fmt(r.collateralLocked)}` : '—'}</span> },
                      { key: 'coveredCallStatus', label: 'CC Status', render: (r) => <span className="text-xs text-gray-600 dark:text-gray-300">{r.coveredCallStatus}</span> },
                      { key: 'accountReconciliationStatus', label: 'Recon Status', align: 'center', sortValue: (r) => r.accountReconciliationStatus || 'Reconciled', render: (r) => (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.accountReconciliationStatus === 'Reconciled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                          {r.accountReconciliationStatus || 'Reconciled'}
                        </span>
                      ) },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
