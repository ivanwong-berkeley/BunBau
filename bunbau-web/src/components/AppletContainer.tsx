'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, Copy, Check, Expand, ZoomIn, ZoomOut, RotateCcw, Download, Table2, BarChart2, X, Layers } from 'lucide-react';
import { AccessibilityZoomBar } from './common/AccessibilityZoomBar';

interface AppletContainerProps {
  title: string;
  infoDescription: string;
  lastUpdated?: string;
  children: React.ReactNode;
  tableComponent?: React.ReactNode;
  onDrillDown?: () => void;
}

function extractTableData(root: HTMLElement | null): { headers: string[]; rows: string[][] } | null {
  if (!root) return null;
  const table = root.querySelector('table');
  if (!table) return null;

  const headers: string[] = [];
  table.querySelectorAll('thead th').forEach((th) => {
    headers.push((th.textContent || '').trim());
  });

  const rows: string[][] = [];
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const row: string[] = [];
    tr.querySelectorAll('td, th').forEach((td) => {
      const text = (td.textContent || '').replace(/\s+/g, ' ').trim();
      row.push(text);
    });
    if (row.length > 0) rows.push(row);
  });

  table.querySelectorAll('tfoot tr').forEach((tr) => {
    const row: string[] = [];
    tr.querySelectorAll('td, th').forEach((td) => {
      row.push((td.textContent || '').replace(/\s+/g, ' ').trim());
    });
    if (row.length > 0) rows.push(row);
  });

  return { headers, rows };
}

