'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Bookmark,
  X,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Printer,
  Download,
  Info,
  ExternalLink,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { CompleteTaxYearReturn } from '../../lib/tax/models';

interface BunBauDocumentViewerProps {
  taxReturn: CompleteTaxYearReturn;
  allReturns?: CompleteTaxYearReturn[];
  initialPage?: number;
  initialLineId?: string;
  onSelectYear?: (year: number) => void;
  onClose?: () => void;
  onAskCopilotAboutPage?: (pageNumber: number, pageTitle: string) => void;
}

const PAGE_HEIGHT_PX = 920; // Standard virtualized tax sheet height

export function BunBauDocumentViewer({
  taxReturn,
  allReturns = [],
  initialPage = 1,
  initialLineId,
  onSelectYear,
  onClose,
  onAskCopilotAboutPage,
}: BunBauDocumentViewerProps) {
  const [currentScrollPage, setCurrentScrollPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDetached, setIsDetached] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageInputVal, setPageInputVal] = useState(String(initialPage));
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(initialLineId || null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalPages = taxReturn.pdfDocumentMetadata.totalPages || 52;
  const bookmarks = taxReturn.pdfDocumentMetadata.pageBookmarks || {};

  // Deterministic schedule-to-page resolver
  const getScheduleTypeForPage = (pageNum: number): string => {
    const b1040p1 = bookmarks.form_1040_p1 ?? 1;
    const b1040p2 = bookmarks.form_1040_p2 ?? 2;
    const bSchB = bookmarks.schedule_b ?? 6;
    const bSchD = bookmarks.schedule_d ?? 8;
    const bSchA = bookmarks.schedule_a ?? 10;
    const bSchEp1 = bookmarks.schedule_e_p1 ?? 12;
    const bSchEp2 = bookmarks.schedule_e_p2 ?? 16;
    const b8582 = bookmarks.form_8582 ?? 20;
    const bCa540 = bookmarks.ca_form_540 ?? 32;

    if (pageNum <= b1040p1) return '1040_p1';
    if (pageNum <= b1040p2) return '1040_p2';
    if (pageNum < bSchB) return 'schedule_1';
    if (pageNum < bSchD) return 'schedule_b';
    if (pageNum < bSchA) return 'schedule_d';
    if (pageNum < bSchEp1) return 'schedule_a';
    if (pageNum < bSchEp2) return 'schedule_e_p1';
    if (pageNum < b8582) return 'schedule_e_p2';
    if (pageNum < bCa540) return 'form_8582';
    return 'ca_form_540';
  };

  // Comprehensive Table of Contents index (Federal + California forms)
  const comprehensiveToc = useMemo(() => {
    const list: { name: string; label: string; page: number; category: string }[] = [
      { name: 'form_1040_p1', label: 'Form 1040 (Page 1) - Income & AGI', page: bookmarks.form_1040_p1 || 1, category: 'Federal' },
      { name: 'form_1040_p2', label: 'Form 1040 (Page 2) - Deductions, Taxes & Overpayment', page: bookmarks.form_1040_p2 || 2, category: 'Federal' },
      { name: 'schedule_1', label: 'Schedule 1 - Additional Income & Adjustments', page: bookmarks.schedule_1 || 3, category: 'Federal' },
      { name: 'schedule_2', label: 'Schedule 2 - Additional Taxes (NIIT / SE)', page: bookmarks.schedule_2 || 4, category: 'Federal' },
      { name: 'schedule_3', label: 'Schedule 3 - Additional Credits & Payments', page: bookmarks.schedule_3 || 5, category: 'Federal' },
      { name: 'schedule_b', label: 'Schedule B - Interest & Ordinary Dividends', page: bookmarks.schedule_b || 6, category: 'Federal' },
      { name: 'schedule_d', label: 'Schedule D - Capital Gains & Loss Carryover', page: bookmarks.schedule_d || 8, category: 'Federal' },
      { name: 'schedule_a', label: 'Schedule A - Itemized Deductions (SALT)', page: bookmarks.schedule_a || 10, category: 'Federal' },
      { name: 'schedule_e_p1', label: 'Schedule E (Part I) - Rental Real Estate & Royalties', page: bookmarks.schedule_e_p1 || 12, category: 'Federal' },
      { name: 'schedule_e_p2', label: 'Schedule E (Part II) - Partnerships & S-Corps', page: bookmarks.schedule_e_p2 || 16, category: 'Federal' },
      { name: 'form_8949', label: 'Form 8949 - Sales and Other Dispositions of Capital Assets', page: bookmarks.form_8949 || 18, category: 'Federal' },
      { name: 'form_8582', label: 'Form 8582 - Passive Activity Loss Limitations', page: bookmarks.form_8582 || 20, category: 'Federal' },
      { name: 'form_8960', label: 'Form 8960 - Net Investment Income Tax (NIIT)', page: bookmarks.form_8960 || 30, category: 'Federal' },
      { name: 'ca_form_540', label: 'California Form 540 - Resident Income Tax Return (Line 48)', page: bookmarks.ca_form_540 || 32, category: 'California' },
      { name: 'ca_schedule_ca', label: 'California Schedule CA (540) - Adjustments & Deductions', page: bookmarks.ca_schedule_ca || 42, category: 'California' },
      { name: 'ca_schedule_d', label: 'California Schedule D (540) - CA Capital Gain or Loss', page: bookmarks.ca_schedule_d || 48, category: 'California' },
    ];

    // Filter by search query if any
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        String(item.page).includes(q)
    );
  }, [bookmarks, searchQuery]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync scroll on initial load or year change
  useEffect(() => {
    if (initialPage && scrollContainerRef.current) {
      const targetOffset = (initialPage - 1) * PAGE_HEIGHT_PX;
      scrollContainerRef.current.scrollTo({ top: targetOffset, behavior: 'smooth' });
      setCurrentScrollPage(initialPage);
      setPageInputVal(String(initialPage));
    }
  }, [initialPage, taxReturn.taxYear]);

  // Jump to specific page and line
  const jumpToPage = (pageNumber: number, lineId?: string) => {
    const clampedPage = Math.max(1, Math.min(pageNumber, totalPages));
    if (scrollContainerRef.current) {
      const targetOffset = (clampedPage - 1) * PAGE_HEIGHT_PX;
      scrollContainerRef.current.scrollTo({ top: targetOffset, behavior: 'smooth' });
    }
    setCurrentScrollPage(clampedPage);
    setPageInputVal(String(clampedPage));
    if (lineId) {
      setHighlightedLineId(lineId);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInputVal, 10);
    if (!isNaN(parsed)) {
      jumpToPage(parsed);
    } else {
      setPageInputVal(String(currentScrollPage));
    }
  };

  // Continuous Scroll Spy Listener
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const computedPage = Math.floor(scrollTop / PAGE_HEIGHT_PX) + 1;
    const clamped = Math.max(1, Math.min(computedPage, totalPages));
    if (clamped !== currentScrollPage) {
      setCurrentScrollPage(clamped);
      setPageInputVal(String(clamped));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownload = () => {
    const fileName = taxReturn.pdfDocumentMetadata.fileName || `Tax_Return_${taxReturn.taxYear}.pdf`;
    // Create simulated file download
    const blob = new Blob([`%PDF-1.7 BunBau Tax Vault Export: ${fileName}`], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Find bookmark label for active scrolled page
  const activeTocEntry = comprehensiveToc.find((item) => item.page === currentScrollPage);
  const currentBookmarkLabel = activeTocEntry
    ? activeTocEntry.label
    : `Page ${currentScrollPage} of ${totalPages}`;

  // Virtualization window: render active page +/- 2 pages in full DOM; others as lightweight placeholders
  const isPageInRenderWindow = (pageNumber: number) => {
    return Math.abs(pageNumber - currentScrollPage) <= 2;
  };

  const primaryName = taxReturn.profile?.primaryTaxpayer?.name || 'Harmony';
  const spouseName = taxReturn.profile?.spouseTaxpayer?.name || 'Ivan';

  const viewerElement = (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 border border-slate-700 shadow-2xl transition-all ${
        isDetached
          ? 'fixed inset-0 z-[100] rounded-none w-screen h-screen overflow-hidden'
          : 'w-full h-[800px] rounded-3xl overflow-hidden'
      }`}
      data-testid="bunbau-document-viewer"
    >
      {/* Top Workstation Banner when Detached (Matching Ingestion Workflow UX) */}
      {isDetached && (
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-mint/15 text-primary-mint rounded-xl border border-primary-mint/30">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Tax Document Workstation: {taxReturn.pdfDocumentMetadata.fileName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-mint/20 text-primary-mint border border-primary-mint/30">
                    Tax Year {taxReturn.taxYear}
                  </span>
                </h4>
              </div>
              <p className="text-xs text-slate-400">
                Full-Screen Multi-Year Audit &amp; Line-Item Examination Workstation (100% Real Estate)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDetached(false)}
              data-testid="viewer-reattach-btn"
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Return to embedded tab view"
            >
              <RotateCcw size={14} className="text-primary-mint" />
              <span>Attach / Dock</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              data-testid="viewer-open-window-btn"
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open standalone window"
            >
              <ExternalLink size={14} className="text-blue-400" />
              <span>Open in New Window</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDetached(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Close full-screen"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Comprehensive Player Toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between text-white shrink-0 select-none gap-2">
        {/* Left Section: Document Icon, Title & Multi-Year Switcher */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <FileText className="text-primary-mint shrink-0" size={20} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]" title={taxReturn.pdfDocumentMetadata.fileName}>
                {taxReturn.pdfDocumentMetadata.fileName}
              </span>

              {/* Compact Multi-Year Switcher (Dropdown to prevent crushing search box) */}
              {allReturns.length > 1 && onSelectYear ? (
                <div className="relative inline-flex items-center bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-700 shrink-0">
                  <Calendar size={12} className="text-primary-mint mr-1 shrink-0" />
                  <select
                    value={taxReturn.taxYear}
                    onChange={(e) => onSelectYear(Number(e.target.value))}
                    data-testid="viewer-year-select"
                    className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer pr-1"
                  >
                    {allReturns.map((r) => (
                      <option key={r.taxYear} value={r.taxYear} className="bg-slate-900 text-white font-mono">
                        {r.taxYear} Return
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-primary-mint/20 text-primary-mint border border-primary-mint/30 rounded-full shrink-0">
                  {taxReturn.taxYear} RETURN
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {currentBookmarkLabel}
            </p>
          </div>
        </div>

        {/* Center: Dedicated Uncrushed In-Viewer Keyword Search */}
        <div className="flex-1 min-w-[200px] max-w-sm relative mx-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            data-testid="viewer-keyword-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Form 540, 8582, line..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950/80 border border-slate-700 hover:border-slate-600 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-primary-mint transition font-sans shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right Section: Pagination, TOC Toggle, Zoom, Actions, Detach */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Jump-to-Page Pagination */}
          <div className="flex items-center bg-slate-950/60 rounded-xl p-1 border border-slate-700 text-xs font-mono">
            <button
              onClick={() => jumpToPage(currentScrollPage - 1)}
              disabled={currentScrollPage <= 1}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition"
              title="Previous Page"
              data-testid="viewer-prev-page"
            >
              <ChevronLeft size={16} />
            </button>
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 px-1">
              <input
                type="text"
                data-testid="viewer-page-input"
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                onBlur={() => {
                  const parsed = parseInt(pageInputVal, 10);
                  if (!isNaN(parsed)) jumpToPage(parsed);
                  else setPageInputVal(String(currentScrollPage));
                }}
                className="w-8 text-center bg-slate-800 border border-slate-600 rounded text-xs font-bold text-white py-0.5 focus:outline-none focus:border-primary-mint"
              />
              <span className="text-slate-500">/</span>
              <span className="text-slate-300 font-bold">{totalPages}</span>
            </form>
            <button
              onClick={() => jumpToPage(currentScrollPage + 1)}
              disabled={currentScrollPage >= totalPages}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded transition"
              title="Next Page"
              data-testid="viewer-next-page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Table of Contents (TOC) Toggle */}
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
              isTocOpen
                ? 'bg-primary-mint text-slate-900 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isTocOpen ? 'Hide Table of Contents' : 'Show Table of Contents'}
            data-testid="viewer-toc-toggle"
          >
            {isTocOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            <span className="hidden sm:inline">TOC</span>
          </button>

          {/* Canonical Accessibility Zoom Bar [-] [100%] [+] */}
          <AccessibilityZoomBar
            scale={scale}
            onZoomIn={() => setScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(1))))}
            onZoomOut={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(1))))}
            onReset={() => setScale(1.0)}
          />

          {/* Print Option */}
          <button
            onClick={handlePrint}
            data-testid="viewer-print-btn"
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            title="Print Tax Return"
          >
            <Printer size={16} />
          </button>

          {/* Download Option */}
          <button
            onClick={handleDownload}
            data-testid="viewer-download-btn"
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            title="Download PDF Document"
          >
            <Download size={16} />
          </button>

          {/* Document Information Option */}
          <button
            onClick={() => setShowInfoModal(true)}
            data-testid="viewer-info-btn"
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            title="Document Metadata & Cryptographic Details"
          >
            <Info size={16} />
          </button>

          {/* Detach to Full Page / Pop-Out Option */}
          {isDetached ? (
            <button
              onClick={() => setIsDetached(false)}
              data-testid="viewer-reattach-btn"
              className="p-2 rounded-xl transition bg-purple-600 text-white shadow-xs cursor-pointer"
              title="Re-dock / Attach View"
            >
              <Minimize2 size={16} />
            </button>
          ) : (
            <button
              onClick={() => setIsDetached(true)}
              data-testid="viewer-detach-btn"
              className="p-2 rounded-xl transition hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Detach to Full Page Workstation View"
            >
              <ExternalLink size={16} />
            </button>
          )}

          {/* Close button if provided */}
          {onClose && (
            <button
              onClick={onClose}
              data-testid="viewer-close-btn"
              className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition ml-1"
              title="Close Document Viewer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Document Body: Side TOC + Virtualized Document Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Docked Table of Contents (TOC) Sidebar */}
        {isTocOpen && (
          <div
            data-testid="viewer-toc-sidebar"
            className="w-72 sm:w-80 bg-slate-850 border-r border-slate-700 flex flex-col p-4 shadow-xl z-20 shrink-0 select-none overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3 shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Bookmark size={14} className="text-primary-mint" />
                Table of Contents (Forms)
              </h4>
              <button
                onClick={() => setIsTocOpen(false)}
                className="text-slate-400 hover:text-white transition"
                title="Collapse TOC"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {comprehensiveToc.map((item) => {
                const isCurrent = item.page === currentScrollPage;
                return (
                  <button
                    key={`${item.name}-${item.page}`}
                    onClick={() => jumpToPage(item.page)}
                    data-testid={`toc-item-${item.name}`}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between ${
                      isCurrent
                        ? 'bg-primary-mint/20 text-primary-mint font-bold border border-primary-mint/30 shadow-xs'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2 font-sans text-xs">{item.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        item.category === 'California'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      p. {item.page}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-700 text-[11px] text-slate-400 shrink-0 flex items-center justify-between">
              <span>{comprehensiveToc.length} Schedules Indexed</span>
              <span className="text-primary-mint">Form 540 Ready</span>
            </div>
          </div>
        )}

        {/* Continuous Scroll Virtualized Document Canvas (Contained Viewport) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col items-center gap-8 bg-slate-950/70"
          data-testid="viewer-scroll-canvas"
        >
          {Array.from({ length: totalPages }, (_, idx) => {
            const pageNum = idx + 1;
            const inWindow = isPageInRenderWindow(pageNum);
            const activeBookmark = comprehensiveToc.find((item) => item.page === pageNum);
            const scheduleType = getScheduleTypeForPage(pageNum);

            const getTitleForSchedule = (type: string, page: number): string => {
              switch (type) {
                case '1040_p1': return 'FORM 1040 (PAGE 1) — INCOME & ADJUSTED GROSS INCOME';
                case '1040_p2': return 'FORM 1040 (PAGE 2) — DEDUCTIONS, TAXES & OVERPAYMENT';
                case 'schedule_1': return 'SCHEDULE 1 — ADDITIONAL INCOME AND ADJUSTMENTS';
                case 'schedule_b': return 'SCHEDULE B — INTEREST & ORDINARY DIVIDENDS';
                case 'schedule_d': return 'SCHEDULE D — CAPITAL GAINS AND LOSSES';
                case 'schedule_a': return 'SCHEDULE A — ITEMIZED DEDUCTIONS (SALT)';
                case 'schedule_e_p1': return 'SCHEDULE E (PART I) — RENTAL REAL ESTATE & ROYALTIES';
                case 'schedule_e_p2': return 'SCHEDULE E (PART II) — PARTNERSHIPS & S-CORPS';
                case 'form_8582': return 'FORM 8582 — PASSIVE ACTIVITY LOSS LIMITATIONS';
                case 'ca_form_540': return 'CALIFORNIA FORM 540 — RESIDENT INCOME TAX RETURN';
                default: return `SCHEDULE & WORKSHEET ATTACHMENTS (PAGE ${page})`;
              }
            };

            const pageTitle = activeBookmark ? activeBookmark.label.toUpperCase() : getTitleForSchedule(scheduleType, pageNum);

            return (
              <div
                key={pageNum}
                id={`tax-doc-page-${pageNum}`}
                style={{
                  minHeight: `${PAGE_HEIGHT_PX}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className={`w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl border transition-all p-8 relative font-sans ${
                  currentScrollPage === pageNum
                    ? 'border-primary-mint/60 ring-1 ring-primary-mint/40'
                    : 'border-slate-800/80'
                }`}
                data-testid={`tax-page-${pageNum}`}
              >
                {/* Header Stamp */}
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                      {taxReturn.taxYear} U.S. &amp; CALIFORNIA TAX RETURN
                    </p>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {pageTitle}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                      OFFICIAL FILED COPY
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      Page {pageNum} of {totalPages}
                    </p>
                  </div>
                </div>

                {/* Page Content: High-fidelity sheets when in render window */}
                {inWindow ? (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                      <span className="font-medium text-slate-700">Taxpayers:</span>
                      <span className="font-bold text-slate-900">
                        {primaryName} &amp; {spouseName}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                      <span className="font-medium text-slate-700">Filing Status &amp; Residence:</span>
                      <span className="font-bold text-slate-900">
                        {taxReturn.profile?.filingStatus === 'MFJ' ? 'Married Filing Jointly (MFJ)' : taxReturn.profile?.filingStatus || 'MFJ'} • {taxReturn.profile?.address?.city || 'San Francisco'}, {taxReturn.profile?.address?.state || 'CA'} {taxReturn.profile?.address?.zip || '94111'}
                      </span>
                    </div>

                    {/* DETERMINISTIC MULTI-SCHEDULE DISPATCH */}
                    {(scheduleType === '1040_p1' || scheduleType === '1040_p2') && (
                      /* Form 1040 Page 1 & 2 */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>FORM 1040 KEY LINE ITEMS</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded transition ${
                            highlightedLineId === 'line-w2' || highlightedLineId === 'w2_wages' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <span>Line 1z: W-2 Wages &amp; Salaries</span>
                          <span className="font-bold">${taxReturn.federal.w2Wages.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded ${
                            highlightedLineId === 'taxable_interest' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <span>Line 2b: Taxable Interest (Schedule B)</span>
                          <span>${taxReturn.federal.taxableInterest.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded ${
                            highlightedLineId === 'qualified_dividends' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <span>Line 3a: Qualified Dividends</span>
                          <span>${taxReturn.federal.qualifiedDividends.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded ${
                            highlightedLineId === 'ordinary_dividends' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <span>Line 3b: Ordinary Dividends</span>
                          <span>${taxReturn.federal.ordinaryDividends.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded ${
                            highlightedLineId === 'line-capital-loss' || highlightedLineId === 'capital_gains' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold' : ''
                          }`}
                        >
                          <span>Line 7: Capital Gain or (Loss)</span>
                          <span className={taxReturn.federal.capitalGainLossLine7 < 0 ? 'text-rose-600 font-bold' : ''}>
                            ${taxReturn.federal.capitalGainLossLine7.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between border-t pt-1 font-bold ${
                            highlightedLineId === 'agi' ? 'ring-2 ring-primary-violet bg-violet-50 p-1 text-primary-violet' : ''
                          }`}
                        >
                          <span>Line 11: Adjusted Gross Income (AGI)</span>
                          <span className="text-primary-violet">${taxReturn.federal.agi.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between ${
                            highlightedLineId === 'deductions_claimed' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold p-1 rounded' : ''
                          }`}
                        >
                          <span>Line 12: Deductions ({taxReturn.federal.deductionTypeUsed})</span>
                          <span>${taxReturn.federal.totalDeductionsClaimed.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between ${
                            highlightedLineId === 'taxable_income' ? 'ring-2 ring-emerald-500 bg-emerald-50 font-bold p-1 rounded' : ''
                          }`}
                        >
                          <span>Line 15: Taxable Income</span>
                          <span>${taxReturn.federal.taxableIncome.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between border-t pt-1 font-bold text-slate-900 ${
                            highlightedLineId === 'federal_tax' || highlightedLineId === 'total_combined_tax' ? 'ring-2 ring-rose-500 bg-rose-50 p-1 text-rose-800' : ''
                          }`}
                        >
                          <span>Line 24: Total Federal Tax</span>
                          <span className="text-rose-700">${taxReturn.federal.totalFederalTax.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between text-emerald-700 font-bold ${
                            highlightedLineId === 'overpayment_applied' ? 'ring-2 ring-emerald-500 bg-emerald-50 p-1' : ''
                          }`}
                        >
                          <span>Line 34: Overpayment Applied to Next Year</span>
                          <span>${taxReturn.federal.overpaymentAppliedToNextYear.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {scheduleType === 'schedule_1' && (
                      /* Schedule 1 Additional Income & Adjustments */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>SCHEDULE 1 — ADDITIONAL INCOME AND ADJUSTMENTS</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part I Line 5: Rental Real Estate, Royalties, Partnerships (Sched E)</span>
                          <span className="font-bold text-rose-700">${taxReturn.federal.scheduleETotalIncomeLoss.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part I Line 10: Total Additional Income</span>
                          <span>${taxReturn.federal.schedule1AdditionalIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span>Part II Line 26: Total Adjustments to Income</span>
                          <span>${taxReturn.federal.adjustmentsToIncome.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {scheduleType === 'schedule_b' && (
                      /* Schedule B Interest & Ordinary Dividends - ZERO Schedule E Bleed! */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-4 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>SCHEDULE B — INTEREST &amp; ORDINARY DIVIDENDS</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>

                        {/* Part I Interest */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-bold text-slate-700 border-b border-dashed pb-1">
                            <span>Part I — Interest Income</span>
                            <span>Amount</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>Citibank High Yield Cash Deposit (1099-INT)</span>
                            <span>${Math.round(((taxReturn.federal.taxableInterest ?? 0) * 0.65) || 1240).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>Fidelity Government Cash Reserves (1099-INT)</span>
                            <span>${Math.round(((taxReturn.federal.taxableInterest ?? 0) * 0.35) || 668).toLocaleString()}</span>
                          </div>
                          <div
                            className={`flex justify-between p-1 rounded font-bold border-t ${
                              highlightedLineId === 'line-interest' || highlightedLineId === 'taxable_interest'
                                ? 'ring-2 ring-primary-mint bg-primary-mint/10'
                                : 'bg-slate-50'
                            }`}
                          >
                            <span>Line 4: Total Taxable Interest</span>
                            <span className="font-bold text-slate-900">${taxReturn.federal.taxableInterest.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Part II Ordinary Dividends */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between font-bold text-slate-700 border-b border-dashed pb-1">
                            <span>Part II — Ordinary Dividends</span>
                            <span>Amount</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>Fidelity Brokerage (Index &amp; ETF Distributions)</span>
                            <span>${Math.round(((taxReturn.federal.ordinaryDividends ?? 0) * 0.58) || 4600).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>Vanguard Brokerage (VOO / VTI Distributions)</span>
                            <span>${Math.round(((taxReturn.federal.ordinaryDividends ?? 0) * 0.28) || 2200).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>Webull Financial LLC (1099-DIV)</span>
                            <span>${Math.round(((taxReturn.federal.ordinaryDividends ?? 0) * 0.14) || 1100).toLocaleString()}</span>
                          </div>
                          <div
                            className={`flex justify-between p-1 rounded font-bold border-t ${
                              highlightedLineId === 'line-dividends' || highlightedLineId === 'ordinary_dividends'
                                ? 'ring-2 ring-primary-mint bg-primary-mint/10'
                                : 'bg-emerald-50 text-emerald-900'
                            }`}
                          >
                            <span>Line 6: Total Ordinary Dividends</span>
                            <span className="font-bold">${taxReturn.federal.ordinaryDividends.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Part III Foreign Accounts */}
                        <div className="pt-2 text-[11px] text-slate-500 border-t">
                          <p className="font-bold text-slate-700">Part III — Foreign Accounts and Trusts</p>
                          <p>Line 7a: Financial interest in foreign financial accounts? <strong>No</strong></p>
                          <p>Line 8: Received distribution from, or grantor of, a foreign trust? <strong>No</strong></p>
                        </div>
                      </div>
                    )}

                    {scheduleType === 'schedule_d' && (
                      /* Schedule D Capital Gains & Losses */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>SCHEDULE D — CAPITAL GAINS AND LOSSES</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part I: Net Short-Term Capital Gain / (Loss)</span>
                          <span className="font-bold">${taxReturn.federal.capitalGainLossLine7.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part II: Net Long-Term Capital Gain / (Loss)</span>
                          <span>$0</span>
                        </div>
                        <div className="flex justify-between bg-amber-50 p-1 rounded font-bold text-amber-900">
                          <span>Line 21: Allowable Ordinary Loss Deduction (Max $3,000 limit)</span>
                          <span>-$3,000</span>
                        </div>
                        <div
                          className={`flex justify-between border-t pt-1 font-bold ${
                            highlightedLineId === 'capital_loss_carryover' || highlightedLineId === 'capital_gains'
                              ? 'ring-2 ring-emerald-500 bg-emerald-50 p-1 text-emerald-900'
                              : 'text-emerald-800'
                          }`}
                        >
                          <span>Line 21: Capital Loss Carryover to Next Year (Loss Shield):</span>
                          <span>${taxReturn.federal.capitalLossCarryoverToNextYear.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {scheduleType === 'schedule_a' && (
                      /* Schedule A Itemized Deductions */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>SCHEDULE A — ITEMIZED DEDUCTIONS</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Line 5e: State and Local Income Taxes (SALT Cap)</span>
                          <span>${Math.min(10000, taxReturn.federal.itemizedDeductions?.totalSaltPaid || 10000).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Line 8e: Home Mortgage Interest</span>
                          <span>${(taxReturn.federal.itemizedDeductions?.homeMortgageInterest || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Line 14: Charitable Contributions</span>
                          <span>${(taxReturn.federal.itemizedDeductions?.totalCharitableGifts || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-bold">
                          <span>Line 17: Total Itemized Deductions</span>
                          <span>${taxReturn.federal.totalDeductionsClaimed.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {(scheduleType === 'schedule_e_p1' || scheduleType === 'schedule_e_p2') && (
                      /* Schedule E Rental Real Estate & Royalties */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>
                            SCHEDULE E (PART I) / RENTAL REAL ESTATE ({taxReturn.federal.rentalProperties[0]?.address?.toUpperCase() || 'RESIDENTIAL PROPERTY'})
                          </span>
                          <span>AMOUNT</span>
                        </div>
                        {taxReturn.federal.rentalProperties.length > 0 ? (
                          taxReturn.federal.rentalProperties.map((prop, pIdx) => (
                            <div key={pIdx} className="space-y-2">
                              <div className="flex justify-between text-slate-600 font-bold border-b pb-0.5">
                                <span>Property {String.fromCharCode(65 + pIdx)}: {prop.address}</span>
                                <span>{prop.propertyType || 'Single Family Residence'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Line 3: Gross Rents Received:</span>
                                <span className="font-bold">${prop.rentsReceived.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Line 12: Mortgage Interest:</span>
                                <span>${prop.expenses.mortgageInterest.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Line 16: Property Taxes:</span>
                                <span>${prop.expenses.taxes.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Line 18: Depreciation Expense:</span>
                                <span>${prop.expenses.depreciation.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Line 20: Total Operating Expenses:</span>
                                <span>${prop.expenses.totalExpenses.toLocaleString()}</span>
                              </div>
                              <div
                                className={`flex justify-between border-t pt-1 font-bold ${
                                  highlightedLineId === 'rental_income' ? 'ring-2 ring-rose-500 bg-rose-50 p-1 text-rose-800' : 'text-rose-700'
                                }`}
                              >
                                <span>Line 21/26: Total Rental Real Estate Net Loss:</span>
                                <span>${prop.netIncomeLoss.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            <p>No Rental Real Estate Properties Reported</p>
                          </div>
                        )}
                      </div>
                    )}

                    {scheduleType === 'form_8582' && (
                      /* Form 8582 Passive Activity Loss Limitations */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>FORM 8582 — PASSIVE ACTIVITY LOSS LIMITATIONS</span>
                          <span>{taxReturn.taxYear} AMOUNT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part I: Total Rental Real Estate Passive Losses:</span>
                          <span className="font-bold text-rose-700">${taxReturn.federal.form8582.rentalRealEstateNetLoss.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Part II: Special $25,000 Allowance (Phased out if MAGI &gt; $150k):</span>
                          <span>$0</span>
                        </div>
                        <div
                          className={`flex justify-between border-t pt-1 font-bold ${
                            highlightedLineId === 'passive_loss_carryover'
                              ? 'ring-2 ring-primary-mint bg-primary-mint/10 p-1 text-emerald-900'
                              : 'text-emerald-800'
                          }`}
                        >
                          <span>Line 16: Unallowed Suspended Loss Carryforward Reserve:</span>
                          <span>${taxReturn.federal.form8582.unallowedSuspendedLossCarryforward.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {scheduleType === 'ca_form_540' && (
                      /* California Form 540 Resident Return & Worksheets */
                      <div className="border border-slate-300 rounded-xl p-4 space-y-3 font-mono">
                        <div className="flex justify-between border-b pb-1 font-bold text-slate-800">
                          <span>CALIFORNIA FORM 540 RESIDENT RETURN</span>
                          <span>AMOUNT</span>
                        </div>
                        <div className="flex justify-between">
                          <span>California Adjusted Gross Income (Line 17):</span>
                          <span className="font-bold">${taxReturn.california.caAgi.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>California Deductions (Line 18):</span>
                          <span>${taxReturn.california.caItemizedDeductions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>California Taxable Income (Line 19):</span>
                          <span className="font-bold">${taxReturn.california.caTaxableIncome.toLocaleString()}</span>
                        </div>
                        <div
                          className={`flex justify-between p-1 rounded font-bold border-t ${
                            highlightedLineId === 'california_tax'
                              ? 'ring-2 ring-amber-500 bg-amber-50 text-amber-900'
                              : 'bg-amber-50/50 text-amber-900'
                          }`}
                        >
                          <span>Line 48: California Tax After Exemption Credits:</span>
                          <span className="text-rose-700 font-bold">${taxReturn.california.caTaxAfterCredits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Line 71: California Income Tax Withheld:</span>
                          <span>${taxReturn.california.caWithholding.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total California Payments (Line 76):</span>
                          <span>${taxReturn.california.totalCaPayments.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-bold text-emerald-700">
                          <span>California Overpayment Applied to Next Year:</span>
                          <span>${taxReturn.california.caOverpaymentAppliedToNextYear.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* AI Fiduciary Annotation Card */}
                    <div className="p-3 bg-primary-mint/5 border border-primary-mint/20 rounded-xl flex items-start gap-2.5">
                      <Sparkles size={16} className="text-primary-mint shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">AI Tax Expert Grounding</p>
                        <p className="text-[11px] text-slate-600">
                          Deterministic tax extraction anchors multi-year comparisons directly in page {pageNum}. You can scroll freely up or down to inspect surrounding forms.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Lightweight Virtualized Placeholder */
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400">
                    <p className="font-mono text-sm font-semibold">Page {pageNum} (Scroll to render)</p>
                    <p className="text-xs mt-1">{pageTitle}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Information Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" data-testid="viewer-info-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="text-primary-mint" size={18} />
                <h3 className="font-bold text-sm">Tax Document Metadata</h3>
              </div>
              <button onClick={() => setShowInfoModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">File Name:</span>
                <span className="font-bold text-slate-200 truncate max-w-[200px]" title={taxReturn.pdfDocumentMetadata.fileName}>
                  {taxReturn.pdfDocumentMetadata.fileName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Tax Year:</span>
                <span className="font-bold text-emerald-400">{taxReturn.taxYear}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Primary Taxpayer:</span>
                <span className="font-bold text-slate-200">{primaryName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Spouse:</span>
                <span className="font-bold text-slate-200">{spouseName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Filing Status:</span>
                <span>Married Filing Jointly (MFJ)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Pages:</span>
                <span>{totalPages} Pages</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">File Size:</span>
                <span>{(taxReturn.pdfDocumentMetadata.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">SHA-256 Hash:</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={taxReturn.pdfDocumentMetadata.sha256Hash}>
                  {taxReturn.pdfDocumentMetadata.sha256Hash}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Ingestion Timestamp:</span>
                <span className="text-[10px] text-slate-400">{taxReturn.pdfDocumentMetadata.uploadedAt}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isDetached && mounted && typeof document !== 'undefined') {
    return (
      <>
        <div
          data-testid="viewer-detached-placeholder"
          className="w-full h-32 rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 select-none"
        >
          <div className="flex items-center gap-2 text-primary-mint font-semibold">
            <FileText size={16} />
            <span>Document Viewer Detached in Full-Screen Workstation Window</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Currently examining {taxReturn.taxYear} tax filing in unconstrained full display mode.
          </p>
          <button
            onClick={() => setIsDetached(false)}
            data-testid="viewer-dock-back-btn"
            className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition text-xs font-semibold cursor-pointer"
          >
            Re-dock to Workspace
          </button>
        </div>
        {createPortal(viewerElement, document.body)}
      </>
    );
  }

  return viewerElement;
}
