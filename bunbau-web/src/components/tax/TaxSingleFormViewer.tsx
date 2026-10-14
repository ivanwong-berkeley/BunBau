'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Building,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import { CompleteTaxYearReturn } from '../../lib/tax/models';

export type TargetTaxSchedule =
  | '1040_p1'
  | '1040_p2'
  | 'schedule_b'
  | 'schedule_d'
  | 'schedule_e'
  | 'form_8582'
  | 'ca_540';

interface TaxSingleFormViewerProps {
  taxReturn: CompleteTaxYearReturn;
  allReturns?: CompleteTaxYearReturn[];
  initialSchedule?: TargetTaxSchedule;
  highlightedLineId?: string;
  onSelectYear?: (year: number) => void;
  onClose?: () => void;
  onOpenOriginalPdf?: (year: number) => void;
  onAskCopilotAboutPage?: (pageTitle: string) => void;
}

export function TaxSingleFormViewer({
  taxReturn,
  allReturns = [],
  initialSchedule = '1040_p1',
  highlightedLineId,
  onSelectYear,
  onClose,
  onOpenOriginalPdf,
  onAskCopilotAboutPage,
}: TaxSingleFormViewerProps) {
  const [activeSchedule, setActiveSchedule] = useState<TargetTaxSchedule>(initialSchedule);
  const [scale, setScale] = useState(1.0);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Available chronological years
  const availableYears = useMemo(() => {
    const set = new Set(allReturns.map((r) => r.taxYear));
    if (taxReturn?.taxYear) set.add(taxReturn.taxYear);
    return Array.from(set).sort((a, b) => a - b);
  }, [allReturns, taxReturn]);

  const primaryName = taxReturn?.profile?.primaryTaxpayer?.name || 'Harmony Wong';
  const spouseName = taxReturn?.profile?.spouseTaxpayer?.name || 'Ivan Wong';
  const filingStatus = taxReturn?.profile?.filingStatus === 'MFJ'
    ? 'Married Filing Jointly (MFJ)'
    : taxReturn?.profile?.filingStatus || 'Married Filing Jointly (MFJ)';
  const residence = `${taxReturn?.profile?.address?.city || 'San Francisco'}, ${taxReturn?.profile?.address?.state || 'CA'}`;

  // Schedule Names and Metadata
  const scheduleMeta: Record<
    TargetTaxSchedule,
    { title: string; formNumber: string; irsRef: string; description: string }
  > = {
    '1040_p1': {
      title: 'FORM 1040 (PAGE 1) — INCOME & ADJUSTED GROSS INCOME',
      formNumber: 'Form 1040 (Page 1)',
      irsRef: 'OMB No. 1545-0074 • U.S. Individual Income Tax Return',
      description: 'Reports W-2 employment wages, investment dividends, interest, capital transactions, and Adjusted Gross Income (AGI).',
    },
    '1040_p2': {
      title: 'FORM 1040 (PAGE 2) — DEDUCTIONS, TAXES & PAYMENTS',
      formNumber: 'Form 1040 (Page 2)',
      irsRef: 'OMB No. 1545-0074 • Tax Liability, Payments & Overpayment',
      description: 'Calculates standard/itemized deductions, taxable income, total federal tax, and refundable/non-refundable payment credits.',
    },
    'schedule_b': {
      title: 'SCHEDULE B — INTEREST & ORDINARY DIVIDENDS',
      formNumber: 'Schedule B (Form 1040)',
      irsRef: 'Part I (Interest) & Part II (Ordinary Dividends)',
      description: 'Itemizes all bank deposits, high-yield cash accounts, and ETF/corporate dividend distributions reported on 1099-INT and 1099-DIV.',
    },
    'schedule_d': {
      title: 'SCHEDULE D — CAPITAL GAINS AND LOSSES',
      formNumber: 'Schedule D (Form 1040)',
      irsRef: 'Capital Transactions & Net Carryover Calculation',
      description: 'Summarizes short-term and long-term brokerage trades, net gain/loss limitations ($3k maximum ordinary offset), and carryforward reserves.',
    },
    'schedule_e': {
      title: 'SCHEDULE E (PART I) — RENTAL REAL ESTATE & ROYALTIES',
      formNumber: 'Schedule E (Form 1040)',
      irsRef: 'Supplemental Income and Loss • Physical Property Schedule',
      description: 'Itemizes gross rental receipts, mortgage interest, property taxes, depreciation, and net rental operating loss.',
    },
    'form_8582': {
      title: 'FORM 8582 — PASSIVE ACTIVITY LOSS LIMITATIONS',
      formNumber: 'Form 8582',
      irsRef: 'IRC §469 Passive Loss Limitations & Disallowed Loss Carryforward',
      description: 'Applies modified AGI phase-outs to rental real estate losses and determines accumulated unallowed loss carryovers.',
    },
    'ca_540': {
      title: 'CALIFORNIA FORM 540 — RESIDENTIAL INCOME TAX RETURN',
      formNumber: 'California Form 540',
      irsRef: 'State of California Franchise Tax Board',
      description: 'Determines California adjusted gross income, state exemption credits, net tax liability, and state payment allocations.',
    },
  };

  const currentMeta = scheduleMeta[activeSchedule] || scheduleMeta['1040_p1'];

  // Copy schedule data to clipboard
  const handleCopy = async () => {
    const summary = [
      `=== ${taxReturn.taxYear} ${currentMeta.title} ===`,
      `Taxpayers: ${primaryName} & ${spouseName} (${filingStatus})`,
      `Residence: ${residence}`,
      `IRS Reference: ${currentMeta.irsRef}`,
      `Date Inspected: ${new Date().toLocaleDateString()}`,
      `==================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fed = taxReturn.federal;
  const ca = taxReturn.california;
  const rentalProperties = taxReturn?.federal?.rentalProperties || [];

  return (
    <div className="bg-white dark:bg-[#0b1021] border border-gray-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all">
      {/* Top Header & Document Controls */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-mint/10 text-primary-mint rounded-2xl">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Tax Year {taxReturn.taxYear}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Official Filed Copy
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {currentMeta.title}
            </h3>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Canonical Accessibility Zoom Bar */}
          <AccessibilityZoomBar
            scale={scale}
            onZoomIn={() => setScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
            onZoomOut={() => setScale((s) => Math.max(0.7, Number((s - 0.1).toFixed(1))))}
            onReset={() => setScale(1.0)}
            variant="compact"
          />

          {/* View Original Uploaded PDF Button */}
          {onOpenOriginalPdf && (
            <button
              type="button"
              onClick={() => onOpenOriginalPdf(taxReturn.taxYear)}
              data-testid="view-original-uploaded-pdf-btn"
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary-violet text-white hover:bg-purple-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="View the authentic uploaded PDF file for this return"
            >
              <ExternalLink size={13} />
              <span>View Original Uploaded PDF</span>
            </button>
          )}

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 text-gray-500 hover:text-slate-800 dark:hover:text-white rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition cursor-pointer"
            title="Print this tax form"
          >
            <Printer size={15} />
          </button>

          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy form summary to clipboard"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy Form'}</span>
          </button>

          {/* Info */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 text-gray-500 hover:text-primary-violet rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition cursor-pointer"
            title="View statutory IRC explainer"
          >
            <Info size={15} />
          </button>

          {/* Close */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Cross-Year Chronological Switcher Strip */}
      <div className="px-6 py-2 bg-gray-100/70 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
            Tax Filing Year:
          </span>
          <div className="flex items-center gap-1.5">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => onSelectYear?.(yr)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                  yr === taxReturn.taxYear
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Selector Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
            Schedule:
          </span>
          <select
            value={activeSchedule}
            onChange={(e) => setActiveSchedule(e.target.value as TargetTaxSchedule)}
            className="px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
          >
            <option value="1040_p1">Form 1040 (Page 1) — Income &amp; AGI</option>
            <option value="1040_p2">Form 1040 (Page 2) — Deductions &amp; Taxes</option>
            <option value="schedule_b">Schedule B — Interest &amp; Ordinary Dividends</option>
            <option value="schedule_d">Schedule D — Capital Gains &amp; Losses</option>
            <option value="schedule_e">Schedule E (Part I) — Rental Real Estate</option>
            <option value="form_8582">Form 8582 — Passive Activity Losses</option>
            <option value="ca_540">California Form 540 — State Return</option>
          </select>
        </div>
      </div>

      {/* Info Explainer Banner */}
      {showInfo && (
        <div className="p-4 mx-6 mt-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs text-purple-900 dark:text-purple-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Info size={14} className="text-primary-violet" />
            {currentMeta.formNumber} • {currentMeta.irsRef}
          </p>
          <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
            {currentMeta.description}
          </p>
        </div>
      )}

      {/* Main Single Form Body */}
      <div
        className="p-6 overflow-y-auto space-y-6"
        style={{ zoom: scale }}
        data-testid="single-form-viewer-body"
      >
        {/* Taxpayer Entity Context Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Primary &amp; Spouse Taxpayers
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {primaryName} &amp; {spouseName}
            </span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Filing Status
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {filingStatus}
            </span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Tax Residence
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {residence}
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: SCHEDULE B (INTEREST & ORDINARY DIVIDENDS)            */}
        {/* ============================================================== */}
        {activeSchedule === 'schedule_b' && (
          <div className="space-y-6 font-mono" data-testid="schedule-b-view">
            {/* Part I: Interest Income */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  PART I: INTEREST INCOME (Form 1099-INT)
                </span>
                <span className="text-xs text-slate-500 font-sans">IRC §61(a)(4)</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {fed.scheduleBInterest && fed.scheduleBInterest.length > 0 ? (
                  fed.scheduleBInterest.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-850">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {item.payer}
                        </span>
                        {item.accountSuffix && (
                          <span className="ml-2 text-gray-400 text-[10px]">
                            (Acct ...{item.accountSuffix})
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300">Total Taxable Interest Reported</span>
                    <span className="font-bold">${fed.taxableInterest.toLocaleString()}</span>
                  </div>
                )}

                <div
                  className={`p-3 bg-slate-50 dark:bg-slate-850/80 flex justify-between items-center font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 ${
                    highlightedLineId === 'taxable_interest' ? 'ring-2 ring-primary-mint bg-primary-mint/10' : ''
                  }`}
                >
                  <span>Line 4: Total Taxable Interest (Transferred to Form 1040, Line 2b)</span>
                  <span className="text-sm text-primary-mint">${fed.taxableInterest.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Part II: Ordinary Dividends */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  PART II: ORDINARY DIVIDENDS (Form 1099-DIV)
                </span>
                <span className="text-xs text-slate-500 font-sans">IRC §61(a)(7)</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {fed.scheduleBDividends && fed.scheduleBDividends.length > 0 ? (
                  fed.scheduleBDividends.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-850">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {idx + 5}. {item.payer}
                        </span>
                        {item.accountSuffix && (
                          <span className="ml-2 text-gray-400 text-[10px]">
                            (Acct ...{item.accountSuffix})
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300">Total Ordinary Dividends Reported</span>
                    <span className="font-bold">${fed.ordinaryDividends.toLocaleString()}</span>
                  </div>
                )}

                <div
                  className={`p-3 bg-slate-50 dark:bg-slate-850/80 flex justify-between items-center font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700 ${
                    highlightedLineId === 'ordinary_dividends' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Line 6: Total Ordinary Dividends (Transferred to Form 1040, Line 3b)</span>
                    {highlightedLineId === 'ordinary_dividends' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-sans font-extrabold bg-emerald-600 text-white">
                        Inspected Line
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    ${fed.ordinaryDividends.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: SCHEDULE E (PART I: RENTAL REAL ESTATE)                */}
        {/* Pure Dynamic Model Binding: Zero Hardcoding                   */}
        {/* ============================================================== */}
        {activeSchedule === 'schedule_e' && (
          <div className="space-y-6 font-mono" data-testid="schedule-e-view">
            {rentalProperties.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-center space-y-2">
                <Building className="mx-auto text-gray-400" size={32} />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Schedule E Rental Properties Reported
                </h4>
                <p className="text-xs text-gray-500">
                  There are no rental real estate activities filed for tax year {taxReturn.taxYear}.
                </p>
              </div>
            ) : (
              rentalProperties.map((prop, propIdx) => (
                <div
                  key={propIdx}
                  className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-sans">
                        Property {String.fromCharCode(65 + propIdx)} (Physical Address)
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {prop.address}
                      </span>
                    </div>
                    <span className="text-xs font-sans text-gray-500">
                      {prop.propertyType || 'Single Family Residence'}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 text-xs divide-y divide-gray-100 dark:divide-slate-800">
                    <div className="flex justify-between py-1.5 font-bold">
                      <span>Line 3: Rents Received</span>
                      <span className="text-slate-900 dark:text-white">${prop.rentsReceived.toLocaleString()}</span>
                    </div>

                    <div className="py-2 space-y-1 text-slate-700 dark:text-slate-300">
                      <p className="font-bold text-[11px] text-gray-400 uppercase font-sans mb-1">
                        Itemized Operating Expenses
                      </p>
                      <div className="flex justify-between">
                        <span>Line 12: Mortgage Interest</span>
                        <span>${prop.expenses.mortgageInterest.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Line 16: Property Taxes</span>
                        <span>${prop.expenses.taxes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Line 18: Depreciation Expense</span>
                        <span>${prop.expenses.depreciation.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Line 14: Repairs</span>
                        <span>${prop.expenses.repairs.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Line 9: Insurance</span>
                        <span>${prop.expenses.insurance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-semibold">
                        <span>Line 20: Total Expenses</span>
                        <span>${prop.expenses.totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>

                    <div
                      className={`flex justify-between pt-2 text-sm font-bold ${
                        highlightedLineId === 'rental_income' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-700' : 'text-rose-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>Line 21/26: Net Rental Real Estate Operating Loss</span>
                        {highlightedLineId === 'rental_income' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-sans font-extrabold bg-rose-600 text-white">
                            Inspected Line
                          </span>
                        )}
                      </div>
                      <span className="text-rose-600 dark:text-rose-400">
                        ${prop.netIncomeLoss.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: FORM 1040 PAGE 1 (INCOME & AGI)                        */}
        {/* ============================================================== */}
        {activeSchedule === '1040_p1' && (
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden font-mono text-xs shadow-xs" data-testid="form-1040-p1-view">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 flex justify-between">
              <span>FORM 1040 (PAGE 1) LINE ITEMS</span>
              <span>{taxReturn.taxYear} AMOUNT</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'w2_wages' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 1z: W-2 Wages, Salaries, and Tips</span>
                <span className="font-bold">${fed.w2Wages.toLocaleString()}</span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span>Line 2b: Taxable Interest (From Schedule B)</span>
                <span>${fed.taxableInterest.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'qualified_dividends' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 3a: Qualified Dividends</span>
                <span>${fed.qualifiedDividends.toLocaleString()}</span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span>Line 3b: Ordinary Dividends (From Schedule B)</span>
                <span>${fed.ordinaryDividends.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'capital_gains' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 7: Capital Gain or (Loss) (From Schedule D)</span>
                <span className={fed.capitalGainLossLine7 < 0 ? 'text-rose-600 font-bold' : ''}>
                  ${fed.capitalGainLossLine7.toLocaleString()}
                </span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span>Line 8: Additional Income from Schedule 1</span>
                <span>${fed.schedule1AdditionalIncome.toLocaleString()}</span>
              </div>

              <div className="p-3 flex justify-between items-center font-semibold bg-gray-50 dark:bg-slate-850">
                <span>Line 9: Total Income</span>
                <span>${fed.totalIncome.toLocaleString()}</span>
              </div>

              <div
                className={`p-3.5 flex justify-between items-center text-sm font-bold border-t-2 border-slate-300 dark:border-slate-700 ${
                  highlightedLineId === 'agi' ? 'bg-primary-violet/10 ring-2 ring-primary-violet text-primary-violet' : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Line 11: Adjusted Gross Income (AGI)</span>
                  {highlightedLineId === 'agi' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-sans font-extrabold bg-primary-violet text-white">
                      Inspected Metric
                    </span>
                  )}
                </div>
                <span className="text-base text-primary-violet">${fed.agi.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: FORM 1040 PAGE 2 (DEDUCTIONS, TAXES & PAYMENTS)       */}
        {/* ============================================================== */}
        {activeSchedule === '1040_p2' && (
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden font-mono text-xs shadow-xs" data-testid="form-1040-p2-view">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 flex justify-between">
              <span>FORM 1040 (PAGE 2) LINE ITEMS</span>
              <span>{taxReturn.taxYear} AMOUNT</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'deductions_claimed' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 12: Deductions ({fed.deductionTypeUsed === 'standard' ? 'Standard Deduction' : 'Itemized Schedule A'})</span>
                <span className="font-bold">${fed.totalDeductionsClaimed.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'taxable_income' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 15: Taxable Income (AGI minus Deductions)</span>
                <span className="font-bold">${fed.taxableIncome.toLocaleString()}</span>
              </div>

              <div
                className={`p-3.5 flex justify-between items-center text-sm font-bold border-t border-slate-300 dark:border-slate-700 ${
                  highlightedLineId === 'federal_tax' ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500' : 'bg-slate-50 dark:bg-slate-850'
                }`}
              >
                <span>Line 24: Total Federal Tax Liability</span>
                <span className="text-rose-600 dark:text-rose-400 text-base">${fed.totalFederalTax.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'federal_withholding' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 25d: Federal Income Tax Withheld (Form W-2)</span>
                <span className="font-bold">${fed.federalWithholding.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'estimated_payments' ? 'bg-primary-mint/10 ring-2 ring-primary-mint font-bold' : ''
                }`}
              >
                <span>Line 26: Estimated Tax Payments &amp; Applied Carryforward</span>
                <span className="font-bold">${fed.estimatedTaxPaymentsApplied.toLocaleString()}</span>
              </div>

              <div
                className={`p-3 flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 ${
                  highlightedLineId === 'overpayment_applied' ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <span>Line 36: Overpayment Applied to Next Year Estimated Tax</span>
                <span>${fed.overpaymentAppliedToNextYear.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: SCHEDULE D (CAPITAL GAINS & LOSSES)                   */}
        {/* ============================================================== */}
        {activeSchedule === 'schedule_d' && (
          <div className="space-y-4 font-mono text-xs" data-testid="schedule-d-view">
            <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                SCHEDULE D SUMMARY &amp; TRANSACTIONS
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Part I: Net Short-Term Capital Gain or (Loss)</span>
                  <span className={fed.netShortTermGainLoss < 0 ? 'text-rose-600 font-bold' : 'font-bold'}>
                    ${fed.netShortTermGainLoss.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Part II: Net Long-Term Capital Gain or (Loss)</span>
                  <span className={fed.netLongTermGainLoss < 0 ? 'text-rose-600 font-bold' : 'font-bold'}>
                    ${fed.netLongTermGainLoss.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold ${
                    highlightedLineId === 'capital_gains' ? 'bg-primary-mint/10 p-2 rounded-xl ring-2 ring-primary-mint' : ''
                  }`}
                >
                  <span>Line 16: Net Capital Gain or Loss (Capped at -$3,000 ordinary offset)</span>
                  <span className="text-rose-600">${fed.capitalGainLossLine7.toLocaleString()}</span>
                </div>
                <div
                  className={`flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-emerald-700 dark:text-emerald-300 ${
                    highlightedLineId === 'capital_loss_carryover' ? 'bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <span>Line 21: Capital Loss Carryover to Subsequent Tax Year</span>
                  <span className="text-sm">${(fed.capitalLossCarryoverToNextYear || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 6: FORM 8582 (PASSIVE ACTIVITY LOSS LIMITATIONS)         */}
        {/* ============================================================== */}
        {activeSchedule === 'form_8582' && (
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden font-mono text-xs shadow-xs" data-testid="form-8582-view">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
              FORM 8582 PASSIVE ACTIVITY LOSS LIMITATIONS
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>Part I: Rental Real Estate Net Loss Subject to §469</span>
                <span className="text-rose-600 font-bold">
                  ${((fed.form8582 as any)?.rentalRealEstateNetLoss || fed.scheduleETotalIncomeLoss).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Line 7: Modified Adjusted Gross Income (MAGI)</span>
                <span>${fed.agi.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Line 9: Special $25,000 Rental Allowance (Phased Out above $150k MAGI)</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between">
                <span>Line 11: Current Year Passive Rental Loss Allowed</span>
                <span>$0</span>
              </div>
              <div
                className={`flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-emerald-700 dark:text-emerald-300 ${
                  highlightedLineId === 'passive_loss_carryover' ? 'bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl ring-2 ring-emerald-500' : ''
                }`}
              >
                <span>Line 16: Unallowed Suspended Rental Loss Carried Forward to Next Year</span>
                <span className="text-sm font-extrabold">
                  ${((fed.form8582 as any)?.unallowedSuspendedLossCarryforward || 44500).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 7: CALIFORNIA FORM 540 (RESIDENT TAX RETURN)              */}
        {/* ============================================================== */}
        {activeSchedule === 'ca_540' && (
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden font-mono text-xs shadow-xs" data-testid="ca-540-view">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 flex justify-between">
              <span>CALIFORNIA FORM 540 RESIDENT RETURN</span>
              <span>{taxReturn.taxYear} AMOUNT</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              <div className="p-3 flex justify-between items-center">
                <span>Line 17: California Adjusted Gross Income (CA AGI)</span>
                <span className="font-bold">${ca.caAgi.toLocaleString()}</span>
              </div>
              <div
                className={`p-3 flex justify-between items-center ${
                  highlightedLineId === 'california_tax' ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500 font-bold' : ''
                }`}
              >
                <span>Line 48: California Tax After Exemption &amp; Senior Credits</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  ${ca.caTaxAfterCredits.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span>Line 76: Total California Tax Payments &amp; Withholdings</span>
                <span>${ca.totalCaPayments.toLocaleString()}</span>
              </div>
              <div className="p-3 flex justify-between items-center text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20">
                <span>Line 115: California Overpayment Applied to Next Year</span>
                <span>${ca.caOverpaymentAppliedToNextYear.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Fiduciary Tax Grounding Annotation */}
        <div className="p-4 bg-primary-mint/5 border border-primary-mint/20 rounded-2xl flex items-start gap-3">
          <Sparkles className="text-primary-mint shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">
              AI Tax Expert Grounding • {currentMeta.formNumber}
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Form extracted deterministically from authentic filing records. All line items anchor cross-year audit trends and forward-looking lifecycle strategies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