export function AppletContainer({
  title,
  infoDescription,
  lastUpdated = 'Just now',
  children,
  tableComponent,
  onDrillDown,
}: AppletContainerProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [scale, setScale] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut to close fullscreen with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const contentRef = useRef<HTMLDivElement>(null);
  const hiddenTableRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);

  const getActiveOrHiddenTable = () => {
    return extractTableData(fullscreenContentRef.current) ||
      extractTableData(contentRef.current) ||
      extractTableData(hiddenTableRef.current);
  };

  const handleCopy = async () => {
    const data = getActiveOrHiddenTable();
    if (data && data.rows.length > 0) {
      const lines: string[] = [];
      if (data.headers.length > 0) lines.push(data.headers.join('\t'));
      for (const row of data.rows) lines.push(row.join('\t'));
      await navigator.clipboard.writeText(lines.join('\n'));
    } else {
      const text = contentRef.current?.innerText || title;
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = getActiveOrHiddenTable();
    if (!data || data.rows.length === 0) {
      alert(`No tabular data available to export for ${title}.`);
      return;
    }
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const lines: string[] = [];
    if (data.headers.length > 0) {
      lines.push(data.headers.map(escapeCsv).join(','));
    }
    for (const row of data.rows) {
      lines.push(row.map(escapeCsv).join(','));
    }
    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.download = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Fullscreen Portal View
  const fullscreenModal = (
    <div 
      className="fixed inset-0 z-[100] w-screen h-screen bg-white dark:bg-slate-900 p-8 overflow-auto flex flex-col shadow-2xl animate-in fade-in"
      data-testid={`fullscreen-modal-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
    >
      {/* Fullscreen Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b border-gray-200 dark:border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary-mint/10 text-primary-mint font-semibold">
            Fullscreen Mode
          </span>
          <p className="text-xs text-gray-400 hidden md:inline">{infoDescription}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {tableComponent && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setView('chart')} 
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition ${
                  view === 'chart' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-mint' 
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 size={14} /> Chart
              </button>
              <button 
                onClick={() => setView('table')} 
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition ${
                  view === 'table' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-mint' 
                    : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Table2 size={14} /> Table
              </button>
            </div>
          )}

          <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {tableComponent && (
            <button 
              onClick={handleExport} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}

          <button 
            onClick={toggleFullscreen} 
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary-violet hover:bg-violet-600 text-white rounded-xl shadow-md transition ml-2"
            title="Exit Fullscreen (Esc)"
          >
            <X size={15} /> Exit Fullscreen (Esc)
          </button>
        </div>
      </div>

      {/* Fullscreen Content Area */}
      <div ref={fullscreenContentRef} className="flex-1 overflow-auto">
        {view === 'chart' ? children : (tableComponent || <div className="p-4 text-center text-gray-500">No table data available.</div>)}
      </div>

      {/* Fullscreen Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs flex justify-between text-gray-400 shrink-0">
        <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 border rounded font-mono">Esc</kbd> to exit fullscreen</span>
        <span>Last updated: {lastUpdated}</span>
      </div>
    </div>
  );

  return (
    <>
      {isFullscreen && mounted && createPortal(fullscreenModal, document.body)}

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative flex flex-col h-full">
        {/* Hidden container to parse table data even when chart view is active */}
        {tableComponent && view === 'chart' && (
          <div ref={hiddenTableRef} className="hidden" aria-hidden="true">
            {tableComponent}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {onDrillDown && (
              <button
                onClick={onDrillDown}
                className="p-1 text-primary-mint hover:bg-primary-mint/10 rounded transition"
                title="Drill Down to Details"
                data-testid={`drilldown-btn-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <Layers size={15} />
              </button>
            )}
            <button onClick={() => setShowInfo(!showInfo)} className="text-gray-400 hover:text-primary-mint transition" title="Info">
              <Info size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <AccessibilityZoomBar
              scale={scale}
              onZoomIn={() => setScale((s) => Math.min(s + 0.1, 1.5))}
              onZoomOut={() => setScale((s) => Math.max(s - 0.1, 0.5))}
              onReset={() => setScale(1)}
              minScale={0.5}
              maxScale={1.5}
              variant="compact"
              testIdPrefix={`applet-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            />
            
            <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>
            
            {tableComponent && (
              <>
                <button 
                  onClick={() => setView('chart')} 
                  data-testid={`toggle-chart-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`p-1 rounded ${view === 'chart' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-mint' : 'text-gray-500 dark:text-slate-300'}`}
                  title="Chart View"
                >
                  <BarChart2 size={14} />
                </button>
                <button 
                  onClick={() => setView('table')} 
                  data-testid={`toggle-table-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`p-1 rounded ${view === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-mint' : 'text-gray-500 dark:text-slate-300'}`}
                  title="Table View"
                >
                  <Table2 size={14} />
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>
              </>
            )}

            <button 
              onClick={handleCopy} 
              data-testid={`copy-btn-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              className={`p-1 transition ${copied ? 'text-emerald-500' : 'hover:text-primary-mint dark:text-slate-300'}`} 
              title={copied ? "Copied!" : "Copy to Clipboard"}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            
            {tableComponent && (
              <button 
                onClick={handleExport} 
                data-testid={`export-btn-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className="p-1 hover:text-primary-mint dark:text-slate-300" 
                title="Export CSV"
              >
                <Download size={14} />
              </button>
            )}

            <button 
              onClick={toggleFullscreen} 
              className="p-1 hover:text-primary-mint dark:text-slate-300" 
              title="Toggle Fullscreen"
            >
              <Expand size={14} />
            </button>
          </div>
        </div>

        {/* Info Popover */}
        {showInfo && (
          <div className="mb-4 p-3 bg-primary-mint/10 border border-primary-mint/20 rounded-lg text-sm text-slate-800 dark:text-slate-200">
            <p>{infoDescription}</p>
          </div>
        )}

        {/* Content Body with Scale */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-hidden transition-transform origin-top-left" 
          style={{ transform: `scale(${scale})`, width: `${100 / scale}%`, height: `${100 / scale}%` }}
        >
          {view === 'chart' ? children : (tableComponent || <div className="p-4 text-center text-gray-500">No table data available.</div>)}
        </div>

        {/* Footer / Freshness */}
        <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-right text-gray-400">
          Last updated: {lastUpdated}
        </div>
      </div>
    </>
  );
}
