'use client';
import React, { useState } from 'react';
import { Info, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { AccessibilityZoomBar } from './common/AccessibilityZoomBar';

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  info: string;
  valueColorClass?: string;
  onDrillDown?: () => void;
  /** Optional small label above the main figure (used when the card shows two figures). */
  valueLabel?: string;
  /** Optional second figure with its own label, color and drill-down. */
  secondary?: {
    label: string;
    value: string;
    colorClass: string;
    onDrillDown?: () => void;
  };
}

export function StatCard({
  title,
  value,
  info,
  valueColorClass = 'text-slate-900 dark:text-white',
  onDrillDown,
  valueLabel,
  secondary,
}: StatCardProps) {
  const [scale, setScale] = useState(1);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative flex flex-col h-full group">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <div className="flex gap-1 bg-gray-50 dark:bg-slate-700 rounded-lg p-1">
          {onDrillDown && (
            <>
              <button
                onClick={onDrillDown}
                className="p-1 text-primary-mint hover:bg-primary-mint/10 rounded transition"
                title="Drill Down to Accounts Breakdown"
                data-testid={`drilldown-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <Layers size={14} />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 my-auto mx-0.5"></div>
            </>
          )}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 hover:text-primary-mint dark:text-slate-300"
            title="Info"
          >
            <Info size={14} />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 my-auto mx-0.5"></div>
          <AccessibilityZoomBar
            scale={scale}
            onZoomIn={() => setScale((s) => Math.min(s + 0.1, 1.5))}
            onZoomOut={() => setScale((s) => Math.max(s - 0.1, 0.5))}
            onReset={() => setScale(1)}
            minScale={0.5}
            maxScale={1.5}
            variant="compact"
            testIdPrefix="stat-card"
          />
        </div>
      </div>
      {showInfo && (
        <div className="absolute top-14 left-4 right-4 z-10 p-3 bg-primary-mint/10 border border-primary-mint/20 rounded-lg text-sm text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md">
          {info}
        </div>
      )}
      <div className="mt-2 origin-top-left transition-transform" style={{ transform: `scale(${scale})` }}>
        <div
          onClick={onDrillDown}
          className={`transition-transform ${onDrillDown ? 'cursor-pointer hover:opacity-80' : ''}`}
          title={onDrillDown ? 'Click to view breakdown by institution & account' : undefined}
          data-testid={valueLabel ? `figure-${valueLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}
        >
          {valueLabel && (
            <span className="block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {valueLabel}
            </span>
          )}
          <h3 className={`text-2xl font-bold font-mono ${valueColorClass}`}>{value}</h3>
        </div>
        {secondary && (
          <div
            onClick={secondary.onDrillDown}
            className={`mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 ${
              secondary.onDrillDown ? 'cursor-pointer hover:opacity-80' : ''
            }`}
            title={secondary.onDrillDown ? 'Click to view breakdown' : undefined}
            data-testid={`figure-${secondary.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          >
            <span className="block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {secondary.label}
            </span>
            <h3 className={`text-2xl font-bold font-mono ${secondary.colorClass}`}>{secondary.value}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
