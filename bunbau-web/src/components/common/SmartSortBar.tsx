'use client';

import React, { useState } from 'react';
import { Info, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { ContainerInfoPopover, InfoDefinitionItem } from './ContainerInfoPopover';
import { SmartSortState, buildSortRules } from '@/lib/ui/smartTableSort';

export interface SmartSortBarProps {
  /** Table / container title (shown in the info popover header). */
  title: string;
  sort: SmartSortState;
  defaultState: SmartSortState;
  isDefault: boolean;
  onReset: () => void;
  /** column key -> label, for "Sorted by: X". */
  labels: Record<string, string>;
  /** What the table shows and where numbers come from. */
  infoDescription?: string;
  definitions?: InfoDefinitionItem[];
  tableId?: string;
  className?: string;
}

/**
 * Standard toolbar for every table: (i) info button, "Sorted by", and Reset sort.
 * Part of the BunBau Standard UX (docs/STANDARD_UX.md).
 */
export function SmartSortBar({
  title,
  sort,
  defaultState,
  isDefault,
  onReset,
  labels,
  infoDescription,
  definitions,
  tableId = 'table',
  className = '',
}: SmartSortBarProps) {
  const [showInfo, setShowInfo] = useState(false);
  const label = labels[sort.key] ?? sort.key;
  const defaultLabel = `${labels[defaultState.key] ?? defaultState.key} ${
    defaultState.dir === 'asc' ? 'A→Z / low→high' : 'Z→A / high→low'
  }`;
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div
      className={`flex items-center justify-end gap-2 text-[11px] text-gray-500 dark:text-gray-400 ${className}`}
      data-testid={`smart-sort-bar-${tableId}`}
    >
      <button
        type="button"
        onClick={() => setShowInfo(true)}
        title={`About ${title}`}
        aria-label={`Information about ${title}`}
        data-testid={`table-info-btn-${tableId}`}
        className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <Info size={14} />
      </button>
      <span className="inline-flex items-center gap-1" data-testid={`sorted-by-${tableId}`}>
        Sorted by <strong className="text-slate-700 dark:text-slate-200">{label}</strong>
        <Arrow size={11} className="text-primary-mint" />
      </span>
      <button
        type="button"
        onClick={onReset}
        disabled={isDefault}
        title={`Reset sort to default (${defaultLabel})`}
        data-testid={`reset-sort-btn-${tableId}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-default cursor-pointer"
      >
        <RotateCcw size={11} /> Reset sort
      </button>
      <ContainerInfoPopover
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title={title}
        subtitle="Table information & sort rules"
        description={infoDescription || `Tabular view of ${title}. Click any column header to sort.`}
        definitions={definitions}
        shortcuts={buildSortRules(defaultLabel)}
        testId={`table-info-popover-${tableId}`}
      />
    </div>
  );
}

/**
 * Convenience wrapper for tables driven by `useTableSort` / `useSmartSort`.
 * Pass the hook result plus the visible [key, label] column list.
 */
export function TableSortBar({
  tableId,
  title,
  sortState,
  defaultState,
  isDefault,
  reset,
  columns,
  infoDescription,
  className,
}: {
  tableId: string;
  title: string;
  sortState: { key: string | null; direction: 'asc' | 'desc' | null };
  defaultState: { key: string | null; dir: 'asc' | 'desc' };
  isDefault: boolean;
  reset: () => void;
  columns: Array<[string, string]>;
  infoDescription?: string;
  className?: string;
}) {
  const labels = Object.fromEntries(columns);
  return (
    <SmartSortBar
      tableId={tableId}
      title={title}
      sort={{ key: sortState.key ?? defaultState.key ?? columns[0][0], dir: sortState.direction ?? 'asc' }}
      defaultState={{ key: defaultState.key ?? columns[0][0], dir: defaultState.dir }}
      isDefault={isDefault}
      onReset={reset}
      labels={labels}
      infoDescription={infoDescription}
      className={className}
    />
  );
}
