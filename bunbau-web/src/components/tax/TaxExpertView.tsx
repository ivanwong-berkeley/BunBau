'use client';

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Calendar,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Sparkles,
  UploadCloud,
  Database,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Percent,
  Layers,
  RotateCcw,
  Trash2,
  Search,
  Info,
  X,
} from 'lucide-react';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useTax } from '../../contexts/TaxContext';
import { generateTaxComparison } from '../../lib/tax/taxComparisonEngine';
import { computeLifecyclePlanningPackage } from '../../lib/tax/lifecyclePlanningEngine';
import { CompleteTaxYearReturn } from '../../lib/tax/models';
import { TaxExecutiveSummaryCards } from './TaxExecutiveSummaryCards';
import { TaxAnomalyBanner } from './TaxAnomalyBanner';
import { TaxLifecycleTimeline } from './TaxLifecycleTimeline';
import { SocialSecurityPlannerCard } from './SocialSecurityPlannerCard';
import { MedicareHealthPlanCard } from './MedicareHealthPlanCard';
import { IrmaaCliffMonitorCard } from './IrmaaCliffMonitorCard';
import { RmdRothConversionCard } from './RmdRothConversionCard';
import { TaxYearStaticDiffCard } from './TaxYearStaticDiffCard';
import { LongitudinalComparisonCard } from './LongitudinalComparisonCard';
import { BunBauDocumentViewer } from './BunBauDocumentViewer';
import { TaxSingleFormViewer, TargetTaxSchedule } from './TaxSingleFormViewer';
import { OriginalTaxPdfViewerModal } from './OriginalTaxPdfViewerModal';
import { PortfolioTaxStrategyCard } from './PortfolioTaxStrategyCard';
import { MultiYearTrendCard } from './MultiYearTrendCard';
import { MultiYearDeductionsCard } from './MultiYearDeductionsCard';
import { TaxMultiUploaderModal } from './TaxMultiUploaderModal';
import { TaxPreImportReviewModal } from './TaxPreImportReviewModal';
import { ProactiveTaxChatDrawer } from './ProactiveTaxChatDrawer';
import { TaxMemoryInspectorModal } from './TaxMemoryInspectorModal';
import { TaxDeleteModal } from './TaxDeleteModal';

export type TaxSubTab = 'overview' | 'lifecycle' | 'comparison' | 'documents' | 'strategy';

