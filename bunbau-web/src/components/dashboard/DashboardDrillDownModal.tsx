'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  Copy,
  Check,
  Download,
  Info,
  Search,
  Filter,
  Table2,
  PieChart,
} from 'lucide-react';
import { SmartTable, SmartColumn } from '../common/SmartTable';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { DrillDownChartPanel } from './DrillDownChartPanel';
import type { DrillDownChart } from '../../lib/portfolio/apyCharts';

export interface DrillDownColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface DrillDownRow {
  id: string;
  institution?: string;
  cells: Record<string, string | number | React.ReactNode>;
  rawValues?: Record<string, string | number>;
}

export interface SummaryCardItem {
  label: string;
  value: string;
  colorClass?: string;
}

interface DashboardDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  infoDescription?: string;
  columns: DrillDownColumn[];
  rows: DrillDownRow[];
  summaryCards?: SummaryCardItem[];
  /** Optional chart view; receives the rows currently shown (after tab/search filters). */
  charts?: (rows: DrillDownRow[]) => DrillDownChart[];
  defaultView?: 'table' | 'pie';
  related?: { label: string; onOpen: () => void };
}

export function DashboardDrillDownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  infoDescription,
  columns,
  rows,
  summaryCards,
  charts,
  defaultView = 'table',
  related,
}: DashboardDrillDownModalProps) {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('ALL');
  const [view, setView] = useState<'table' | 'pie'>(charts ? defaultView : 'table');

  const modalRef = useRef<HTMLDivElement>(null);
  const sortedRowsRef = useRef<DrillDownRow[]>([]);

  // Keyboard navigation: Esc closes fullscreen or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen) return null;

  // Extract distinct institutions for filter pills
  const institutions = Array.from(
    new Set(rows.map((r) => r.institution).filter((inst): inst is string => !!inst && inst.trim() !== ''))
  );

  // Filter rows by institution and search query
  const filteredRows = rows.filter((row) => {
    if (selectedInstitution !== 'ALL' && row.institution !== selectedInstitution) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row.rawValues || row.cells).some((val) =>
      String(val || '').toLowerCase().includes(query)
    );
  });

  // Rows in the exact order currently shown on screen (rule S10: WYSIWYG export)
  const handleSortedRows = (sorted: DrillDownRow[]) => {
    sortedRowsRef.current = sorted;
  };
  const exportRows = (): DrillDownRow[] =>
    sortedRowsRef.current.length === filteredRows.length ? sortedRowsRef.current : filteredRows;

  // SmartTable column definitions: render the styled cell, sort by the raw value
  const smartColumns: SmartColumn<DrillDownRow>[] = columns.map((c) => ({
    key: c.key,
    label: c.label,
    align: c.align,
    render: (row) => row.cells[c.key] as React.ReactNode,
    sortValue: (row) => {
      const raw = row.rawValues ? row.rawValues[c.key] : row.cells[c.key];
      return typeof raw === 'object' ? undefined : raw;
    },
  }));

  // Copy table data to clipboard in TSV format
  const handleCopyTSV = async () => {
    const headerLine = columns.map((c) => c.label).join('\t');
    const dataLines = exportRows().map((r) =>
      columns
        .map((c) => {
          const raw = r.rawValues ? r.rawValues[c.key] : r.cells[c.key];
          return typeof raw === 'object' ? '' : String(raw ?? '');
        })
        .join('\t')
    );
    const tsvText = [headerLine, ...dataLines].join('\n');
    await navigator.clipboard.writeText(tsvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export clean CSV
  const handleExportCSV = () => {
    const escapeCsv = (str: any) => {
      const s = String(str ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const headerLine = columns.map((c) => escapeCsv(c.label)).join(',');
    const dataLines = exportRows().map((r) =>
      columns
        .map((c) => {
          const raw = r.rawValues ? r.rawValues[c.key] : r.cells[c.key];
          return escapeCsv(typeof raw === 'object' ? '' : raw);
        })
        .join(',')
    );
    const csvContent = [headerLine, ...dataLines].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.download = `${cleanName}_drilldown_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      <div
        className={`fixed z-50 transition-all flex items-center justify-center p-4 ${
          isFullscreen ? 'inset-0 p-0' : 'inset-4 md:inset-10'
        }`}
      >
        <div
          ref={modalRef}
          className={`bg-white dark:bg-[#0b1021] w-full h-full rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all ${
            isFullscreen ? 'rounded-none' : ''
          }`}
        >
          {/* Header Bar */}
          <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-900/70 border-b border-gray-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-mint/15 text-primary-mint flex items-center justify-center font-bold shrink-0">
                🔍
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                  {infoDescription && (
                    <button
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-gray-400 hover:text-primary-mint transition"
                      title="Calculation Details"
                    >
                      <Info size={15} />
                    </button>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            {/* UX Controls Toolbar */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <AccessibilityZoomBar
                scale={scale}
                onZoomIn={() => setScale((s) => Math.min(s + 0.1, 1.4))}
                onZoomOut={() => setScale((s) => Math.max(s - 0.1, 0.75))}
                onReset={() => setScale(1)}
                minScale={0.75}
                maxScale={1.4}
                testIdPrefix="drilldown"
              />

              {/* Copy TSV */}
              <button
                onClick={handleCopyTSV}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition flex items-center gap-1 text-xs font-semibold"
                title="Copy Table to Clipboard (Excel / TSV)"
                data-testid="drilldown-copy"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition flex items-center gap-1 text-xs font-semibold"
                title="Download CSV"
                data-testid="drilldown-export"
              >
                <Download size={15} />
                <span className="hidden sm:inline">CSV</span>
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition"
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                data-testid="drilldown-fullscreen"
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
                title="Close (Esc)"
                data-testid="drilldown-close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Info Banner Dropdown */}
          {showInfo && infoDescription && (
            <div className="bg-primary-mint/10 border-b border-primary-mint/20 p-3 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2 shrink-0">
              <Info size={16} className="text-primary-mint shrink-0 mt-0.5" />
              <div>{infoDescription}</div>
            </div>
          )}

          {/* Top Filter and Search Bar */}
          <div className="p-3 bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Institution Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setSelectedInstitution('ALL')}
                className={`px-3 py-1 text-xs rounded-full font-semibold whitespace-nowrap transition ${
                  selectedInstitution === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-primary-mint dark:text-slate-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All Institutions ({rows.length})
              </button>
              {institutions.map((inst) => {
                const isSelected = selectedInstitution === inst;
                const count = rows.filter((r) => r.institution === inst).length;
                return (
                  <button
                    key={inst}
                    onClick={() => setSelectedInstitution(inst)}
                    className={`px-3 py-1 text-xs rounded-full font-semibold whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-primary-mint dark:text-slate-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {inst} ({count})
                  </button>
                );
              })}
            </div>

            {/* Table / Pie view toggle */}
            {charts && (
              <div
                className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold"
                role="group"
                aria-label="View mode"
              >
                <button
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                  data-testid="drilldown-view-table"
                  className={`px-3 py-1 rounded-md flex items-center gap-1 transition ${
                    view === 'table'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Table2 size={13} /> Table
                </button>
                <button
                  onClick={() => setView('pie')}
                  aria-pressed={view === 'pie'}
                  data-testid="drilldown-view-pie"
                  className={`px-3 py-1 rounded-md flex items-center gap-1 transition ${
                    view === 'pie'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <PieChart size={13} /> Pie
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search holdings..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-mint dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Optional Summary Cards */}
          {summaryCards && summaryCards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50/50 dark:bg-slate-900/30 border-b border-gray-100 dark:border-slate-800 shrink-0">
              {summaryCards.map((sc, i) => (
                <div
                  key={i}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm"
                >
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                    {sc.label}
                  </span>
                  <div
                    className={`text-base font-bold font-mono mt-0.5 ${
                      sc.colorClass || 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {sc.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scrollable Table View with Typography Scaling */}
          <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-950 font-sans">
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${100 / scale}%`,
              }}
              className="transition-transform"
            >
              {view === 'pie' && charts ? (
                <>
                  <DrillDownChartPanel charts={charts(filteredRows)} />
                  {related && (
                    <button
                      onClick={related.onOpen}
                      className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition"
                      data-testid="drilldown-related"
                    >
                      {related.label} →
                    </button>
                  )}
                </>
              ) : (
              <SmartTable<DrillDownRow>
                tableId={`drilldown-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                title={title}
                infoDescription={infoDescription || subtitle}
                columns={smartColumns}
                rows={filteredRows}
                rowKey={(row, i) => row.id || String(i)}
                emptyMessage="No rows found matching current filters."
                onSortedRows={handleSortedRows}
                headClassName="sticky top-0 bg-gray-100 dark:bg-slate-900 z-10 border-b border-gray-200 dark:border-slate-800 font-semibold text-gray-600 dark:text-gray-400 uppercase text-[11px]"
                density="regular"
              />
              )}
              {view === 'table' && related && (
                <button
                  onClick={related.onOpen}
                  className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition"
                  data-testid="drilldown-related"
                >
                  {related.label} →
                </button>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-3 bg-gray-50 dark:bg-slate-900/70 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center text-xs text-gray-500 shrink-0">
            <div>
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRows.length}</span> of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{rows.length}</span> holdings
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
