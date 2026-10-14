'use client';

import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Eye,
  Shield,
  Calendar,
  X,
  Sparkles,
  FileText,
  ExternalLink,
  Info,
  Copy,
  Check,
  BarChart2,
  Table2,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { CompleteTaxYearReturn } from '../../lib/tax/models';
import {
  computeLongitudinalTaxAnalysis,
  LongitudinalLineItem,
} from '../../lib/tax/longitudinalEngine';
import { SmartTable, SmartColumn } from '../common/SmartTable';
import { StaticTh } from '../common/SortableHeader';
import { TargetTaxSchedule } from './TaxSingleFormViewer';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';

export interface LongitudinalComparisonCardProps {
  taxReturns: CompleteTaxYearReturn[];
  onOpenDocumentViewer?: (
    taxYear: number,
    pageNumber?: number,
    targetSchedule?: TargetTaxSchedule,
    lineId?: string
  ) => void;
  onOpenOriginalPdf?: (taxYear: number) => void;
}

const CATEGORY_INFO_DESCRIPTIONS: Record<string, { title: string; description: string; forms: string }> = {
  All: {
    title: 'Comprehensive Multi-Year Federal & California Return Audit',
    description:
      'Complete longitudinal reconciliation across all income streams, above-the-line adjustments, itemized/standard deductions, Federal & CA tax liabilities, withholding/payments, and statutory loss carryovers.',
    forms: 'Form 1040, Schedules 1/2/3/A/B/D/E, Form 8582, Form 8959/8960, CA Form 540',
  },
  Income: {
    title: 'Gross Income Streams & Capital / Rental Activity Progression',
    description:
      'Audits W-2 wages, taxable interest, qualified & ordinary dividends, net capital gains/losses, and rental real estate operating results to track AGI composition and marginal bracket pressure.',
    forms: 'Form 1040 Lines 1a–11, Schedule B, Schedule D, Schedule E Part I',
  },
  Deductions: {
    title: 'Standard vs. Itemized Deductions & Taxable Income Base',
    description:
      'Reconciles SALT cap ($10,000 federal limit vs. CA itemization), mortgage interest, charitable deductions, and taxable income progression under IRC §63.',
    forms: 'Form 1040 Lines 12–15, Schedule A, CA Form 540 Schedule CA',
  },
  Taxes: {
    title: 'Federal & California Statutory Tax Liabilities & Surtaxes',
    description:
      'Tracks Federal regular income tax, Net Investment Income Tax (3.8% NIIT), Additional Medicare Tax (0.9%), California state income tax, and combined effective tax rates.',
    forms: 'Form 1040 Lines 16–24, Form 8959, Form 8960, CA Form 540 Lines 31–64',
  },
  Payments: {
    title: 'Tax Withholding, Estimated Payments & Safe Harbor Compliance',
    description:
      'Audits W-2 federal/state withholding, quarterly estimated tax payments, and net refunds or balances due under IRC §6654(d)(1)(B) 110% high-earner safe harbor rules.',
    forms: 'Form 1040 Lines 25a–37, Form W-2 Box 2/17, Form 2210',
  },
  Carryovers: {
    title: 'Indefinite Capital Loss & Suspended Passive Activity Loss Shields',
    description:
      'Tracks cumulative capital loss carryforwards (IRC §1212(b)) and suspended passive rental losses (IRC §469(g)) available to shelter future capital gains and passive/disposition income.',
    forms: 'Schedule D Line 21 Carryover Worksheet, Form 8582 Line 16',
  },
  California: {
    title: 'California Franchise Tax Board (Form 540) Longitudinal Audit',
    description:
      'Reconciles California AGI, CA itemized deductions, CA taxable income, Mental Health Services Tax (1% > $1M), and net CA tax liability.',
    forms: 'CA Form 540, Schedule CA (540)',
  },
};

