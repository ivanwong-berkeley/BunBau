'use client';

import React, { useEffect, useMemo } from 'react';
import { SmartSortBar } from './SmartSortBar';
import { SmartTh, StaticTh } from './SortableHeader';
import { SortDir } from '@/lib/ui/smartTableSort';
import { useSmartSort } from '@/lib/ui/useSmartSort';
import type { InfoDefinitionItem } from './ContainerInfoPopover';

export interface SmartColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Value used for sorting. Defaults to row[key]. Required when the cell renders a React node. */
  sortValue?: (row: T) => unknown;
  /** Cell renderer. Defaults to row[key]. */
  render?: (row: T) => React.ReactNode;
  /** Set false for action / checkbox columns. */
  sortable?: boolean;
  /** First-click direction (default 'asc'). */
  preferredDir?: SortDir;
  help?: string;
  className?: string;
}

export interface SmartTableProps<T> {
  /** Unique id; used for test ids. */
  tableId: string;
  /** Title shown in the info popover (mandatory per Standard UX). */
  title: string;
  /** What the table shows / data source (shown in the (i) popover). */
  infoDescription?: string;
  columns: SmartColumn<T>[];
  rows: readonly T[];
  rowKey?: (row: T, index: number) => string;
  /** Default sort. Falls back to column 1 ascending. */
  defaultSort?: { key: string; dir?: SortDir };
  /** Rows rendered after the sorted data (totals / subtotals) - never re-ordered. */
  footerRows?: React.ReactNode;
  emptyMessage?: string;
  density?: 'compact' | 'regular';
  /** Called with rows in their current sorted order (used by Copy / CSV export). */
  onSortedRows?: (rows: T[]) => void;
  rowClassName?: (row: T, index: number) => string;
  headClassName?: string;
  showSortBar?: boolean;
  className?: string;
}

/**
 * The only way to render a data table in BunBau (Standard UX, docs/STANDARD_UX.md):
 * default first-column ASC, click-to-sort, Reset sort, (i) info button, pinned totals.
 */
export function SmartTable<T>({
  tableId,
  title,
  infoDescription,
  columns,
  rows,
  rowKey,
  defaultSort,
  footerRows,
  emptyMessage = 'No rows to display.',
  density = 'regular',
  onSortedRows,
  rowClassName,
  headClassName = 'sticky top-0 z-10 bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800',
  showSortBar = true,
  className = '',
}: SmartTableProps<T>) {
  const getters = useMemo(() => {
    const g: Record<string, (row: T) => unknown> = {};
    for (const c of columns) {
      if (c.sortable === false) continue;
      g[c.key] = c.sortValue ?? ((row: T) => (row as Record<string, unknown>)[c.key]);
    }
    return g;
  }, [columns]);

  const preferred = useMemo(() => {
    const p: Record<string, SortDir> = {};
    for (const c of columns) if (c.preferredDir) p[c.key] = c.preferredDir;
    return p;
  }, [columns]);

  const { sortedRows, sort, defaultState, isDefault, toggle, reset } = useSmartSort(rows, getters, {
    defaultKey: defaultSort?.key,
    defaultDir: defaultSort?.dir,
    preferred,
  });

  useEffect(() => {
    onSortedRows?.(sortedRows);
  }, [sortedRows, onSortedRows]);

  const labels = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.label])),
    [columns]
  );
  const definitions: InfoDefinitionItem[] = columns
    .filter((c) => c.help)
    .map((c) => ({ term: c.label, definition: c.help as string }));

  const pad = density === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';

  return (
    <div className={className} data-testid={`smart-table-${tableId}`}>
      {showSortBar && (
        <SmartSortBar
          tableId={tableId}
          title={title}
          sort={sort}
          defaultState={defaultState}
          isDefault={isDefault}
          onReset={reset}
          labels={labels}
          infoDescription={infoDescription}
          definitions={definitions}
          className="mb-2"
        />
      )}
      <table className={`w-full ${textSize} text-left text-slate-900 dark:text-slate-200 border-collapse`}>
        <thead className={headClassName}>
          <tr>
            {columns.map((col) =>
              col.sortable === false ? (
                <StaticTh key={col.key} align={col.align}>
                  {col.label}
                </StaticTh>
              ) : (
                <SmartTh
                  key={col.key}
                  label={col.label}
                  columnKey={col.key}
                  currentKey={sort.key}
                  currentDirection={sort.dir}
                  onSort={toggle}
                  align={col.align}
                  className={`${pad} whitespace-nowrap`}
                />
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-gray-400 italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                className={
                  rowClassName?.(row, i) ??
                  `hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition ${
                    i % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-gray-50/40 dark:bg-slate-900/30'
                  }`
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${pad} whitespace-nowrap ${
                      col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
          {footerRows}
        </tbody>
      </table>
    </div>
  );
}
