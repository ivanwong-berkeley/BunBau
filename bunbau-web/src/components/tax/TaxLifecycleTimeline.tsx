'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  Copy,
  Check,
  X,
  Layers,
  Table2,
  FileText,
} from 'lucide-react';
import { LifePlanningPackage, StrategicMilestone } from '../../lib/tax/models';
import { StaticTh } from '../common/SortableHeader';
import { SmartTable } from '../common/SmartTable';

interface TaxLifecycleTimelineProps {
  lifePlan: LifePlanningPackage;
  taxpayerLabels?: string;
}

export function TaxLifecycleTimeline({ lifePlan, taxpayerLabels }: TaxLifecycleTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<StrategicMilestone | null>(lifePlan.timeline[0]);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [showInfo, setShowInfo] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const milestones = lifePlan.timeline;
  const older = lifePlan.medicare.olderSpouse;
  const younger = lifePlan.medicare.youngerSpouse;
  const defaultLabels = `${older.name} • ${younger.name} (${younger.employerName || 'ViaPath Technologies inc.'})`;

  const handleCopyAllActions = async () => {
    const lines = [
      `=== STRATEGIC LIFECYCLE MILESTONE ROADMAP (2026 – 2040) ===`,
      `Taxpayers: ${taxpayerLabels || defaultLabels}`,
      ...milestones.map(
        (m, idx) =>
          `\n[${idx + 1}] YEAR ${m.year} • AGE ${m.age} (${m.taxpayerName})\n` +
          `Title: ${m.title}\n` +
          `Context: ${m.description}\n` +
          `Fiduciary Action Item: ${m.actionRequired}`
      ),
      `\n============================================================`,
    ];

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines.join('\n'));
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySelectedMilestone = async () => {
    if (!selectedMilestone) return;
    const text = [
      `YEAR ${selectedMilestone.year} • AGE ${selectedMilestone.age} (${selectedMilestone.taxpayerName})`,
      selectedMilestone.title,
      `Context: ${selectedMilestone.description}`,
      `Fiduciary Action Item: ${selectedMilestone.actionRequired}`,
    ].join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm mb-6 space-y-4"
      data-testid="lifecycle-timeline"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-primary-violet" size={18} />
            Strategic Lifecycle Milestone Roadmap (2026 – 2040)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {taxpayerLabels || defaultLabels}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Info Explainer Button */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              showInfo
                ? 'bg-primary-violet text-white border-primary-violet shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Explain lifecycle sequencing methodology"
            data-testid="roadmap-info-btn"
          >
            <Info size={13} />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* Visual Chart vs. Table Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="roadmap-view-chart"
            >
              <Layers size={12} />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-slate-900'
              }`}
              data-testid="roadmap-view-table"
            >
              <Table2 size={12} />
              <span>Matrix</span>
            </button>
          </div>

          {/* Copy All Actions Button */}
          <button
            type="button"
            onClick={handleCopyAllActions}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              copiedAll
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Copy all lifecycle roadmap action items to clipboard"
            data-testid="roadmap-copy-all-btn"
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAll ? 'Copied All!' : 'Copy Roadmap'}</span>
          </button>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Clock size={12} /> SECURE 2.0 (RMD Age 75)
          </span>
        </div>
      </div>

      {/* Info Popover */}
      {showInfo && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 space-y-2 relative animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between items-start">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Info size={15} className="text-primary-violet" />
              Strategic Lifecycle Planning &amp; Milestone Methodology
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
            • <strong>Age 62 Social Security Clawback Trap:</strong> Earnings test rules withhold $1 for every $2 earned above the annual exempt limit ($23,400 in 2026) until Full Retirement Age.
          </p>
          <p className="leading-relaxed">
            • <strong>Age 65 Medicare &amp; Employer Health Coordination:</strong> The older spouse enrolls in premium-free Part A. Part B and Part D can be delayed without the 10%/year late penalty if active group coverage from ViaPath Technologies inc. remains in force with 20+ workers.
          </p>
          <p className="leading-relaxed">
            • <strong>Age 70 Maximum Delayed Retirement Credits:</strong> Social Security credits max out at 124% of PIA (8% per year from Age 67 to 70), locking in permanent peak survivor protection.
          </p>
          <p className="leading-relaxed">
            • <strong>Age 75 SECURE Act 2.0 RMD Mandate:</strong> Taxpayers born in 1960 or later have until age 75 before mandatory distributions kick in, creating a golden 10-year "Tax Valley" for Roth conversions.
          </p>
        </div>
      )}

      {/* VIEW 1: Visual Timeline Scrubber & Active Milestone Card */}
      {viewMode === 'chart' && (
        <div className="space-y-4">
          {/* Horizontal Milestone Scrubber */}
          <div className="flex gap-3 overflow-x-auto pb-4 select-none scrollbar-thin">
            {milestones.map((m) => {
              const isSelected = selectedMilestone?.year === m.year && selectedMilestone?.taxpayerName === m.taxpayerName;
              return (
                <button
                  key={`${m.year}-${m.taxpayerName}`}
                  onClick={() => setSelectedMilestone(m)}
                  className={`shrink-0 p-3 rounded-xl border text-left transition relative flex flex-col justify-between w-48 ${
                    isSelected
                      ? 'bg-primary-violet/10 border-primary-violet shadow-sm text-primary-violet'
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-mono font-extrabold">{m.year}</span>
                    {m.urgentBadge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500 text-white uppercase">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate">{m.taxpayerName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Age {m.age} Milestone</p>
                </button>
              );
            })}
          </div>

          {/* Selected Milestone Drill-down Card */}
          {selectedMilestone && (
            <div className="p-5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold text-primary-violet">
                    YEAR {selectedMilestone.year} • AGE {selectedMilestone.age}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedMilestone.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySelectedMilestone}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition flex items-center gap-1 ${
                      copiedCard
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                    title="Copy this milestone's action item"
                    data-testid="copy-milestone-action-btn"
                  >
                    {copiedCard ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCard ? 'Copied Action!' : 'Copy Action'}</span>
                  </button>

                  {selectedMilestone.urgentBadge && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                      <AlertTriangle size={13} /> Action Required
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedMilestone.description}
              </p>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Fiduciary Action Item:</span>
                <p className="text-primary-violet font-semibold leading-relaxed">
                  {selectedMilestone.actionRequired}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Chronological Roadmap Matrix Table */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl" data-testid="roadmap-matrix-table">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Year</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Age</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Taxpayer</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Event / Title</StaticTh>
                <StaticTh className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Fiduciary Action Required</StaticTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {milestones.map((m) => (
                <tr key={`${m.year}-${m.taxpayerName}`} className="hover:bg-gray-50 dark:hover:bg-slate-850">
                  <td className="py-2.5 px-3 font-mono font-bold text-primary-violet">{m.year}</td>
                  <td className="py-2.5 px-3 font-mono">{m.age}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.taxpayerName}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{m.title}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{m.actionRequired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