export function LongitudinalComparisonCard({
  taxReturns,
  onOpenDocumentViewer,
  onOpenOriginalPdf,
}: LongitudinalComparisonCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'macro' | 'shields'>('matrix');
  const [selectedLineItem, setSelectedLineItem] = useState<LongitudinalLineItem | null>(null);

  // Level-1 Container UX State
  const [level1Scale, setLevel1Scale] = useState<number>(1.0);
  const [showContainerInfo, setShowContainerInfo] = useState(false);
  const [containerCopied, setContainerCopied] = useState(false);
  const [isLevel1Detached, setIsLevel1Detached] = useState(false);

  // Level-2 Sub-Page UX State (All, Income, Deductions, Taxes, Payments, Carryovers, California)
  const [subpageScale, setSubpageScale] = useState<number>(1.0);
  const [subpageViewMode, setSubpageViewMode] = useState<'table' | 'chart'>('table');
  const [showSubpageInfo, setShowSubpageInfo] = useState<boolean>(false);
  const [subpageCopied, setSubpageCopied] = useState<boolean>(false);
  const [isSubpageDetached, setIsSubpageDetached] = useState<boolean>(false);
  const [selectedChartMetricKey, setSelectedChartMetricKey] = useState<string | null>(null);

  // Multi-Year Audit Report Preview Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalScale, setReportModalScale] = useState<number>(1.0);
  const [reportModalCopied, setReportModalCopied] = useState<boolean>(false);

  // Line Item Inspector Modal State
  const [modalViewMode, setModalViewMode] = useState<'grid' | 'chart'>('grid');
  const [showModalInfo, setShowModalInfo] = useState(false);
  const [modalCopied, setModalCopied] = useState(false);

  // Bi-Directional Scroll Container Ref
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);

  const categories = ['All', 'Income', 'Deductions', 'Taxes', 'Payments', 'Carryovers', 'California'];

  const analysis = useMemo(() => {
    return computeLongitudinalTaxAnalysis(taxReturns);
  }, [taxReturns]);

  const { years, earliestYear, latestYear, macroTrends, lossShieldLedger, lineItemMatrix, kpis } = analysis;

  const fmt = (n: number) => {
    if (n < 0) return `-$${Math.abs(n).toLocaleString()}`;
    return `$${n.toLocaleString()}`;
  };

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: lineItemMatrix.length };
    for (const c of categories) {
      if (c !== 'All') {
        map[c] = lineItemMatrix.filter((item) => item.category === c).length;
      }
    }
    return map;
  }, [lineItemMatrix]);

  const filteredItems = useMemo(() => {
    return lineItemMatrix.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        searchQuery === '' ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.formRef.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [lineItemMatrix, selectedCategory, searchQuery]);

  // Active chart item or top items for the Category Graphic Chart
  const activeChartItems = useMemo(() => {
    if (filteredItems.length === 0) return [];
    if (selectedChartMetricKey) {
      const found = filteredItems.find((i) => i.key === selectedChartMetricKey);
      if (found) return [found];
    }
    return filteredItems.slice(0, 4);
  }, [filteredItems, selectedChartMetricKey]);

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

  const buildCsvContent = (items: LongitudinalLineItem[], catLabel: string) => {
    const header = ['Category', 'Line Item', 'IRS/CA Form Reference', ...years.map(String), `CAGR (${years.length} Yrs)`, 'Trend', 'Statutory Insight'];
    const rows = items.map((item) => [
      `"${item.category}"`,
      `"${item.label.replace(/"/g, '""')}"`,
      `"${item.formRef.replace(/"/g, '""')}"`,
      ...years.map((yr) => item.valuesByYear[yr] || 0),
      `"${item.cagrPct}%"`,
      item.overallTrend.toUpperCase(),
      `"${(item.impactInsight || '').replace(/"/g, '""')}"`,
    ]);
    const metaTop = [
      `"BUNBAU ${years.length}-YEAR LONGITUDINAL TAX AUDIT REPORT (${earliestYear}-${latestYear}) - FILTER: ${catLabel.toUpperCase()}"`,
      `"Average Annual AGI: ${fmt(kpis.averageAnnualAgi)}","Peak AGI: ${fmt(kpis.peakAgiAmount)} (${kpis.peakAgiYear})","Cumulative Taxes Paid: ${fmt(kpis.cumulativeTotalTaxesPaid)}","Avg Effective Rate: ${kpis.averageEffectiveRatePct}%"`,
      '',
    ];
    return [...metaTop, header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const handleDownloadFullCsv = () => {
    const csv = buildCsvContent(lineItemMatrix, 'All');
    triggerDownload(`BunBau_MultiYear_Tax_Audit_All_${earliestYear}_${latestYear}.csv`, csv);
  };

  const handleDownloadSubpageCsv = () => {
    const csv = buildCsvContent(filteredItems, selectedCategory);
    triggerDownload(`BunBau_MultiYear_Tax_Audit_${selectedCategory}_${earliestYear}_${latestYear}.csv`, csv);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const handleScrollMatrix = (direction: 'left' | 'right' | 'top' | 'bottom') => {
    const el = matrixScrollRef.current;
    if (!el) return;
    if (direction === 'left') {
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left: -340, behavior: 'smooth' });
      } else {
        el.scrollLeft = Math.max(0, el.scrollLeft - 340);
      }
    } else if (direction === 'right') {
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left: 340, behavior: 'smooth' });
      } else {
        el.scrollLeft = el.scrollLeft + 340;
      }
    } else if (direction === 'top') {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollTop = 0;
      }
    } else if (direction === 'bottom') {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
  };

  const handleCopyAuditSummary = async () => {
    const summaryText = [
      `=== BUNBAU ${years.length}-YEAR LONGITUDINAL TAX AUDIT SUMMARY (${earliestYear} – ${latestYear}) ===`,
      `• Average Annual AGI: ${fmt(kpis.averageAnnualAgi)}`,
      `• Peak AGI Year: ${kpis.peakAgiYear} (${fmt(kpis.peakAgiAmount)})`,
      `• Lowest AGI Year: ${kpis.lowestAgiYear} (${fmt(kpis.lowestAgiAmount)})`,
      `• Cumulative Total Taxes Paid (Fed + CA): ${fmt(kpis.cumulativeTotalTaxesPaid)}`,
      `• Longitudinal Average Effective Rate: ${kpis.averageEffectiveRatePct}%`,
      `• Active Loss Shields (Upcoming Year): ${fmt(kpis.activeLossShieldsUpcomingYear)}`,
      `• Total Audited Tax Filings: ${years.length} (${years.join(', ')})`,
      `=====================================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summaryText);
    }
    setContainerCopied(true);
    setTimeout(() => setContainerCopied(false), 2000);
  };

  const handleCopySubpageTable = async (isFromReportModal = false) => {
    const lines = [
      `=== BUNBAU ${years.length}-YEAR MULTI-YEAR AUDIT MATRIX — CATEGORY: ${selectedCategory.toUpperCase()} (${earliestYear}–${latestYear}) ===`,
      `Line Item | Form Ref | ${years.join(' | ')} | CAGR (${years.length} Yrs)`,
      ...filteredItems.map((item) => {
        const yrVals = years.map((yr) => fmt(item.valuesByYear[yr] || 0)).join(' | ');
        const cagrStr = item.cagrPct !== 0 ? `${item.cagrPct > 0 ? '+' : ''}${item.cagrPct}%` : '0.0%';
        return `${item.label} | ${item.formRef} | ${yrVals} | ${cagrStr}`;
      }),
      `====================================================================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines);
    }
    if (isFromReportModal) {
      setReportModalCopied(true);
      setTimeout(() => setReportModalCopied(false), 2000);
    } else {
      setSubpageCopied(true);
      setTimeout(() => setSubpageCopied(false), 2000);
    }
  };

  const handleCopyLineItem = async (item: LongitudinalLineItem) => {
    const progressionStr = years
      .map((yr) => `  - ${yr}: ${fmt(item.valuesByYear[yr] || 0)}`)
      .join('\n');

    const text = [
      `=== LINE ITEM AUDIT: ${item.label} (${item.formRef}) ===`,
      `Category: ${item.category}`,
      `Compound Annual Growth Rate (CAGR): ${item.cagrPct !== 0 ? (item.cagrPct > 0 ? '+' : '') + item.cagrPct + '%' : '0.0%'} (${item.overallTrend.toUpperCase()})`,
      `Statutory Impact & Insight: ${item.impactInsight || 'N/A'}`,
      `Historical Progression:`,
      progressionStr,
      `=======================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

  // Dynamically generate columns for each year in the analysis
  const columns: SmartColumn<LongitudinalLineItem>[] = useMemo(() => {
    const baseCols: SmartColumn<LongitudinalLineItem>[] = [
      {
        key: 'label',
        label: 'Line Item & IRS Form Reference',
        align: 'left',
        sortValue: (row) => row.label,
        render: (row) => (
          <div
            className="flex items-center justify-between gap-2 group cursor-pointer min-w-[230px]"
            onClick={() => setSelectedLineItem(row)}
            data-testid={`row-${row.key}`}
          >
            <div>
              <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary-mint transition flex items-center gap-1.5">
                {row.label}
              </span>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">{row.formRef}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLineItem(row);
              }}
              className="p-1 px-1.5 text-[10px] font-bold text-primary-mint bg-primary-mint/10 hover:bg-primary-mint/20 rounded-md transition flex items-center gap-1 shrink-0 cursor-pointer"
              title={`Inspect ${row.label} card details & source PDF`}
              data-testid={`inspect-btn-${row.key}`}
            >
              <Eye size={11} />
              <span>Inspect</span>
            </button>
          </div>
        ),
      },
    ];

    // Add a column for each tax year
    for (const yr of years) {
      baseCols.push({
        key: `year_${yr}`,
        label: `${yr}`,
        align: 'right',
        sortValue: (row) => row.valuesByYear[yr] || 0,
        render: (row) => {
          const val = row.valuesByYear[yr] || 0;
          return (
            <span
              className={`font-mono text-xs ${
                yr === latestYear
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {fmt(val)}
            </span>
          );
        },
      });
    }

    // Add Trend / CAGR column
    baseCols.push({
      key: 'cagrPct',
      label: `CAGR (${years.length} Yrs)`,
      align: 'right',
      sortValue: (row) => row.cagrPct,
      render: (row) => {
        const isPos = row.overallTrend === 'up';
        const isNeg = row.overallTrend === 'down';
        return (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
              isPos
                ? 'text-emerald-600 dark:text-emerald-400'
                : isNeg
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-400'
            }`}
          >
            {isPos ? <ArrowUpRight size={13} /> : isNeg ? <ArrowDownRight size={13} /> : <Minus size={13} />}
            {row.cagrPct !== 0 ? `${row.cagrPct > 0 ? '+' : ''}${row.cagrPct}%` : '0.0%'}
          </span>
        );
      },
    });

    // Deep-link action button to latest return
    if (onOpenDocumentViewer) {
      baseCols.push({
        key: 'action',
        label: 'Source PDF',
        align: 'center',
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() =>
                onOpenDocumentViewer(
                  latestYear,
                  row.sourceDocPage2025 || (latestYear === 2024 ? 15 : 6),
                  row.targetSchedule,
                  row.key
                )
              }
              className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary-mint/20 hover:bg-primary-mint/30 text-primary-mint transition flex items-center gap-1 cursor-pointer"
              title={`View ${row.label} in ${latestYear} Return`}
            >
              <Eye size={11} /> {latestYear}
            </button>
            {years.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onOpenDocumentViewer(
                    earliestYear,
                    row.sourceDocPage2024 || 1,
                    row.targetSchedule,
                    row.key
                  )
                }
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                title={`View ${row.label} in ${earliestYear} Return`}
              >
                <Eye size={11} /> {earliestYear}
              </button>
            )}
          </div>
        ),
      });
    }

    return baseCols;
  }, [years, latestYear, earliestYear, onOpenDocumentViewer]);

  const renderCategoryGraphicChart = () => {
    const barColors = [
      'bg-primary-violet dark:bg-purple-500',
      'bg-primary-mint dark:bg-emerald-400',
      'bg-blue-500 dark:bg-blue-400',
      'bg-amber-500 dark:bg-amber-400',
    ];

    const maxChartVal = Math.max(
      ...activeChartItems.flatMap((item) => years.map((yr) => Math.abs(item.valuesByYear[yr] || 0))),
      1
    );

    return (
      <div
        data-testid="subpage-category-chart"
        className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={16} className="text-primary-mint" />
              <span>
                {years.length}-Year Comparative Audit Graphic Chart — Category: {selectedCategory} ({earliestYear} – {latestYear})
              </span>
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Year-over-year visual progression across filed returns. Click any metric pill below to focus or compare, or click a bar to inspect its statutory line item card.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedChartMetricKey(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition self-start md:self-auto cursor-pointer ${
              selectedChartMetricKey === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            Compare Top {Math.min(4, filteredItems.length)} Metrics
          </button>
        </div>

        {/* Interactive Metric Selector Pills for Active Category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filteredItems.map((item) => {
            const isSelected = selectedChartMetricKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedChartMetricKey(isSelected ? null : item.key)}
                data-testid={`chart-metric-pill-${item.key}`}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-violet text-white border-primary-violet shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-mint'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-mono opacity-75">
                  ({fmt(item.valuesByYear[latestYear] || 0)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {activeChartItems.map((item, idx) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm ${barColors[idx % barColors.length]}`} />
              <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
              <span className="font-mono text-[11px] text-gray-500">
                CAGR: {item.cagrPct > 0 ? `+${item.cagrPct}%` : `${item.cagrPct}%`}
              </span>
            </div>
          ))}
        </div>

        {/* Multi-Year Grouped Bar Chart */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[680px] grid grid-cols-9 gap-3 items-end h-60 pt-8 px-3 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800">
            {years.map((yr) => {
              const isLatest = yr === latestYear;
              return (
                <div
                  key={yr}
                  className="flex flex-col items-center justify-end h-full gap-1.5 group"
                >
                  <div className="flex items-end justify-center gap-1 w-full h-44 px-1">
                    {activeChartItems.map((item, idx) => {
                      const val = item.valuesByYear[yr] || 0;
                      const heightPct = Math.max(10, Math.round((Math.abs(val) / maxChartVal) * 100));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedLineItem(item)}
                          title={`${yr} ${item.label}: ${fmt(val)} (Click to inspect)`}
                          style={{ height: `${heightPct}%` }}
                          className={`flex-1 max-w-[22px] rounded-t-md transition-all duration-300 hover:opacity-85 cursor-pointer ${
                            val < 0 ? 'bg-rose-500' : barColors[idx % barColors.length]
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div
                    className={`text-[11px] font-mono py-1 px-2 rounded-md ${
                      isLatest
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold'
                        : 'text-gray-500 dark:text-gray-400 font-semibold'
                    }`}
                  >
                    {yr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* YoY Summary Strip Under Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeChartItems.map((item) => {
            const latestVal = item.valuesByYear[latestYear] || 0;
            const prevYear = years.length >= 2 ? years[years.length - 2] : earliestYear;
            const prevVal = item.valuesByYear[prevYear] || 0;
            const delta = latestVal - prevVal;
            return (
              <div
                key={item.key}
                onClick={() => setSelectedLineItem(item)}
                className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-primary-mint transition cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{item.formRef}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                    {fmt(latestVal)}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {fmt(delta)} vs {prevYear}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMatrixSubpageSection = (inSubpagePortal = false) => {
    const catMeta = CATEGORY_INFO_DESCRIPTIONS[selectedCategory] || CATEGORY_INFO_DESCRIPTIONS.All;

    return (
      <div
        className={`p-6 space-y-4 ${
          inSubpagePortal
            ? 'bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto'
            : ''
        }`}
        data-testid={inSubpagePortal ? 'longitudinal-subpage-portal-card' : 'longitudinal-subpage-container'}
      >
        {/* Row 1: Category Filter Pills & Search Input */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                data-testid={`category-filter-${cat}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedCategory === cat
                      ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-white'
                      : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search line items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-mint w-56"
            />
          </div>
        </div>

        {/* Row 2: Level-2 Standardized Sub-Page UX Toolbar (Zoom, Table/Chart Toggle, Report Preview/CSV/PDF, Copy, Info, Detach, Scroll Pan) */}
        <div
          data-testid="longitudinal-subpage-toolbar"
          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-primary-mint/20 text-emerald-900 dark:text-primary-mint text-[10px] font-extrabold uppercase tracking-wider border border-primary-mint/40">
              Sub-Page: {selectedCategory}
            </span>

            {/* Table vs. Graphic Chart Toggle */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSubpageViewMode('table')}
                data-testid="subpage-view-table-btn"
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  subpageViewMode === 'table'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Table2 size={12} />
                <span>Detailed Table</span>
              </button>
              <button
                type="button"
                onClick={() => setSubpageViewMode('chart')}
                data-testid="subpage-view-chart-btn"
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  subpageViewMode === 'chart'
                    ? 'bg-primary-violet text-white shadow-2xs'
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart2 size={12} />
                <span>Graphic Chart</span>
              </button>
            </div>

            {/* Bi-Directional Scroll Pan Controls (When in Table View) */}
            {subpageViewMode === 'table' && (
              <div
                data-testid="matrix-scroll-nav-bar"
                className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="text-[10px] text-gray-400 uppercase mr-1 hidden sm:inline">Pan Table:</span>
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('left')}
                  data-testid="matrix-scroll-left"
                  title="Scroll table left"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-0.5"
                >
                  <ChevronLeft size={13} />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('right')}
                  data-testid="matrix-scroll-right"
                  title="Scroll table right to see latest years, CAGR & Source PDF"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-0.5 text-primary-violet dark:text-primary-mint"
                >
                  <span>Right</span>
                  <ChevronRight size={13} />
                </button>
                <span className="text-gray-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('top')}
                  data-testid="matrix-scroll-top"
                  title="Scroll to top of table"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollMatrix('bottom')}
                  data-testid="matrix-scroll-bottom"
                  title="Scroll to bottom of table"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Right Side of Level-2 Toolbar: Report (Preview, CSV, PDF), Zoom, Info, Copy, Detach */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Report Preview & Export Group */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-primary-violet/40">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                data-testid="subpage-report-btn"
                title="Open Multi-Year Audit Report Preview (with CSV & PDF export)"
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary-violet to-indigo-600 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs hover:opacity-95 transition cursor-pointer"
              >
                <FileText size={12} />
                <span>Report Preview</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSubpageCsv}
                data-testid="subpage-export-csv-btn"
                title={`Export ${selectedCategory} multi-year audit table to CSV`}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-1 transition cursor-pointer"
              >
                <Download size={12} />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(true);
                  setTimeout(() => handlePrint(), 150);
                }}
                data-testid="subpage-export-pdf-btn"
                title={`Export / Print ${selectedCategory} multi-year audit report as PDF`}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-1 transition cursor-pointer"
              >
                <Printer size={12} />
                <span>PDF</span>
              </button>
            </div>

            {/* Level-2 Sub-Page Accessibility Zoom Bar */}
            <AccessibilityZoomBar
              scale={subpageScale}
              onZoomIn={() => setSubpageScale((s) => Math.min(1.5, Math.round((s + 0.1) * 100) / 100))}
              onZoomOut={() => setSubpageScale((s) => Math.max(0.7, Math.round((s - 0.1) * 100) / 100))}
              onReset={() => setSubpageScale(1.0)}
              variant="compact"
              testIdPrefix="longitudinal-subpage"
            />

            {/* Level-2 Sub-Page Category Info Button */}
            <button
              type="button"
              onClick={() => setShowSubpageInfo(!showSubpageInfo)}
              data-testid="subpage-info-btn"
              title={`Explain ${selectedCategory} statutory audit scope`}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                showSubpageInfo
                  ? 'bg-primary-mint text-slate-900 border-primary-mint'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Info size={12} />
              <span className="hidden sm:inline">Info</span>
            </button>

            {/* Level-2 Sub-Page Copy Table Button */}
            <button
              type="button"
              onClick={() => handleCopySubpageTable(false)}
              data-testid="subpage-copy-btn"
              title={`Copy ${selectedCategory} multi-year table to clipboard`}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                subpageCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {subpageCopied ? <Check size={12} /> : <Copy size={12} />}
              <span>{subpageCopied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Level-2 Sub-Page Detach / Full-Screen Button */}
            <button
              type="button"
              onClick={() => setIsSubpageDetached(!isSubpageDetached)}
              data-testid="subpage-detach-btn"
              title={inSubpagePortal ? 'Restore sub-page inline' : `Detach ${selectedCategory} sub-page to full-screen workstation`}
              className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition cursor-pointer"
            >
              {inSubpagePortal ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Optional Level-2 Category Statutory Info Banner */}
        {showSubpageInfo && (
          <div
            data-testid="subpage-info-banner"
            className="p-3.5 rounded-xl bg-primary-mint/10 border border-primary-mint/30 flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Info size={14} className="text-primary-mint" />
                {catMeta.title}
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{catMeta.description}</p>
              <p className="font-mono text-[11px] text-emerald-800 dark:text-primary-mint">
                Authoritative Forms: {catMeta.forms}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubpageInfo(false)}
              className="p-1 text-gray-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Sub-Page Body: Detailed Scrollable Table vs. Comparative Graphic Chart */}
        <div style={{ zoom: subpageScale }}>
          {subpageViewMode === 'table' ? (
            <SmartTable<LongitudinalLineItem>
              tableId="longitudinal-matrix"
              title={`Multi-Year Tax Line Item Matrix (${selectedCategory})`}
              infoDescription={`Longitudinal comparison across ${years.length} years of filed tax returns with CAGR trend analysis. Use Left/Right pan buttons or horizontal scrollbar to view all years through ${latestYear}, CAGR, and Source PDF.`}
              columns={columns}
              rows={filteredItems}
              rowKey={(row) => row.key}
              scrollContainerRef={matrixScrollRef}
              stickyFirstColumn={true}
              scrollableViewportClassName={`overflow-x-auto overflow-y-auto w-full border border-gray-200 dark:border-slate-700 rounded-xl shadow-inner ${
                inSubpagePortal ? 'max-h-[72vh]' : 'max-h-[580px]'
              }`}
            />
          ) : (
            renderCategoryGraphicChart()
          )}
        </div>
      </div>
    );
  };

  const renderFullCardContent = (inLevel1Portal = false) => (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden ${
        inLevel1Portal ? 'w-full max-w-7xl max-h-[92vh] overflow-y-auto shadow-2xl' : ''
      }`}
      data-testid={inLevel1Portal ? 'longitudinal-level1-portal-card' : 'longitudinal-comparison-card'}
    >
      {/* Level-1 Top Banner & Standardized UX Header */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary-mint" size={18} />
            {years.length}-Year Longitudinal Tax Trajectory &amp; Historical Audit ({earliestYear} – {latestYear})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Scalable multi-year IRS Form 1040/540 progression, CAGR growth indicators, and cumulative loss shield tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveViewMode('matrix')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeViewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Multi-Column Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('macro')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeViewMode === 'macro'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Macro Trajectory
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('shields')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeViewMode === 'shields'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Loss Shield Ledger
            </button>
          </div>

          {/* Level-1 Accessibility Zoom Bar */}
          <AccessibilityZoomBar
            scale={level1Scale}
            onZoomIn={() => setLevel1Scale((s) => Math.min(1.5, Math.round((s + 0.1) * 100) / 100))}
            onZoomOut={() => setLevel1Scale((s) => Math.max(0.7, Math.round((s - 0.1) * 100) / 100))}
            onReset={() => setLevel1Scale(1.0)}
            variant="compact"
            testIdPrefix="longitudinal-level1"
          />

          {/* Canonical Info Explainer Icon */}
          <button
            type="button"
            onClick={() => setShowContainerInfo(!showContainerInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              showContainerInfo
                ? 'bg-primary-mint text-slate-900 border-primary-mint shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain multi-year audit methodology & statutory rules"
            data-testid="longitudinal-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* One-Click Copy Audit Summary */}
          <button
            type="button"
            onClick={handleCopyAuditSummary}
            className={`p-1.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              containerCopied
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
            }`}
            title="Copy audit summary to clipboard"
            data-testid="copy-audit-summary-btn"
          >
            {containerCopied ? <Check size={13} /> : <Copy size={13} />}
            <span>{containerCopied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          {/* Level-1 Download Full CSV */}
          <button
            type="button"
            onClick={handleDownloadFullCsv}
            data-testid="longitudinal-level1-download-btn"
            title="Download full 9-year longitudinal audit CSV"
            className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            <Download size={13} />
          </button>

          {/* Level-1 Print */}
          <button
            type="button"
            onClick={handlePrint}
            data-testid="longitudinal-level1-print-btn"
            title="Print multi-year longitudinal audit"
            className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            <Printer size={13} />
          </button>

          {/* Level-1 Detach / Full-Screen Portal */}
          <button
            type="button"
            onClick={() => setIsLevel1Detached(!isLevel1Detached)}
            data-testid="longitudinal-level1-detach-btn"
            title={inLevel1Portal ? 'Restore inline view' : 'Detach Multi-Year Audit to full-screen workstation'}
            className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            {inLevel1Portal ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Info Popover / Banner */}
      {showContainerInfo && (
        <div
          className="p-4 bg-primary-mint/5 border-b border-primary-mint/20 flex items-start justify-between gap-3 text-xs"
          data-testid="longitudinal-info-banner"
        >
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Info size={14} className="text-primary-mint" /> Longitudinal Tax Trajectory &amp; Multi-Year Audit Methodology
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Evaluates continuous multi-year filed returns across Federal Form 1040 and California Form 540. Calculates Compound Annual Growth Rate (CAGR = ((Latest / Earliest)^(1/N) - 1)) to detect systemic income creep, deduction phaseouts, and bracket shifts. Tracks forward loss shields under IRC §1212(b) (capital loss carryover) and IRC §469(g) (suspended passive activity losses).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowContainerInfo(false)}
            className="p-1 text-gray-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Zoomable Level-1 Body */}
      <div style={{ zoom: level1Scale }}>
        {/* 6 Macro KPI Summary Cards */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Annual AGI</span>
              <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                ${fmt(kpis.averageAnnualAgi)}
              </p>
              <span className="text-[10px] text-gray-500">{years.length} Year Avg</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peak AGI Year</span>
              <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ${fmt(kpis.peakAgiAmount)}
              </p>
              <span className="text-[10px] text-gray-500">{kpis.peakAgiYear} Peak</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lowest AGI Year</span>
              <p className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">
                ${fmt(kpis.lowestAgiAmount)}
              </p>
              <span className="text-[10px] text-gray-500">{kpis.lowestAgiYear} Baseline</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cumulative Taxes Paid</span>
              <p className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
                ${fmt(kpis.cumulativeTotalTaxesPaid)}
              </p>
              <span className="text-[10px] text-gray-500">Total Fed + CA</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Effective Rate</span>
              <p className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {kpis.averageEffectiveRatePct}%
              </p>
              <span className="text-[10px] text-gray-500">Fed + CA Combined</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <Shield size={10} /> Next Year Shield
              </span>
              <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ${fmt(kpis.activeLossShieldsUpcomingYear)}
              </p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Carryovers to Next Year</span>
            </div>
          </div>
        </div>

        {/* Mode 1: Multi-Column Matrix Sub-Page Workstation */}
        {activeViewMode === 'matrix' && renderMatrixSubpageSection(false)}

        {/* Mode 2: Macro Trajectory Table */}
        {activeViewMode === 'macro' && (
          <div className="p-6 overflow-x-auto">
            <table className="w-full min-w-max text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase tracking-wider font-semibold">
                  <StaticTh align="left" className="py-2.5 px-3">Tax Year</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">W-2 Wages</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">Adjusted Gross Income</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">YoY AGI Growth</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">Federal Tax</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">CA State Tax</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">Total Combined Tax</StaticTh>
                  <StaticTh align="right" className="py-2.5 px-3">Effective Rate</StaticTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-mono">
                {macroTrends.map((t) => (
                  <tr key={t.year} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar size={13} className="text-primary-mint" />
                      <span>{t.year}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{fmt(t.w2Wages)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(t.agi)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          t.yearOverYearAgiGrowthPct > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : t.yearOverYearAgiGrowthPct < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {t.yearOverYearAgiGrowthPct > 0 ? '+' : ''}
                        {t.yearOverYearAgiGrowthPct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{fmt(t.federalTax)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{fmt(t.californiaTax)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(t.totalCombinedTax)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                        {t.effectiveCombinedRatePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mode 3: Cumulative Loss Shield Ledger */}
        {activeViewMode === 'shields' && (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
              <p className="font-bold flex items-center gap-1.5">
                <Shield size={14} className="text-emerald-600" />
                Tax-Loss Shield Carryover Protection Engine
              </p>
              <p className="mt-1">
                Tracks cumulative capital loss carryovers (Schedule D Line 21) and suspended passive rental losses (Form 8582 Line 16) available to shield future capital gains and active/rental income.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase tracking-wider font-semibold">
                    <StaticTh align="left" className="py-2.5 px-3">Tax Filing Year</StaticTh>
                    <StaticTh align="right" className="py-2.5 px-3">Capital Loss Carryover</StaticTh>
                    <StaticTh align="right" className="py-2.5 px-3">Suspended Passive Loss</StaticTh>
                    <StaticTh align="right" className="py-2.5 px-3">Total Available Shield</StaticTh>
                    <StaticTh align="center" className="py-2.5 px-3">Audit Source</StaticTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-mono">
                  {lossShieldLedger.map((s) => (
                    <tr key={s.year} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-primary-mint" />
                        <span>{s.year} Return</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {fmt(s.capitalLossCarryover)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {fmt(s.suspendedPassiveRentalLoss)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(s.totalAvailableShield)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {onOpenDocumentViewer && (
                          <button
                            type="button"
                            onClick={() => onOpenDocumentViewer(s.year)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary-mint/20 hover:bg-primary-mint/30 text-primary-mint transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={10} /> View {s.year} PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {renderFullCardContent(false)}

      {/* Level-1 Full-Screen Detached Portal Modal */}
      {isLevel1Detached &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="longitudinal-level1-portal-modal"
            onClick={() => setIsLevel1Detached(false)}
          >
            <div className="w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
              {renderFullCardContent(true)}
            </div>
          </div>,
          document.body
        )}

      {/* Level-2 Sub-Page Full-Screen Detached Portal Modal */}
      {isSubpageDetached &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="longitudinal-subpage-portal-modal"
            onClick={() => setIsSubpageDetached(false)}
          >
            <div className="w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
              {renderMatrixSubpageSection(true)}
            </div>
          </div>,
          document.body
        )}

      {/* Multi-Year Audit Report Preview Modal (CSV & PDF Export + Preview) */}
      {isReportModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="multi-year-audit-report-modal"
            onClick={() => setIsReportModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Report Modal Header */}
              <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-slate-950">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-primary-violet" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Multi-Year Longitudinal Tax Audit Report Preview ({earliestYear} – {latestYear})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-mint/20 text-emerald-900 dark:text-primary-mint uppercase">
                      Filter: {selectedCategory} ({filteredItems.length} Line Items)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Executive fiduciary report with category filter switcher, 9-year comparative audit matrix, and one-click CSV / PDF export
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Report Zoom Bar */}
                  <AccessibilityZoomBar
                    scale={reportModalScale}
                    onZoomIn={() => setReportModalScale((s) => Math.min(1.5, Math.round((s + 0.1) * 100) / 100))}
                    onZoomOut={() => setReportModalScale((s) => Math.max(0.7, Math.round((s - 0.1) * 100) / 100))}
                    onReset={() => setReportModalScale(1.0)}
                    variant="compact"
                    testIdPrefix="audit-report-modal"
                  />

                  {/* Download CSV */}
                  <button
                    type="button"
                    onClick={handleDownloadSubpageCsv}
                    data-testid="report-modal-download-csv-btn"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>

                  {/* Export / Print PDF */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    data-testid="report-modal-print-pdf-btn"
                    className="px-3 py-1.5 rounded-xl bg-primary-violet hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Export / Print PDF</span>
                  </button>

                  {/* Copy Report */}
                  <button
                    type="button"
                    onClick={() => handleCopySubpageTable(true)}
                    data-testid="report-modal-copy-btn"
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      reportModalCopied
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {reportModalCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{reportModalCopied ? 'Copied Report!' : 'Copy Report'}</span>
                  </button>

                  {/* Close Modal */}
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    data-testid="close-audit-report-modal"
                    className="p-1.5 rounded-full text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* In-Modal Category Filter Bar */}
              <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 mr-1">Report Scope:</span>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      data-testid={`report-modal-filter-${cat}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {cat} ({categoryCounts[cat] ?? 0})
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-gray-500">
                  Generated by BunBau Fiduciary Tax Engine • {years.length} Filed Tax Years
                </span>
              </div>

              {/* Report Preview Body */}
              <div
                className="p-6 space-y-6 overflow-y-auto flex-1"
                style={{ zoom: reportModalScale }}
              >
                {/* Executive Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Average Annual AGI</span>
                    <p className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {fmt(kpis.averageAnnualAgi)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Cumulative Taxes Paid</span>
                    <p className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                      {fmt(kpis.cumulativeTotalTaxesPaid)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Effective Rate</span>
                    <p className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {kpis.averageEffectiveRatePct}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      Active Loss Shields
                    </span>
                    <p className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {fmt(kpis.activeLossShieldsUpcomingYear)}
                    </p>
                  </div>
                </div>

                {/* Detailed Report Table (Scrollable) */}
                <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-2xl">
                  <table className="w-full min-w-max text-xs text-left border-collapse">
                    <thead className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <StaticTh align="left" className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white sticky left-0 bg-gray-100 dark:bg-slate-800 z-10">
                          Line Item &amp; Form Reference
                        </StaticTh>
                        {years.map((yr) => (
                          <StaticTh key={yr} align="right" className="py-2.5 px-3 font-extrabold text-right font-mono text-slate-900 dark:text-white">
                            {yr}
                          </StaticTh>
                        ))}
                        <StaticTh align="right" className="py-2.5 px-3 font-extrabold text-right font-mono text-slate-900 dark:text-white">
                          CAGR ({years.length} Yrs)
                        </StaticTh>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredItems.map((item, idx) => (
                        <tr
                          key={item.key}
                          className={idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-gray-50/50 dark:bg-slate-900/40'}
                        >
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-inherit z-10">
                            <div>{item.label}</div>
                            <div className="text-[10px] font-mono text-gray-400">{item.formRef}</div>
                          </td>
                          {years.map((yr) => (
                            <td
                              key={yr}
                              className={`py-2 px-3 text-right font-mono ${
                                yr === latestYear ? 'font-extrabold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {fmt(item.valuesByYear[yr] || 0)}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-mono font-bold text-primary-violet dark:text-primary-mint">
                            {item.cagrPct !== 0 ? `${item.cagrPct > 0 ? '+' : ''}${item.cagrPct}%` : '0.0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Interactive Line Item Card Inspector Modal */}
      {selectedLineItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          data-testid="line-item-card-modal"
          onClick={() => setSelectedLineItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-mint/15 text-primary-mint uppercase">
                    {selectedLineItem.category}
                  </span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {selectedLineItem.formRef}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedLineItem.label}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Canonical Info Toggle */}
                <button
                  type="button"
                  onClick={() => setShowModalInfo(!showModalInfo)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                    showModalInfo
                      ? 'bg-primary-violet text-white border-primary-violet'
                      : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                  title="Explain line item calculation & statutory rules"
                  data-testid="modal-line-item-info-btn"
                >
                  <Info size={13} />
                  <span className="hidden sm:inline">Info</span>
                </button>

                {/* View Mode Toggle (Grid vs Chart) */}
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('grid')}
                    className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                      modalViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="View values in matrix grid"
                    data-testid="modal-view-grid-btn"
                  >
                    <Table2 size={12} />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('chart')}
                    className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                      modalViewMode === 'chart'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="View visual progression bar chart"
                    data-testid="modal-view-chart-btn"
                  >
                    <BarChart2 size={12} />
                    <span className="hidden sm:inline">Chart</span>
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedLineItem(null)}
                  className="p-2 text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  data-testid="close-line-item-modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Optional Statutory Info Banner */}
              {showModalInfo && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info size={13} className="text-purple-600" />
                    Statutory IRS Reference: {selectedLineItem.formRef}
                  </p>
                  <p className="text-purple-800 dark:text-purple-300">
                    Governed by IRS Form 1040/540 instructions. Historical data is reconciled across filed tax years to trace structural variance and tax optimization opportunities.
                  </p>
                </div>
              )}

              {/* Tax Insight Box */}
              {selectedLineItem.impactInsight && (
                <div className="p-4 bg-primary-mint/5 border border-primary-mint/20 rounded-2xl flex items-start gap-3 text-xs">
                  <Sparkles className="text-primary-mint shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Tax Analysis &amp; Statutory Impact:</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {selectedLineItem.impactInsight}
                    </p>
                  </div>
                </div>
              )}

              {/* Multi-Year Progression Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {years.length}-Year Historical Progression Matrix ({modalViewMode === 'chart' ? 'Visual Chart' : 'Grid'})
                  </h4>
                  <span className="text-xs font-mono font-bold text-primary-mint">
                    CAGR: {selectedLineItem.cagrPct !== 0 ? `${selectedLineItem.cagrPct > 0 ? '+' : ''}${selectedLineItem.cagrPct}%` : '0.0%'}
                  </span>
                </div>

                {modalViewMode === 'grid' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {years.map((yr) => {
                      const val = selectedLineItem.valuesByYear[yr] || 0;
                      const isLatest = yr === latestYear;
                      return (
                        <div
                          key={yr}
                          className={`p-2.5 rounded-xl border text-center ${
                            isLatest
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                              : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          <p className="text-[10px] font-mono opacity-70">{yr}</p>
                          <p className="text-xs font-mono font-bold mt-0.5 truncate">{fmt(val)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-slate-850 rounded-2xl border border-gray-200 dark:border-slate-700">
                    <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2">
                      {(() => {
                        const maxVal = Math.max(...years.map((yr) => Math.abs(selectedLineItem.valuesByYear[yr] || 0)), 1);
                        return years.map((yr) => {
                          const val = selectedLineItem.valuesByYear[yr] || 0;
                          const heightPct = Math.max(12, Math.round((Math.abs(val) / maxVal) * 100));
                          const isLatest = yr === latestYear;
                          return (
                            <div key={yr} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                              <span className="text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                {fmt(val)}
                              </span>
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                                  isLatest
                                    ? 'bg-primary-mint shadow-xs'
                                    : val < 0
                                    ? 'bg-rose-500/80'
                                    : 'bg-primary-violet/80 hover:bg-primary-violet'
                                }`}
                              />
                              <span className={`text-[10px] font-mono mt-1 ${isLatest ? 'font-bold text-primary-mint' : 'text-gray-400'}`}>
                                {yr}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* One-Click Document Deep-Links */}
              {(onOpenDocumentViewer || onOpenOriginalPdf) && (
                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText size={14} className="text-primary-violet" /> Source PDF Return Deep-Links &amp; Form Inspection
                    </span>
                    <span className="text-[11px] text-gray-500">Jump directly to exact form sheet or view authentic return</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onOpenDocumentViewer && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenDocumentViewer(
                              2025,
                              selectedLineItem.sourceDocPage2025,
                              selectedLineItem.targetSchedule,
                              selectedLineItem.key
                            );
                            setSelectedLineItem(null);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary-mint text-slate-900 hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          data-testid="jump-2025-pdf"
                        >
                          <Eye size={13} />
                          <span>
                            View 2025 {selectedLineItem.targetSchedule === 'schedule_b' ? 'Schedule B' : selectedLineItem.targetSchedule === 'schedule_d' ? 'Schedule D' : selectedLineItem.targetSchedule === 'schedule_e' ? 'Schedule E' : selectedLineItem.targetSchedule === 'form_8582' ? 'Form 8582' : selectedLineItem.targetSchedule === 'ca_540' ? 'CA Form 540' : 'Form 1040'} ({selectedLineItem.formRef})
                          </span>
                        </button>

                        {selectedLineItem.sourceDocPage2024 && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenDocumentViewer(
                                2024,
                                selectedLineItem.sourceDocPage2024,
                                selectedLineItem.targetSchedule,
                                selectedLineItem.key
                              );
                              setSelectedLineItem(null);
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                            data-testid="jump-2024-pdf"
                          >
                            <Eye size={13} />
                            <span>View 2024 Sheet</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* View Original Uploaded PDF Button */}
                    {onOpenOriginalPdf && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenOriginalPdf(2025);
                          setSelectedLineItem(null);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary-violet text-white hover:bg-purple-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        data-testid="view-original-pdf-btn"
                        title="Open authentic full-report PDF file for 2025 in detached/modal viewer"
                      >
                        <ExternalLink size={13} />
                        <span>View Original 2025 Return PDF (Full Report)</span>
                      </button>
                    )}

                    {onOpenDocumentViewer && (
                      <select
                        onChange={(e) => {
                          const yr = Number(e.target.value);
                          if (yr) {
                            const defaultPage = yr === 2024 ? (selectedLineItem.sourceDocPage2024 || 15) : (selectedLineItem.sourceDocPage2025 || 6);
                            onOpenDocumentViewer(yr, defaultPage, selectedLineItem.targetSchedule, selectedLineItem.key);
                            setSelectedLineItem(null);
                          }
                        }}
                        defaultValue=""
                        className="px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                      >
                        <option value="" disabled>Inspect other year...</option>
                        {years.map((yr) => (
                          <option key={yr} value={yr}>{yr} Return Sheet</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyLineItem(selectedLineItem)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${
                  modalCopied
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-gray-100'
                }`}
                title="Copy line item analysis to clipboard"
                data-testid="modal-copy-line-item-btn"
              >
                {modalCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{modalCopied ? 'Copied Analysis!' : 'Copy Line Analysis'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLineItem(null)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