export function TaxExpertView() {
  const { positions } = usePortfolio();
  const {
    taxReturns,
    activeTaxReturns,
    sortedTaxReturns,
    latestTaxReturn,
    previousTaxReturn,
    activeReturn2024,
    activeReturn2025,
    isTaxDemo,
    importTaxReturn,
    importTaxReturnsBatch,
    deleteTaxReturnYears,
    clearTaxReturns,
  } = useTax();

  const [activeSubTab, setActiveSubTab] = useState<TaxSubTab>('overview');
  const [comparisonMode, setComparisonMode] = useState<'longitudinal' | 'twoYearDiff'>('longitudinal');
  const [highlightedStrategyCard, setHighlightedStrategyCard] = useState<string | null>(null);

  // Modals & Drawers state
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isPreImportOpen, setIsPreImportOpen] = useState(false);
  const [stagedReviewReturns, setStagedReviewReturns] = useState<CompleteTaxYearReturn[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Chronologically resolved returns (supporting multi-year files 2016..2025 or future 2026)
  const resolvedSortedReturns = useMemo(() => {
    return sortedTaxReturns || [...activeTaxReturns].sort((a, b) => a.taxYear - b.taxYear);
  }, [sortedTaxReturns, activeTaxReturns]);

  const currentLatestReturn = useMemo(() => {
    return latestTaxReturn || resolvedSortedReturns[resolvedSortedReturns.length - 1] || activeReturn2025;
  }, [latestTaxReturn, resolvedSortedReturns, activeReturn2025]);

  const currentPreviousReturn = useMemo(() => {
    if (previousTaxReturn) return previousTaxReturn;
    if (resolvedSortedReturns.length >= 2) {
      return resolvedSortedReturns[resolvedSortedReturns.length - 2];
    }
    return activeReturn2024 || currentLatestReturn;
  }, [previousTaxReturn, resolvedSortedReturns, activeReturn2024, currentLatestReturn]);

  // Document Viewer & Single Form Workstation state
  const [selectedDocYear, setSelectedDocYear] = useState<number>(2025);
  const [docInitialPage, setDocInitialPage] = useState<number>(6);
  const [vaultViewMode, setVaultViewMode] = useState<'single_form' | 'full_vault'>('single_form');
  const [selectedSchedule, setSelectedSchedule] = useState<TargetTaxSchedule>('1040_p1');
  const [selectedLineId, setSelectedLineId] = useState<string | undefined>(undefined);
  const [isOriginalPdfModalOpen, setIsOriginalPdfModalOpen] = useState<boolean>(false);
  const [originalPdfModalYear, setOriginalPdfModalYear] = useState<number>(2025);

  // Deterministic Math Engines wired to dynamic chronological returns
  const comparison = generateTaxComparison(currentPreviousReturn, currentLatestReturn);
  const latestReturnForLifecycle = currentLatestReturn;
  const lifePlan = computeLifecyclePlanningPackage(latestReturnForLifecycle);

  const handleOpenDocViewer = (
    taxYear: number,
    pageNumber: number = 1,
    targetSchedule?: TargetTaxSchedule,
    lineId?: string
  ) => {
    setSelectedDocYear(taxYear);
    setDocInitialPage(pageNumber);
    if (targetSchedule) {
      setSelectedSchedule(targetSchedule);
    }
    setSelectedLineId(lineId);
    setVaultViewMode('single_form');
    setActiveSubTab('documents');
  };

  const handleOpenOriginalPdf = (taxYear: number = 2025) => {
    setOriginalPdfModalYear(taxYear);
    setIsOriginalPdfModalOpen(true);
  };

  const handleAskCopilot = (promptText?: string) => {
    setChatInitialPrompt(promptText);
    setIsChatOpen(true);
  };

  const handleResetToDemo = async () => {
    if (window.confirm('Reset to Demo Mode? All uploaded tax data will be cleared.')) {
      await clearTaxReturns();
    }
  };

  const selectedTaxReturn =
    activeTaxReturns.find((r) => r.taxYear === selectedDocYear) ||
    currentLatestReturn;

  // High-Visibility Sub-Navigation Dock Accessibility & Magnification State
  const [navDockScale, setNavDockScale] = useState<number>(1.0);
  const [hoverMagnifyEnabled, setHoverMagnifyEnabled] = useState<boolean>(true);
  const [showNavInfo, setShowNavInfo] = useState<boolean>(false);

  const subTabs = [
    {
      id: 'overview' as const,
      label: 'Overview & KPIs',
      subtitle: 'Executive KPIs, Shields & 1040/540',
      icon: <Landmark size={19} />,
      iconBadgeClass:
        'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60',
    },
    {
      id: 'lifecycle' as const,
      label: 'Forward-Looking Life Planner',
      subtitle: '2026–2040 Milestones, Medicare & RMD',
      icon: <Clock size={19} />,
      badge: 'AI Fiduciary',
      iconBadgeClass:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60',
    },
    {
      id: 'comparison' as const,
      label: 'Multi-Year Audit',
      subtitle: `${activeTaxReturns.length}-Year Trajectory & Matrix Audit`,
      icon: <FileSpreadsheet size={19} />,
      badge: `${activeTaxReturns.length} Yrs`,
      iconBadgeClass:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60',
    },
    {
      id: 'documents' as const,
      label: 'Document Vault & Viewer',
      subtitle: 'Filed PDFs & Canonical Form Sheets',
      icon: <FileText size={19} />,
      iconBadgeClass:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60',
    },
    {
      id: 'strategy' as const,
      label: 'Portfolio Tax Strategy',
      subtitle: 'Tax Drag, Harvest & Loss Shields',
      icon: <TrendingUp size={19} />,
      iconBadgeClass:
        'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-700/60',
    },
  ];

  return (
    <div className="space-y-6" data-testid="tax-expert-view">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-primary-violet to-purple-600 text-white rounded-2xl shadow-sm">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Tax Expert &amp; Financial Fiduciary
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary-mint/20 text-primary-mint border border-primary-mint/30 font-bold">
                  v2.8 AI
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multi-Year Return Analysis, Forward-Looking Lifecycle Strategy &amp; Shared RAG Advisor
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsUploaderOpen(true)}
            data-testid="upload-tax-pdf-btn"
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <UploadCloud size={15} className="text-primary-mint" />
            <span>Upload Tax Return (PDF / CSV / Scans)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMemoryOpen(true)}
            data-testid="inspect-tax-memory-btn"
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Database size={15} className="text-primary-violet" />
            <span>Tax Memory</span>
          </button>

          <button
            type="button"
            onClick={() => handleAskCopilot()}
            data-testid="ask-tax-copilot-btn"
            className="px-4 py-2 bg-gradient-to-r from-primary-violet to-purple-600 hover:from-purple-600 hover:to-primary-violet text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Sparkles size={15} />
            <span>Consult Tax Co-Pilot</span>
          </button>
        </div>
      </div>

      {/* Dynamic Demo Mode vs Live Mode Notice Banner */}
      {isTaxDemo ? (
        <div
          data-testid="tax-demo-banner"
          className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between font-medium gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="shrink-0 text-blue-500" />
            <div>
              <span className="font-bold">Tax Demo Mode:</span> You are viewing synthetic mock returns for Alex &amp; Jordan Taylor. Upload your filed Form 1040/CA 540 PDF tax returns, 1099 CSVs, or tax document scans to activate Live Mode with personalized tax intelligence.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUploaderOpen(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl transition shrink-0 self-start sm:self-auto"
          >
            Upload Tax Return (PDF, CSV, Scans)
          </button>
        </div>
      ) : (
        <div
          data-testid="tax-live-banner"
          className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between font-medium gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-bold">Live Tax Mode:</span> Personalized tax analysis active for {taxReturns.map((r) => r.taxYear).sort().join(', ')} ({taxReturns.length} {taxReturns.length === 1 ? 'Year' : 'Years'} Loaded).
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsUploaderOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition shrink-0"
            >
              Upload Another Year
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              data-testid="tax-expert-delete-btn"
              className="text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1"
            >
              <Trash2 size={12} />
              <span>Delete History</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDemo}
              className="text-xs bg-transparent hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset to Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* High-Visibility Tactile Sub-Page Navigation Dock */}
      <div
        className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-md space-y-2.5 select-none"
        data-testid="tax-workspace-nav-dock"
      >
        {/* Dock Header & Accessibility Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-primary-violet/15 dark:bg-primary-violet/25 text-primary-violet dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-primary-violet/30">
              Workspace Navigation
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">
              Select a fiduciary tax module below • Hover any button to magnify
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hover Magnifier Toggle */}
            <button
              type="button"
              onClick={() => setHoverMagnifyEnabled(!hoverMagnifyEnabled)}
              data-testid="nav-hover-magnify-toggle"
              title="Toggle mouse-over magnification lens on navigation buttons"
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                hoverMagnifyEnabled
                  ? 'bg-primary-mint/20 border-primary-mint text-slate-900 dark:text-primary-mint shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <Search size={13} className={hoverMagnifyEnabled ? 'text-emerald-600 dark:text-primary-mint' : ''} />
              <span>Hover Magnify: {hoverMagnifyEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Navigation Info Button */}
            <button
              type="button"
              onClick={() => setShowNavInfo(!showNavInfo)}
              data-testid="nav-dock-info-btn"
              title="Explain workspace navigation modules"
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                showNavInfo
                  ? 'bg-primary-violet text-white border-primary-violet'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <Info size={13} />
              <span className="hidden md:inline">Info</span>
            </button>

            {/* Navigation Dock Accessibility Zoom Bar */}
            <AccessibilityZoomBar
              scale={navDockScale}
              onZoomIn={() => setNavDockScale((s) => Math.min(1.35, Math.round((s + 0.1) * 100) / 100))}
              onZoomOut={() => setNavDockScale((s) => Math.max(0.85, Math.round((s - 0.1) * 100) / 100))}
              onReset={() => setNavDockScale(1.0)}
              minScale={0.85}
              maxScale={1.35}
              variant="compact"
              testIdPrefix="tax-nav-dock"
            />
          </div>
        </div>

        {/* Optional Nav Info Popover Banner */}
        {showNavInfo && (
          <div
            className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-start justify-between gap-3"
            data-testid="nav-dock-info-banner"
          >
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info size={14} className="text-primary-violet" />
                BunBau High-Visibility Tax Fiduciary Navigation Dock
              </p>
              <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                Switch seamlessly across 5 specialized workspaces: (1) <strong>Overview &amp; KPIs</strong> for executive tax rates and statutory alerts, (2) <strong>Forward-Looking Life Planner</strong> for 2026–2040 Medicare/SS/RMD milestones, (3) <strong>Multi-Year Audit</strong> for 9-year longitudinal tables &amp; charts, (4) <strong>Document Vault &amp; Viewer</strong> for canonical form sheets &amp; original PDFs, and (5) <strong>Portfolio Tax Strategy</strong> for active loss harvesting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNavInfo(false)}
              className="p-1 text-purple-500 hover:text-purple-900 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 5 Tactile High-Contrast Module Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-0.5"
          style={{ zoom: navDockScale }}
          role="tablist"
          aria-label="Tax Fiduciary Workspace Modules"
        >
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(tab.id)}
                data-testid={`subtab-${tab.id}`}
                className={`group relative p-3 rounded-2xl border-2 text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                  hoverMagnifyEnabled
                    ? 'hover:scale-[1.05] hover:-translate-y-1 hover:z-20 hover:shadow-xl'
                    : 'hover:shadow-md'
                } ${
                  isActive
                    ? 'bg-gradient-to-br from-primary-violet via-indigo-600 to-purple-700 text-white border-primary-mint shadow-lg ring-2 ring-primary-violet/40 dark:ring-primary-mint/50'
                    : 'bg-white dark:bg-slate-800/95 text-slate-900 dark:text-white border-slate-200/90 dark:border-slate-700 hover:border-primary-violet dark:hover:border-primary-mint shadow-xs'
                }`}
              >
                {/* Graphic Icon Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30 shadow-inner'
                      : tab.iconBadgeClass
                  }`}
                >
                  {tab.icon}
                </div>

                {/* Title, Subtitle & Badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm font-extrabold tracking-tight leading-snug truncate ${
                        isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 line-clamp-1 font-medium ${
                      isActive ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.subtitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {isActive && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-primary-mint text-slate-900 uppercase tracking-wider shadow-2xs">
                        Active View
                      </span>
                    )}
                    {tab.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-primary-mint/20 text-emerald-800 dark:text-primary-mint border border-primary-mint/40'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mouse-Over Magnifying Glass Indicator Badge */}
                {hoverMagnifyEnabled && (
                  <span
                    className={`absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-primary-violet/15 text-primary-violet dark:bg-primary-mint/20 dark:text-primary-mint'
                    }`}
                    aria-hidden="true"
                  >
                    <Search size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace 1: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <TaxExecutiveSummaryCards comparison={comparison} />
          <TaxAnomalyBanner
            comparison={comparison}
            onNavigateToTab={(t, targetCardId) => {
              setActiveSubTab(t as TaxSubTab);
              if (targetCardId) {
                setHighlightedStrategyCard(targetCardId);
              }
            }}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MultiYearTrendCard comparison={comparison} />
            <MultiYearDeductionsCard comparison={comparison} />
          </div>
        </div>
      )}

      {/* Workspace 2: Forward-Looking Lifecycle Strategy */}
      {activeSubTab === 'lifecycle' && (
        <div className="space-y-6">
          <TaxLifecycleTimeline lifePlan={lifePlan} />
          <SocialSecurityPlannerCard strategy={lifePlan.socialSecurity} />
          <MedicareHealthPlanCard medicare={lifePlan.medicare} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IrmaaCliffMonitorCard irmaa={lifePlan.irmaa} />
            <RmdRothConversionCard
              rmdPlan={lifePlan.rmdRoth}
              taxpayerLabels={{
                older: lifePlan.medicare.olderSpouse.name,
                younger: lifePlan.medicare.youngerSpouse.name,
              }}
            />
          </div>
        </div>
      )}

      {/* Workspace 3: Multi-Year Audit & Variance Breakdown */}
      {activeSubTab === 'comparison' && (
        <div className="space-y-6">
          {/* Comparison Mode Selector Ribbon */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComparisonMode('longitudinal')}
                data-testid="mode-longitudinal-btn"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  comparisonMode === 'longitudinal'
                    ? 'bg-primary-violet text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <TrendingUp size={14} />
                <span>N-Year Longitudinal Trajectory ({activeTaxReturns.length} Years)</span>
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('twoYearDiff')}
                data-testid="mode-two-year-diff-btn"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  comparisonMode === 'twoYearDiff'
                    ? 'bg-primary-violet text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>2-Year Variance Audit (2024 vs 2025)</span>
              </button>
            </div>
            <span className="text-xs text-gray-400 px-2 font-mono hidden sm:inline">
              {comparisonMode === 'longitudinal' ? `${activeTaxReturns.length} Filings Ingested` : '2 Filings Selected'}
            </span>
          </div>

          {comparisonMode === 'longitudinal' ? (
            <LongitudinalComparisonCard
              taxReturns={activeTaxReturns}
              onOpenDocumentViewer={(year: number, page?: number, targetSchedule?: TargetTaxSchedule, lineId?: string) =>
                handleOpenDocViewer(year, page, targetSchedule, lineId)
              }
              onOpenOriginalPdf={(year: number) => handleOpenOriginalPdf(year)}
            />
          ) : (
            <TaxYearStaticDiffCard
              comparison={comparison}
              onOpenDocumentViewer={(year: number, page?: number) => handleOpenDocViewer(year, page)}
            />
          )}
        </div>
      )}

      {/* Workspace 4: Document Vault & Interactive PDF Viewer */}
      {activeSubTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Document:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeTaxReturns
                  .map((r) => r.taxYear)
                  .sort((a, b) => a - b)
                  .map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedDocYear(yr);
                        setDocInitialPage(yr === 2024 ? 15 : yr === 2025 ? 6 : 1);
                      }}
                      data-testid={`doc-year-tab-${yr}`}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                        selectedDocYear === yr
                          ? 'bg-primary-violet text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {yr} Filed Return
                    </button>
                  ))}
              </div>
            </div>

            {/* View Mode Toggle: Single Form View vs Full Vault & Original PDF Launcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  data-testid="vault-single-form-mode-btn"
                  onClick={() => setVaultViewMode('single_form')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    vaultViewMode === 'single_form'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet size={13} className="text-primary-mint" />
                  <span>Single Form Sheet</span>
                </button>
                <button
                  type="button"
                  data-testid="vault-full-scroll-mode-btn"
                  onClick={() => setVaultViewMode('full_vault')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    vaultViewMode === 'full_vault'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers size={13} className="text-primary-violet" />
                  <span>52-Page Vault</span>
                </button>
              </div>

              {/* View Original Uploaded PDF Modal Launcher */}
              <button
                type="button"
                onClick={() => handleOpenOriginalPdf(selectedDocYear)}
                data-testid="vault-open-original-pdf-btn"
                className="px-3 py-1 text-xs font-bold rounded-xl bg-primary-violet text-white hover:bg-purple-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Open authentic uploaded PDF full report"
              >
                <FileText size={13} />
                <span>View Original Uploaded PDF</span>
              </button>
            </div>
          </div>

          {/* Render Active Workstation Mode */}
          {vaultViewMode === 'single_form' ? (
            <TaxSingleFormViewer
              taxReturn={selectedTaxReturn}
              allReturns={activeTaxReturns}
              initialSchedule={selectedSchedule}
              highlightedLineId={selectedLineId}
              onSelectYear={(yr) => setSelectedDocYear(yr)}
              onOpenOriginalPdf={(yr) => handleOpenOriginalPdf(yr)}
              onAskCopilotAboutPage={(title) =>
                handleAskCopilot(`Can you explain the statutory details, IRS rules, and optimization implications of ${title}?`)
              }
            />
          ) : (
            <BunBauDocumentViewer
              taxReturn={selectedTaxReturn}
              allReturns={activeTaxReturns}
              initialPage={docInitialPage}
              onSelectYear={(yr) => {
                setSelectedDocYear(yr);
                setDocInitialPage(yr === 2024 ? 15 : yr === 2025 ? 6 : 1);
              }}
              onAskCopilotAboutPage={(pageNum, label) =>
                handleAskCopilot(`Can you explain the details and financial strategy behind ${selectedDocYear} tax return page ${pageNum} (${label})?`)
              }
            />
          )}
        </div>
      )}

      {/* Workspace 5: Portfolio Tax Strategy */}
      {activeSubTab === 'strategy' && (
        <div className="space-y-6">
          <PortfolioTaxStrategyCard
            positions={positions}
            capitalLossCarryover={currentLatestReturn.federal.capitalLossCarryoverToNextYear}
            suspendedPassiveLoss={currentLatestReturn.federal.form8582.unallowedSuspendedLossCarryforward}
            safeHarborRemaining={51062}
            highlightedCardId={highlightedStrategyCard}
            rentalPropertyAddress={currentLatestReturn.federal.rentalProperties?.[0]?.address || 'Schedule E Rental Property'}
          />
          <IrmaaCliffMonitorCard irmaa={lifePlan.irmaa} />
        </div>
      )}

      {/* Multi-File Ingestion Modals */}
      <OriginalTaxPdfViewerModal
        isOpen={isOriginalPdfModalOpen}
        onClose={() => setIsOriginalPdfModalOpen(false)}
        taxYear={originalPdfModalYear}
        taxReturns={activeTaxReturns}
        onSelectYear={(yr) => setOriginalPdfModalYear(yr)}
        onAskCopilotAboutPage={(title) => handleAskCopilot(title)}
      />

      <TaxMultiUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onProceedToReview={(returns) => {
          setStagedReviewReturns(returns);
          setIsUploaderOpen(false);
          setIsPreImportOpen(true);
        }}
      />

      <TaxPreImportReviewModal
        isOpen={isPreImportOpen}
        onClose={() => setIsPreImportOpen(false)}
        taxReturns={stagedReviewReturns.length > 0 ? stagedReviewReturns : activeTaxReturns}
        onConfirmImport={async () => {
          await importTaxReturnsBatch(stagedReviewReturns);
          setIsPreImportOpen(false);
          setActiveSubTab('comparison');
        }}
      />

      {/* Proactive Tax Co-Pilot Drawer */}
      <ProactiveTaxChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialPrompt={chatInitialPrompt}
      />

      {/* Persistent Tax Memory Inspector Modal */}
      <TaxMemoryInspectorModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
      />

      {/* Granular Tax Deletion Modal with Typed Confirmation Phrase Verification */}
      <TaxDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        availableYears={activeTaxReturns.map((r) => r.taxYear)}
        onConfirmDelete={async (scope, targetYears) => {
          if (scope === 'all') {
            await clearTaxReturns();
          } else {
            await deleteTaxReturnYears(targetYears);
          }
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
