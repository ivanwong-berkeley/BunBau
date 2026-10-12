'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { CanonicalPosition } from '../lib/portfolio/types';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';

interface ActiveOptionsTableProps {
  options: CanonicalPosition[];
}

export function ActiveOptionsTable({ options }: ActiveOptionsTableProps) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  type OptionsSortKey = 'symbol' | 'assetClass' | 'underlier' | 'expiry' | 'collateral' | 'marketValue';

  const getCollateral = (opt: CanonicalPosition) => {
    const contracts = opt.option?.contracts ?? Math.abs(opt.quantity || 1);
    const strike = opt.option?.strike ?? 0;
    if (opt.assetClass === 'CSP') {
      return strike * 100 * contracts;
    }
    // Covered call locks shares
    return contracts * 100;
  };

  const { sortedItems, sortState, toggleSort, reset, isDefault, defaultState } = useTableSort<CanonicalPosition, OptionsSortKey>(
    options,
    {
      symbol: (opt) => opt.symbol,
      assetClass: (opt) => opt.assetClass,
      underlier: (opt) => opt.option?.underlying || '',
      expiry: (opt) => opt.option?.expiry || '',
      collateral: (opt) => getCollateral(opt),
      marketValue: (opt) => opt.marketValue,
    },
    null,
    null,
    {
      collateral: 'desc',
      marketValue: 'desc',
      expiry: 'asc',
      symbol: 'asc',
    }
  );

  return (
    <div className="p-2 max-h-[300px] overflow-y-auto overflow-x-auto scrollbar-thin" data-testid="active-options-table">
      <TableSortBar
        tableId="active-options"
        title="Active Options"
        infoDescription="Open Cash-Secured Puts and Covered Calls with the collateral each one locks."
        sortState={sortState}
        defaultState={defaultState}
        isDefault={isDefault}
        reset={reset}
        columns={[['symbol', 'Contract'], ['assetClass', 'Type'], ['underlier', 'Underlier'], ['expiry', 'Expiration'], ['collateral', 'Collateral Locked'], ['marketValue', 'Ignored Premium']]}
        className="mb-1"
      />
      <table className="w-full text-sm text-slate-900 dark:text-slate-200">
        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <tr className="text-xs text-gray-500 uppercase">
            <SortableHeader
              label="Contract"
              columnKey="symbol"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="left"
            />
            <SortableHeader
              label="Type"
              columnKey="assetClass"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="left"
            />
            <SortableHeader
              label="Underlier"
              columnKey="underlier"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="left"
            />
            <SortableHeader
              label="Expiration"
              columnKey="expiry"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="left"
            />
            <SortableHeader
              label="Collateral Locked"
              columnKey="collateral"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="right"
            />
            <SortableHeader
              label="Ignored Premium"
              columnKey="marketValue"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as OptionsSortKey)}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedItems.length === 0 ? (
            <tr><td colSpan={6} className="py-4 text-center text-gray-500">No Active Options</td></tr>
          ) : sortedItems.map((opt) => {
            const dateStr = opt.option?.expiry;
            const contracts = opt.option?.contracts ?? Math.abs(opt.quantity || 1);
            const strike = opt.option?.strike ?? 0;
            const isCsp = opt.assetClass === "CSP";
            const daysLeft = dateStr ? Math.round((new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 3600 * 24)) : undefined;

            return (
              <tr key={opt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                <td className="py-3 px-2 font-medium">
                  <div>{opt.symbol}</div>
                  {opt.option?.strike ? <span className="text-xs text-gray-400 font-mono">${opt.option.strike} Strike</span> : null}
                </td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isCsp ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                    {isCsp ? "CSP" : "Covered Call"}
                  </span>
                </td>
                <td className={`py-3 px-2 ${opt.assetClass === "CoveredCall" ? "text-amber-600 font-bold flex items-center gap-1" : "text-gray-500"}`}>
                  {opt.option?.underlying || "Unknown"} {opt.assetClass === "CoveredCall" && <Lock size={12}/>}
                </td>
                <td className="py-3 px-2 font-mono text-xs">
                  {dateStr ? (
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dateStr}</span>
                      {daysLeft !== undefined && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${daysLeft <= 7 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" : daysLeft <= 21 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"}`}>
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right font-mono text-xs">
                  {isCsp ? (
                    <span className="text-purple-700 dark:text-purple-300 font-medium">${(strike * 100 * contracts).toLocaleString()} Cash</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300 font-medium">{contracts * 100} shs {opt.option?.underlying}</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right font-mono line-through text-gray-400">${fmt(opt.marketValue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
