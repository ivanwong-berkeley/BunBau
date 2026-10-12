'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Check, ChevronDown, Copy, Download, ExternalLink, FileText, ListChecks, Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { AllocationPlan, WaterfallStep } from '../../lib/strategist/allocationPlan';
import { ActionStatus, ExportMeta, StrategyReport, reportToMarkdown } from '../../lib/strategist/reportSchema';
import { downloadText, printReport, reportFilename } from '../../lib/strategist/exporters';
import { DisclaimerFooter, MarkdownBody } from './MarkdownBody';
import { StrategyCharts } from './StrategyCharts';
import { ActionFlow } from './ActionFlow';

export interface StrategyPackage {
  report: StrategyReport | null;
  meta: ExportMeta;
  plan: AllocationPlan;
  steps: WaterfallStep[];
  reportId?: string;
}

type Tab = 'report' | 'charts' | 'plan';
const ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75];

/**
 * Second-level accessibility menu for the report: zoom, copy, download (MD / PDF), detach, fullscreen.
 * The pane has a fixed height and scrolls, so the page never grows with the report.
 */
export function StrategyReportPanel({
  pkg,
  onStatus,
  onDetach,
  onCloseDetached,
  readOnly = false,
  heightClass = 'h-[62vh]',
}: {
  pkg: StrategyPackage;
  onStatus?: (id: string, s: ActionStatus) => void;
  onDetach?: () => void;
  /** Present only in the detached window: closes it and returns to the app. */
  onCloseDetached?: () => void;
  readOnly?: boolean;
  heightClass?: string;
}) {
  const [tab, setTab] = useState<Tab>('report');
  const [zoomIdx, setZoomIdx] = useState(2);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const scale = ZOOM_STEPS[zoomIdx];

  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen]);

  const md = () => (pkg.report ? reportToMarkdown(pkg.report, pkg.meta, pkg.steps) : '');
  const hasReport = !!pkg.report;

  const copy = async () => {
    await navigator.clipboard.writeText(md());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadMd = () => {
    downloadText(reportFilename(pkg.meta.version, 'md'), md());
    setMenu(false);
  };

  const downloadPdf = () => {
    setMenu(false);
    setPrinting(true); // render every section so the PDF contains everything
    setTimeout(() => {
      if (printRef.current) {
        const ok = printReport(printRef.current, reportFilename(pkg.meta.version, 'pdf').replace('.pdf', ''));
        setNotice(ok ? '' : 'Pop-up blocked: allow pop-ups to save as PDF.');
      }
      setPrinting(false);
    }, 900);
  };

  const Btn = ({ onClick, title, children, testId, disabled }: { onClick: () => void; title: string; children: React.ReactNode; testId: string; disabled?: boolean }) => (
    <button type="button" onClick={onClick} title={title} aria-label={title} data-testid={testId} disabled={disabled} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40">
      {children}
    </button>
  );

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      data-testid={`report-tab-${id}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${tab === id ? 'bg-primary-violet/15 text-primary-violet' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
    >
      {icon} {label}
    </button>
  );

  const sections = (all: boolean) => (
    <>
      {(all || tab === 'report') && (
        <section className="no-break">
          {all && <h2>Strategy report</h2>}
          {pkg.report ? (
            <>
              {pkg.report.headline && <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{pkg.report.headline}</h3>}
              {pkg.report.summary && <p className="text-sm font-medium mb-2">{pkg.report.summary}</p>}
              <MarkdownBody text={pkg.report.markdown} />
              {pkg.report.risks.length > 0 && (
                <div className="mt-3 rounded-lg border border-rose-300/50 bg-rose-50/60 dark:bg-rose-950/20 p-3">
                  <p className="text-xs font-bold uppercase text-rose-600 mb-1">Key risks</p>
                  <ul className="list-disc pl-5 text-xs space-y-0.5">{pkg.report.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500" data-testid="report-empty">No report yet. Use "Generate report" to create your first strategy report.</p>
          )}
        </section>
      )}
      {(all || tab === 'charts') && (
        <section className="mt-4">
          {all && <h2>Charts</h2>}
          <StrategyCharts plan={pkg.plan} steps={pkg.steps} targetApy={pkg.meta.targetApy} currentApy={pkg.meta.currentApy} />
        </section>
      )}
      {(all || tab === 'plan') && (
        <section className="mt-4">
          {all && <h2>Action plan</h2>}
          <ActionFlow actions={pkg.report?.actions || []} onStatus={onStatus} readOnly={readOnly || all} />
        </section>
      )}
      <DisclaimerFooter />
    </>
  );

  const wrapper = fullscreen ? 'fixed inset-0 z-[95] bg-white dark:bg-slate-900 p-5 flex flex-col' : 'flex flex-col';
  const bodyHeight = fullscreen ? 'flex-1' : heightClass;

  return (
    <div className={wrapper} data-testid="strategy-report-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700" data-testid="report-toolbar">
        <div className="flex gap-1">
          {tabBtn('report', 'Report', <FileText size={13} />)}
          {tabBtn('charts', 'Charts', <BarChart3 size={13} />)}
          {tabBtn('plan', 'Action plan', <ListChecks size={13} />)}
        </div>
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Report accessibility menu">
          <AccessibilityZoomBar
            scale={scale}
            onZoomIn={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            onZoomOut={() => setZoomIdx((i) => Math.max(0, i - 1))}
            onReset={() => setZoomIdx(2)}
            minScale={ZOOM_STEPS[0]}
            maxScale={ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            testIdPrefix="report"
            zoomOutTestId="report-zoom-out"
            zoomResetTestId="report-zoom-reset"
            zoomInTestId="report-zoom-in"
          />
          <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-0.5" />
          <Btn onClick={copy} title="Copy report as Markdown" testId="report-copy" disabled={!hasReport}>{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</Btn>
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} disabled={!hasReport} data-testid="report-download-menu" title="Download report" aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-0.5 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40">
              <Download size={14} /><ChevronDown size={11} />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-1 z-20 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl text-xs">
                <button role="menuitem" onClick={downloadMd} data-testid="report-download-md" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">Markdown (.md)</button>
                <button role="menuitem" onClick={downloadPdf} data-testid="report-download-pdf" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">PDF (print dialog)</button>
              </div>
            )}
          </div>
          {onDetach && <Btn onClick={onDetach} title="Open report in a separate window" testId="report-detach"><ExternalLink size={14} /></Btn>}
          <Btn onClick={() => setFullscreen((f) => !f)} title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'} testId="report-fullscreen">{fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</Btn>
          {onCloseDetached && <Btn onClick={onCloseDetached} title="Close window and return to the app" testId="report-close-detached"><X size={14} /></Btn>}
        </div>
      </div>
      {notice && <p className="text-xs text-rose-500 mt-1" role="alert">{notice}</p>}
      <div className={`${bodyHeight} overflow-y-auto pr-2 pt-3`} data-testid="report-scroll" style={{ zoom: scale } as React.CSSProperties}>
        {sections(false)}
      </div>
      {printing && (
        <div className="fixed -left-[9999px] top-0 w-[820px]" aria-hidden>
          <div ref={printRef}>{sections(true)}</div>
        </div>
      )}
    </div>
  );
}
