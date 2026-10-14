'use client';

import React, { useState } from 'react';
import {
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  Users,
  Info,
  Copy,
  Check,
  X,
  Layers,
  Table2,
} from 'lucide-react';
import { MedicareHealthcareCoordination } from '../../lib/tax/models';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface MedicareHealthPlanCardProps {
  medicare: MedicareHealthcareCoordination;
}

export function MedicareHealthPlanCard({ medicare }: MedicareHealthPlanCardProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const older = medicare.olderSpouse;
  const younger = medicare.youngerSpouse;
  const olderTurns65Year = older.turns65Date.split('-')[0];
  const employerName = younger.employerName || 'ViaPath Technologies inc.';

  const handleCopyCoordinationPlan = async () => {
    const text = [
      `=== MEDICARE & EMPLOYER HEALTHCARE COORDINATION ===`,
      `Primary Filer: ${older.name} (Turns 65 in ${olderTurns65Year})`,
      `Working Spouse: ${younger.name} (Employed at ${employerName})`,
      `• Initial Enrollment Period (IEP): ${older.iepWindowStart} to ${older.iepWindowEnd}`,
      `• Premium-Free Part A: Eligible based on 40 quarters of Medicare payroll tax contributions.`,
      `• Part B & Part D Delay: Eligible to delay penalty-free while ${younger.name} maintains active group coverage at ${employerName} (>20 workers).`,
      `• Special Enrollment Period (SEP): 8-month window upon retirement to enroll in Medicare Part B without lifetime penalty.`,
      `• Part D Creditable Coverage: Retain the annual Notice of Creditable Coverage issued each September by ${employerName}.`,
      `===================================================`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm mb-6 space-y-4"
      data-testid="medicare-health-card"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="text-rose-500" size={18} />
            Medicare &amp; Employer Health Coordination (The Age-Gap Dynamic)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {older.name} (Turns 65 in {olderTurns65Year}) • {younger.name} (Age {younger.ageWhenOlderSpouse65}, {employerName})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Info Button */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain Medicare coordination rules"
            data-testid="medicare-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="medicare-view-cards"
            >
              <Layers size={12} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="medicare-view-table"
            >
              <Table2 size={12} />
              <span>Table</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyCoordinationPlan}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy healthcare coordination plan"
            data-testid="medicare-copy-btn"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied Plan!' : 'Copy Plan'}</span>
          </button>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Penalty-Free Part B Delay Eligible
          </span>
        </div>
      </div>

      {/* Info Popover */}
      {showInfo && (
        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-950 dark:text-rose-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-rose-600" />
              Medicare Secondary Payer (MSP) &amp; Part B Delay Statutory Rules
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <p className="leading-relaxed">
            • <strong>Large Group Health Plan Exemption:</strong> When an employed spouse works for an organization with 20 or more employees (such as {employerName}), the employer group health plan remains primary. The non-employed spouse may defer Part B and Part D enrollment with zero cumulative late penalties.
          </p>
          <p className="leading-relaxed">
            • <strong>Special Enrollment Period (SEP):</strong> An 8-month window begins the month following cessation of employment or group coverage (whichever comes first) to enroll in Part B.
          </p>
          <p className="leading-relaxed">
            • <strong>Creditable Rx Coverage:</strong> Employer plan drug benefits must meet or exceed Medicare Part D standard actuarial values to prevent lifetime drug penalties.
          </p>
        </div>
      )}

      {/* VIEW 1: 3-Column Scenario Cards */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Primary Filer IEP Window */}
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-violet">
                <Users size={15} /> Primary Filer ({older.name})
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">Turns 65: {olderTurns65Year}</p>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>Initial Enrollment Period (IEP):</strong></p>
                <p className="font-mono text-slate-700 dark:text-slate-300">
                  {older.iepWindowStart} to {older.iepWindowEnd}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  ✓ Eligible for Premium-Free Part A
                </p>
              </div>
            </div>

            {/* Column 2: Working Spouse Group Coverage */}
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-mint">
                <ShieldCheck size={15} /> Spouse ({younger.name})
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">Age {younger.ageWhenOlderSpouse65} in {olderTurns65Year}</p>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>Employer Group Health:</strong></p>
                <p className="text-slate-700 dark:text-slate-300 font-semibold">{employerName}</p>
                <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  ${younger.employerGroupPlanVal.toLocaleString()} W-2 Code DD Value
                </p>
                <p>Employer has &gt;20 workers (Primary)</p>
              </div>
            </div>

            {/* Column 3: Coordination Strategy */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={15} /> Special Enrollment (SEP)
              </div>
              <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">8-Month Window</p>
              <p className="text-[11px] text-emerald-900 dark:text-emerald-300 leading-relaxed">
                {older.name} may delay Part B &amp; Part D without the standard 10%/year penalty while {younger.name} remains employed with group coverage at {employerName}.
              </p>
            </div>
          </div>

          {/* Part D Drug Coverage & Bridge Details */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-900 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <FileCheck size={14} /> Part D Shopping &amp; Pre-65 Bridge Health Insurance Advice
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {medicare.pre65BridgeAdvice}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-850">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  1. Part D Creditable Coverage Rule
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Each September, {employerName} provides an official <em>Notice of Creditable Coverage</em>. Retain this notice! It certifies drug benefits equal or exceed Medicare Part D, avoiding the 1%/month lifetime late enrollment penalty.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-850">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  2. Pre-65 Early Retirement Bridge
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  If the employed spouse retires prior to Medicare age 65, {older.name} transitions onto Medicare Part B + Medigap + Part D, while {younger.name} establishes an individual bridge policy (COBRA vs Covered California ACA exchange) until age 65.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Coordination Schedule Table */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl" data-testid="medicare-coordination-table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Category</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Entity / Parameter</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Statutory Provision</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Action &amp; Fiduciary Rationale</StaticTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-primary-violet">Part A Enrollment</td>
                <td className="py-2.5 px-3">{older.name} (Age 65 in {olderTurns65Year})</td>
                <td className="py-2.5 px-3 font-mono">Premium-Free</td>
                <td className="py-2.5 px-3">Enroll during 7-month IEP ({older.iepWindowStart} to {older.iepWindowEnd}).</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-emerald-600">Part B Delay</td>
                <td className="py-2.5 px-3">{younger.name} @ {employerName}</td>
                <td className="py-2.5 px-3 font-mono">IRC / MSP Rules (&gt;20 workers)</td>
                <td className="py-2.5 px-3">Delay Part B without 10%/year penalty while active group health coverage remains in place.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-purple-600">Part D Creditable</td>
                <td className="py-2.5 px-3">{employerName} Rx Plan</td>
                <td className="py-2.5 px-3 font-mono">Actuarial Equivalence</td>
                <td className="py-2.5 px-3">Retain annual September notice confirming Rx benefits equal or exceed Medicare Part D.</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-slate-850">
                <td className="py-2.5 px-3 font-semibold text-blue-600">Special Enrollment (SEP)</td>
                <td className="py-2.5 px-3">Household Post-Retirement</td>
                <td className="py-2.5 px-3 font-mono">8-Month Window</td>
                <td className="py-2.5 px-3">Enroll in Medicare Part B within 8 months of employment termination to avoid penalty.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
