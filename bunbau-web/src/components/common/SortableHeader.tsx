'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  columnKey: string;
  currentKey: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
  tooltip?: string;
}

export function SortableHeader({
  label,
  columnKey,
  currentKey,
  currentDirection,
  onSort,
  align = 'left',
  className = '',
  tooltip,
}: SortableHeaderProps) {
  const isSorted = currentKey === columnKey && currentDirection !== null;
  const isAsc = isSorted && currentDirection === 'asc';
  const isDesc = isSorted && currentDirection === 'desc';

  const alignClass =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
      ? 'justify-center text-center'
      : 'justify-start text-left';

  const thAlignClass =
    align === 'right'
      ? 'text-right'
      : align === 'center'
      ? 'text-center'
      : 'text-left';

  const ariaSort = isAsc ? 'ascending' : isDesc ? 'descending' : 'none';

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`py-2 px-2 select-none group ${thAlignClass} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        title={tooltip || `Sort by ${label} (click to toggle ascending / descending)`}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-mint/50 rounded py-0.5 px-1 -mx-1 ${alignClass} ${
          isSorted
            ? 'text-primary-mint dark:text-emerald-400 font-bold'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
        }`}
      >
        <span>{label}</span>
        <span className="shrink-0 transition-transform">
          {isAsc ? (
            <ArrowUp size={12} className="text-primary-mint dark:text-emerald-400" />
          ) : isDesc ? (
            <ArrowDown size={12} className="text-primary-mint dark:text-emerald-400" />
          ) : (
            <ArrowUpDown
              size={12}
              className="text-gray-400 dark:text-gray-500 opacity-40 group-hover:opacity-100 transition-opacity"
            />
          )}
        </span>
      </button>
    </th>
  );
}

/** Standard name for the sortable header cell (BunBau Standard UX). */
export const SmartTh = SortableHeader;

/**
 * Non-sortable header cell (e.g. action / checkbox columns). Raw <th> elements are only
 * allowed in this file and SmartTable.tsx (enforced by tests/unit/standard_ux_guard.test.ts).
 */
export function StaticTh({
  children,
  align = 'left',
  className = '',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const a = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th scope="col" className={`py-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 ${a} ${className}`}>
      {children}
    </th>
  );
}
