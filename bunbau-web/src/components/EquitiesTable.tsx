'use client';

import React from 'react';
import { Lock, ChevronRight } from 'lucide-react';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';

interface EquitiesTableProps {
  equities: Array<{
    symbol: string;
    assetClass: string;
    value: number;
    covered: boolean;
    isPartialCovered?: boolean;
    coveredShares?: number;
  }>;
  onSelectSymbol?: (symbol: string) => void;
}

export function EquitiesTable({ equities, onSelectSymbol }: EquitiesTableProps) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  type EquitiesSortKey = 'symbol' | 'assetClass' | 'value';

  const { sortedItems, sortState, toggleSort, reset, isDefault, defaultState } = useTableSort(
    equities,
    {
      symbol: (item) => item.symbol,
      assetClass: (item) => item.assetClass,
      value: (item) => item.value,
    },
    null,
    null,
    {
      value: 'desc',
      symbol: 'asc',
      assetClass: 'asc',
    }
  );

  return (
    <div className="p-2 max-h-[300px] overflow-y-auto overflow-x-auto scrollbar-thin" data-testid="equities-table">
      <TableSortBar
        tableId="equities"
        title="Equities"
        infoDescription="Aggregated equity value per symbol across all accounts, with covered-call status."
        sortState={sortState}
        defaultState={defaultState}
        isDefault={isDefault}
        reset={reset}
        columns={[['symbol', 'Asset'], ['assetClass', 'Category'], ['value', 'Aggregated Value']]}
        className="mb-1"
      />
      <table className="w-full text-sm text-slate-900 dark:text-slate-200">
        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <tr className="text-xs text-gray-500 uppercase">
            <SortableHeader
              label="Asset"
              columnKey="symbol"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as EquitiesSortKey)}
              align="left"
            />
            <SortableHeader
              label="Category"
              columnKey="assetClass"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as EquitiesSortKey)}
              align="left"
            />
            <SortableHeader
              label="Aggregated Value"
              columnKey="value"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as EquitiesSortKey)}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedItems.length === 0 ? (
            <tr><td colSpan={3} className="py-4 text-center text-gray-500">No Equities Imported</td></tr>
          ) : sortedItems.map((asset) => (
            <tr
              key={asset.symbol}
              onClick={() => onSelectSymbol?.(asset.symbol)}
              className={`transition ${
                onSelectSymbol
                  ? 'cursor-pointer hover:bg-primary-mint/5 dark:hover:bg-slate-800/60'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'
              }`}
              title={onSelectSymbol ? `Click to drill down into ${asset.symbol} accounts breakdown` : undefined}
            >
              <td className="py-3 px-2 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{asset.symbol}</span>
                  {asset.covered ? (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral 100% Locked by Covered Call">
                      (CC) <Lock size={10} />
                    </span>
                  ) : asset.isPartialCovered ? (
                    <span className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold" title="Partially Covered: some shares locked by Covered Call, remainder unhedged">
                      (Partial CC) <Lock size={10} />
                    </span>
                  ) : null}
                </div>
                {onSelectSymbol && (
                  <span className="text-gray-400 text-xs flex items-center gap-0.5 opacity-60 hover:opacity-100">
                    <span className="text-[10px] text-primary-mint">Drill Down</span>
                    <ChevronRight size={13} className="text-primary-mint" />
                  </span>
                )}
              </td>
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded text-xs ${asset.assetClass === 'Stock' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                  {asset.assetClass}
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono">${fmt(asset.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
