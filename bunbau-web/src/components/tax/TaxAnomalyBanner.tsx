'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  BarChart2,
  LayoutGrid,
  X,
  FileText,
} from 'lucide-react';
import { MultiYearTaxComparison } from '../../lib/tax/models';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';

interface TaxAnomalyBannerProps {
  comparison: MultiYearTaxComparison;
  onNavigateToTab?: (tab: string, targetCardId?: string) => void;
}

interface StatutoryRuleMeta {
  ircSection: string;
  formReference: string;
  methodology: string;
  benchmarkLabel: string;
  benchmarkValue: number;
}

export function TaxAnomalyBanner({ comparison, onNavigateToTab }: TaxAnomalyBannerProps) {
  const anomalies = comparison.anomalies || [];

  // Level-1 Container UX State
  const [containerScale, setContainerScale] = useState<number>(1.0);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'opportunity' | 'warning' | 'info'>('all');
  const [containerViewMode, setContainerViewMode] = useState<'cards' | 'chart'>('cards');
  const [showContainerInfo, setShowContainerInfo] = useState<boolean>(false);
  const [containerCopied, setContainerCopied] = useState<boolean>(false);
  const [isContainerDetached, setIsContainerDetached] = useState<boolean>(false);

  // Level-2 Per-Box UX State
  const [boxScales, setBoxScales] = useState<Record<string, number>>({});
  const [boxInfoOpen, setBoxInfoOpen] = useState<Record<string, boolean>>({});
  const [boxChartOpen, setBoxChartOpen] = useState<Record<string, boolean>>({});
  const [boxCopied, setBoxCopied] = useState<Record<string, boolean>>({});
  const [detachedBoxId, setDetachedBoxId] = useState<string | null>(null);

  const resolveTarget = (a: { id: string; title: string; severity: string }): { tab: string; targetCardId?: string } => {
    const title = a.title.toLowerCase();
    const id = a.id.toLowerCase();

    if (title.includes('suspended passive') || id.includes('passive')) {
      return { tab: 'strategy', targetCardId: 'strategy-passive-loss' };
    }
    if (title.includes('capital loss') || id.includes('capital_loss')) {
      return { tab: 'strategy', targetCardId: 'strategy-options-loss' };
    }
    if (title.includes('safe harbor') || id.includes('safe_harbor') || id.includes('underpayment')) {
      return { tab: 'strategy', targetCardId: 'strategy-safe-harbor' };
    }
    if (title.includes('irmaa') || id.includes('irmaa')) {
      return { tab: 'lifecycle', targetCardId: 'lifecycle-irmaa' };
    }

    if (a.severity === 'opportunity') return { tab: 'strategy' };
    if (a.severity === 'warning') return { tab: 'lifecycle' };
    return { tab: 'comparison' };
  };

  // Extract dollar amount from anomaly title/description for visual chart comparison
  const extractDollarAmount = (text: string): number => {
    const match = text.match(/\$([0-9,]+)/);
    if (!match) return 25000;
    const parsed = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 25000;
  };

  const resolveStatutoryMeta = (a: { id: string; title: string; description: string; severity: string }): StatutoryRuleMeta => {
    const combined = `${a.id} ${a.title}`.toLowerCase();
    const amount = extractDollarAmount(`${a.title} ${a.description}`);

    if (combined.includes('capital') || combined.includes('loss shield')) {
      return {
        ircSection: 'IRC §1212(b) & §1211(b) — Indefinite Capital Loss Carryover',
        formReference: 'Form 1040 Schedule D (Line 16 & Line 21) + Capital Loss Carryover Worksheet',
        methodology:
          'Net short-term and long-term capital losses carry forward indefinitely to offset 100% of future realized capital gains plus up to $3,000/yr of ordinary income.',
        benchmarkLabel: 'Annual Ordinary Offset Cap ($3,000) vs Total Shield',
        benchmarkValue: Math.max(amount, 100000),
      };
    }
    if (combined.includes('passive') || combined.includes('rental')) {
      return {
        ircSection: 'IRC §469(a) & §469(g) — Passive Activity Loss Limitation & Disposition Release',
        formReference: 'Form 8582 (Line 16) & Schedule E Part I (Rental Real Estate)',
        methodology:
          'Passive rental losses suspended due to MAGI phaseout (> $150,000) are carried forward on Form 8582 to offset future passive rental net income or unlock 100% upon qualifying disposition.',
        benchmarkLabel: 'MAGI Phaseout Ceiling ($150,000)',
        benchmarkValue: 150000,
      };
    }
    if (combined.includes('safe harbor') || combined.includes('estimated')) {
      return {
        ircSection: 'IRC §6654(d)(1)(B) & CA R&TC §19136 — High-Earner Safe Harbor',
        formReference: 'Form 1040 Line 24 (Total Tax) & Form 2210 Underpayment Shield',
        methodology:
          'Taxpayers with prior-year AGI > $150,000 must remit 110% of prior-year total tax liability via W-2 withholding and quarterly estimated payments to eliminate underpayment penalties.',
        benchmarkLabel: '100% Prior-Year Tax Baseline',
        benchmarkValue: Math.round(amount / 1.1),
      };
    }
    if (combined.includes('irmaa') || combined.includes('medicare')) {
      return {
        ircSection: 'Social Security Act §1839(i) — 2-Year Lookback MAGI Surcharge Cliff',
        formReference: 'Form 1040 Line 11 (AGI) + Line 2a (Tax-Exempt Interest)',
        methodology:
          'Medicare Part B and Part D IRMAA surcharges use a strict cliff-based formula on 2-year prior MAGI ($212,000 MFJ Tier 1 threshold). Exceeding the cliff by $1 triggers the full annual surcharge.',
        benchmarkLabel: 'MFJ Tier 1 MAGI Cliff ($212,000)',
        benchmarkValue: 212000,
      };
    }

    return {
      ircSection: 'IRC Fiduciary Compliance & Multi-Year Return Reconciliation',
      formReference: 'Form 1040 / CA Form 540 Statutory Audit',
      methodology:
        'Automated statutory variance check comparing current tax year schedules against historical baseline and forward statutory thresholds.',
      benchmarkLabel: 'Statutory Reference Benchmark',
      benchmarkValue: Math.max(amount * 1.25, 50000),
    };
  };

  const filteredAnomalies = useMemo(() => {
    if (selectedSeverity === 'all') return anomalies;
    return anomalies.filter((a) => a.severity === selectedSeverity);
  }, [anomalies, selectedSeverity]);

  const counts = useMemo(() => {
    return {
      all: anomalies.length,
      opportunity: anomalies.filter((a) => a.severity === 'opportunity').length,
      warning: anomalies.filter((a) => a.severity === 'warning').length,
      info: anomalies.filter((a) => a.severity === 'info').length,
    };
  }, [anomalies]);

  const setBoxScale = (id: string, updater: (prev: number) => number) => {
    setBoxScales((prev) => {
      const current = prev[id] ?? 1.0;
      const next = Math.min(1.5, Math.max(0.7, Math.round(updater(current) * 100) / 100));
      return { ...prev, [id]: next };
    });
  };

  const handleCopyAll = async () => {
    const lines = [
      `=== BUNBAU FIDUCIARY ADVISORIES, TAX SHIELDS & CLIFF ALERTS (${filteredAnomalies.length} ITEMS) ===`,
      ...filteredAnomalies.map((a, idx) => {
        const meta = resolveStatutoryMeta(a);
        return [
          `${idx + 1}. [${a.severity.toUpperCase()}] ${a.title}`,
          `   • Analysis: ${a.description}`,
          `   • Fiduciary Action: ${a.actionAdvice}`,
          `   • Statutory Authority: ${meta.ircSection} (${meta.formReference})`,
        ].join('\n');
      }),
      `========================================================================================`,
    ].join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines);
    }
    setContainerCopied(true);
    setTimeout(() => setContainerCopied(false), 2000);
  };

  const handleCopySingleBox = async (a: (typeof anomalies)[number]) => {
    const meta = resolveStatutoryMeta(a);
    const text = [
      `=== [${a.severity.toUpperCase()}] ${a.title} ===`,
      `Description: ${a.description}`,
      `Fiduciary Action Item: ${a.actionAdvice}`,
      `Statutory Authority: ${meta.ircSection}`,
      `IRS/CA Form Reference: ${meta.formReference}`,
      `Methodology: ${meta.methodology}`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setBoxCopied((prev) => ({ ...prev, [a.id]: true }));
    setTimeout(() => {
      setBoxCopied((prev) => ({ ...prev, [a.id]: false }));
    }, 2000);
  };

  const triggerDownload = (filename: string, content: string, mime = 'text/csv;charset=utf-8;') => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback no-op in headless test environments
    }
  };

  const handleDownloadAllCsv = () => {
    const header = ['ID', 'Severity', 'Title', 'DollarImpact', 'Description', 'ActionAdvice', 'IRCSection', 'FormReference'];
    const rows = filteredAnomalies.map((a) => {
      const meta = resolveStatutoryMeta(a);
      const impact = extractDollarAmount(`${a.title} ${a.description}`);
      return [
        a.id,
        a.severity.toUpperCase(),
        `"${a.title.replace(/"/g, '""')}"`,
        impact,
        `"${a.description.replace(/"/g, '""')}"`,
        `"${a.actionAdvice.replace(/"/g, '""')}"`,
        `"${meta.ircSection.replace(/"/g, '""')}"`,
        `"${meta.formReference.replace(/"/g, '""')}"`,
      ].join(',');
    });
    triggerDownload('BunBau_Fiduciary_Tax_Advisories.csv', [header.join(','), ...rows].join('\n'));
  };

  const handleDownloadSingleBox = (a: (typeof anomalies)[number]) => {
    const meta = resolveStatutoryMeta(a);
    const content = [
      `Advisory ID,${a.id}`,
      `Severity,${a.severity.toUpperCase()}`,
      `Title,"${a.title.replace(/"/g, '""')}"`,
      `Description,"${a.description.replace(/"/g, '""')}"`,
      `Fiduciary Action,"${a.actionAdvice.replace(/"/g, '""')}"`,
      `Statutory Authority,"${meta.ircSection.replace(/"/g, '""')}"`,
      `Form Reference,"${meta.formReference.replace(/"/g, '""')}"`,
    ].join('\n');
    triggerDownload(`BunBau_Advisory_${a.id}.csv`, content);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const renderSingleAdvisoryBox = (a: (typeof anomalies)[number], isModalView = false) => {
    const isOpportunity = a.severity === 'opportunity';
    const isWarning = a.severity === 'warning';
    const boxScale = boxScales[a.id] ?? 1.0;
    const isInfoExpanded = !!boxInfoOpen[a.id];
    const isChartExpanded = !!boxChartOpen[a.id];
    const isCopied = !!boxCopied[a.id];
    const meta = resolveStatutoryMeta(a);
    const impactDollar = extractDollarAmount(`${a.title} ${a.description}`);
    const maxCompare = Math.max(impactDollar, meta.benchmarkValue, 1);
    const impactPct = Math.max(12, Math.round((impactDollar / maxCompare) * 100));
    const benchPct = Math.max(12, Math.round((meta.benchmarkValue / maxCompare) * 100));

    const bgClass = isOpportunity
      ? 'bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
      : isWarning
      ? 'bg-amber-50/90 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
      : 'bg-blue-50/90 dark:bg-blue-950/35 border-blue-200 dark:border-blue-800/80 text-blue-950 dark:text-blue-100';

    const iconColor = isOpportunity
      ? 'text-emerald-600 dark:text-emerald-400'
      : isWarning
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-blue-600 dark:text-blue-400';

    const target = resolveTarget(a);

    return (
      <div
        key={a.id}
        data-testid={isModalView ? `anomaly-modal-card-${a.id}` : `anomaly-${a.id}`}
        className={`p-4 rounded-2xl border shadow-xs transition flex flex-col gap-3 ${bgClass}`}
      >
        {/* Level-2 Standardized UX Header Bar for Each Individual Box */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className={`shrink-0 ${iconColor}`}>
              {isOpportunity ? <ShieldCheck size={20} /> : isWarning ? <AlertTriangle size={20} /> : <Info size={20} />}
            </div>
            <h4 className="text-sm font-extrabold tracking-tight">{a.title}</h4>
            <span
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                isOpportunity
                  ? 'bg-emerald-200/90 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200'
                  : isWarning
                  ? 'bg-amber-200/90 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200'
                  : 'bg-blue-200/90 dark:bg-blue-900/70 text-blue-900 dark:text-blue-200'
              }`}
            >
              {a.severity}
            </span>
          </div>

          {/* Level-2 Box UX Controls: Zoom, Info, Chart Toggle, Copy, Download, Print, Detach */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            data-testid={`anomaly-box-toolbar-${a.id}`}
          >
            {/* Level-2 Individual Box Accessibility Zoom Bar */}
            <AccessibilityZoomBar
              scale={boxScale}
              onZoomIn={() => setBoxScale(a.id, (s) => s + 0.1)}
              onZoomOut={() => setBoxScale(a.id, (s) => s - 0.1)}
              onReset={() => setBoxScale(a.id, () => 1.0)}
              variant="compact"
              testIdPrefix={`anomaly-box-${a.id}`}
            />

            {/* Level-2 Statutory Info Button */}
            <button
              type="button"
              onClick={() => setBoxInfoOpen((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
              data-testid={`anomaly-box-info-${a.id}`}
              title="View IRC statutory rule & form reference for this advisory"
              className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                isInfoExpanded
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900'
                  : 'bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white'
              }`}
            >
              <Info size={12} />
              <span className="hidden sm:inline">Info</span>
            </button>

            {/* Level-2 Mini Visual Chart Toggle */}
            <button
              type="button"
              onClick={() => setBoxChartOpen((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
              data-testid={`anomaly-box-chart-${a.id}`}
              title="Toggle visual metric benchmark comparison bar"
              className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                isChartExpanded
                  ? 'bg-primary-violet text-white border-primary-violet'
                  : 'bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white'
              }`}
            >
              <BarChart2 size={12} />
              <span className="hidden sm:inline">Chart</span>
            </button>

            {/* Level-2 One-Click Copy */}
            <button
              type="button"
              onClick={() => handleCopySingleBox(a)}
              data-testid={`anomaly-box-copy-${a.id}`}
              title="Copy this advisory's text and action item"
              className={`p-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white'
              }`}
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Level-2 Download CSV */}
            <button
              type="button"
              onClick={() => handleDownloadSingleBox(a)}
              data-testid={`anomaly-box-download-${a.id}`}
              title="Download this advisory as CSV"
              className="p-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white transition cursor-pointer"
            >
              <Download size={12} />
            </button>

            {/* Level-2 Print */}
            <button
              type="button"
              onClick={handlePrint}
              data-testid={`anomaly-box-print-${a.id}`}
              title="Print advisory"
              className="p-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white transition cursor-pointer"
            >
              <Printer size={12} />
            </button>

            {/* Level-2 Detach / Reader Modal */}
            {!isModalView && (
              <button
                type="button"
                onClick={() => setDetachedBoxId(a.id)}
                data-testid={`anomaly-box-detach-${a.id}`}
                title="Open this advisory in a focused large-print reader window"
                className="p-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/70 border-black/15 dark:border-white/15 hover:bg-white transition cursor-pointer"
              >
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Zoomable Body Content of the Individual Box */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ zoom: boxScale }}
        >
          <div className="space-y-1.5 flex-1">
            <p className="text-xs opacity-95 leading-relaxed font-medium">{a.description}</p>
            <p className="text-xs font-bold pt-0.5 flex items-center gap-1.5">
              <Sparkles size={13} className={iconColor} />
              <span>{a.actionAdvice}</span>
            </p>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                if (detachedBoxId) setDetachedBoxId(null);
                if (isContainerDetached) setIsContainerDetached(false);
                onNavigateToTab(target.tab, target.targetCardId);
              }}
              data-testid={`take-action-${a.id}`}
              className={`self-start md:self-center shrink-0 px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                isOpportunity
                  ? 'bg-white dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 border-emerald-300 hover:bg-emerald-100'
                  : isWarning
                  ? 'bg-white dark:bg-amber-900 text-amber-800 dark:text-amber-100 border-amber-300 hover:bg-amber-100'
                  : 'bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-300 hover:bg-blue-100'
              }`}
            >
              <span>Take Action</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* Level-2 Statutory Rule & Provenance Panel */}
        {isInfoExpanded && (
          <div
            data-testid={`anomaly-box-info-panel-${a.id}`}
            className="p-3 rounded-xl bg-white/85 dark:bg-slate-900/80 border border-black/10 dark:border-white/10 text-xs space-y-1"
            style={{ zoom: boxScale }}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText size={13} className={iconColor} />
                {meta.ircSection}
              </span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {meta.formReference}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{meta.methodology}</p>
          </div>
        )}

        {/* Level-2 Per-Box Mini Comparative Bar Chart */}
        {isChartExpanded && (
          <div
            data-testid={`anomaly-box-chart-panel-${a.id}`}
            className="p-3 rounded-xl bg-white/85 dark:bg-slate-900/80 border border-black/10 dark:border-white/10 text-xs space-y-2"
            style={{ zoom: boxScale }}
          >
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span>Statutory Magnitude &amp; Benchmark Comparison</span>
              <span className="font-mono">${impactDollar.toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold">{a.title}</span>
                  <span className="font-mono font-bold">${impactDollar.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${impactPct}%` }}
                    className={`h-full rounded-full ${
                      isOpportunity ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-0.5 text-slate-600 dark:text-slate-400">
                  <span>{meta.benchmarkLabel}</span>
                  <span className="font-mono">${meta.benchmarkValue.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${benchPct}%` }}
                    className="h-full rounded-full bg-slate-500 dark:bg-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContainerContent = (inPortal = false) => {
    const maxChartImpact = Math.max(
      ...filteredAnomalies.map((a) => extractDollarAmount(`${a.title} ${a.description}`)),
      1
    );

    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6 ${
          inPortal ? 'w-full max-w-6xl max-h-[90vh] flex flex-col mb-0 shadow-2xl' : ''
        }`}
        data-testid={inPortal ? 'tax-anomaly-banner-portal-card' : 'tax-anomaly-banner'}
      >
        {/* Level-1 Wrap Container Header & Standardized UX Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gray-50/60 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck size={18} className="text-primary-mint" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Fiduciary Advisories, Active Tax Shields &amp; Statutory Cliff Alerts
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-primary-violet/15 text-primary-violet dark:text-purple-300 border border-primary-violet/30">
                {filteredAnomalies.length} Active
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Level-1 &amp; Level-2 accessible statutory alerts extracted from filed Form 1040, Schedule D/E, and Form 8582
            </p>
          </div>

          {/* Level-1 Standardized UX Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Severity Filter Pills */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold">
              {(['all', 'opportunity', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  data-testid={`anomaly-filter-${sev}`}
                  className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                    selectedSeverity === sev
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sev} ({counts[sev]})
                </button>
              ))}
            </div>

            {/* Cards vs. Impact Chart Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setContainerViewMode('cards')}
                data-testid="anomaly-view-cards-btn"
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  containerViewMode === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={12} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setContainerViewMode('chart')}
                data-testid="anomaly-view-chart-btn"
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  containerViewMode === 'chart'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart2 size={12} />
                <span>Chart</span>
              </button>
            </div>

            {/* Level-1 Accessibility Zoom Bar */}
            <AccessibilityZoomBar
              scale={containerScale}
              onZoomIn={() => setContainerScale((s) => Math.min(1.5, Math.round((s + 0.1) * 100) / 100))}
              onZoomOut={() => setContainerScale((s) => Math.max(0.7, Math.round((s - 0.1) * 100) / 100))}
              onReset={() => setContainerScale(1.0)}
              variant="compact"
              testIdPrefix="anomaly-container"
            />

            {/* Level-1 Info Button */}
            <button
              type="button"
              onClick={() => setShowContainerInfo(!showContainerInfo)}
              data-testid="anomaly-container-info-btn"
              title="Explain Fiduciary Advisory & Tax Shield Engine"
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                showContainerInfo
                  ? 'bg-primary-mint text-slate-900 border-primary-mint'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Info size={13} />
              <span className="hidden sm:inline">Info</span>
            </button>

            {/* Level-1 Copy All */}
            <button
              type="button"
              onClick={handleCopyAll}
              data-testid="anomaly-container-copy-btn"
              title="Copy all advisories to clipboard"
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                containerCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {containerCopied ? <Check size={13} /> : <Copy size={13} />}
              <span>{containerCopied ? 'Copied!' : 'Copy All'}</span>
            </button>

            {/* Level-1 Download CSV */}
            <button
              type="button"
              onClick={handleDownloadAllCsv}
              data-testid="anomaly-container-download-btn"
              title="Download all advisories as CSV"
              className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition cursor-pointer"
            >
              <Download size={13} />
            </button>

            {/* Level-1 Print */}
            <button
              type="button"
              onClick={handlePrint}
              data-testid="anomaly-container-print-btn"
              title="Print advisories"
              className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition cursor-pointer"
            >
              <Printer size={13} />
            </button>

            {/* Level-1 Detach / Full-Screen Portal */}
            <button
              type="button"
              onClick={() => setIsContainerDetached(!isContainerDetached)}
              data-testid="anomaly-container-detach-btn"
              title={inPortal ? 'Restore inline view' : 'Detach advisories to full-screen window'}
              className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition cursor-pointer"
            >
              {inPortal ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Level-1 Info Explainer Banner */}
        {showContainerInfo && (
          <div
            data-testid="anomaly-container-info-banner"
            className="p-4 bg-primary-mint/10 border-b border-primary-mint/30 flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Info size={14} className="text-primary-mint" />
                BunBau Two-Tier Fiduciary Advisory &amp; Statutory Alert Architecture
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Automatically scans your filed Federal Form 1040, Schedule D, Schedule E, Form 8582, and California Form 540 to surface high-value <strong>Opportunities</strong> (loss shields &amp; tax harvesting), <strong>Info</strong> (safe harbor withholding targets), and <strong>Warnings</strong> (Medicare IRMAA MAGI cliffs). Use the Level-1 toolbar to zoom or chart all alerts, or use each card&apos;s Level-2 toolbar to enlarge, copy, or inspect a single box.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContainerInfo(false)}
              className="p-1 text-gray-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body Content (Cards vs. Comparative Impact Chart) */}
        <div
          className={`p-4 sm:p-5 space-y-3 ${inPortal ? 'overflow-y-auto flex-1' : ''}`}
          style={{ zoom: containerScale }}
        >
          {containerViewMode === 'cards' ? (
            filteredAnomalies.map((a) => renderSingleAdvisoryBox(a, false))
          ) : (
            <div
              data-testid="anomaly-impact-chart"
              className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Comparative Financial Impact &amp; Statutory Shield Magnitude
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Side-by-side dollar comparison of active tax shields, safe harbor requirements, and cliff buffers
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary-mint">
                  {filteredAnomalies.length} Advisories Compared
                </span>
              </div>

              <div className="space-y-3">
                {filteredAnomalies.map((a) => {
                  const amount = extractDollarAmount(`${a.title} ${a.description}`);
                  const widthPct = Math.max(10, Math.round((amount / maxChartImpact) * 100));
                  const isOpportunity = a.severity === 'opportunity';
                  const isWarning = a.severity === 'warning';
                  const meta = resolveStatutoryMeta(a);

                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                              isOpportunity
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : isWarning
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}
                          >
                            {a.severity}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{a.title}</span>
                          <span className="text-[11px] font-mono text-gray-400 hidden md:inline">
                            ({meta.formReference})
                          </span>
                        </div>
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOpportunity
                              ? 'bg-emerald-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{a.actionAdvice}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const detachedAnomaly = detachedBoxId ? anomalies.find((a) => a.id === detachedBoxId) : null;

  return (
    <>
      {renderContainerContent(false)}

      {/* Level-1 Full-Screen Detached Portal Modal */}
      {isContainerDetached &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="anomaly-container-portal-modal"
            onClick={() => setIsContainerDetached(false)}
          >
            <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
              {renderContainerContent(true)}
            </div>
          </div>,
          document.body
        )}

      {/* Level-2 Individual Box Focused Reader Modal */}
      {detachedAnomaly &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid={`anomaly-box-reader-modal-${detachedAnomaly.id}`}
            onClick={() => setDetachedBoxId(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-mint" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                    Focused Advisory Reader View
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetachedBoxId(null)}
                  data-testid="close-anomaly-reader-modal"
                  className="p-1.5 rounded-full text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              {renderSingleAdvisoryBox(detachedAnomaly, true)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
