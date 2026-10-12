'use client';

import React from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';
import { CryptoRow } from '../lib/portfolio/selectors';

interface CryptoTableProps {
  cryptoList: CryptoRow[];
  onSelectSymbol?: (symbol: string) => void;
}

export function CryptoTable({ cryptoList, onSelectSymbol }: CryptoTableProps) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty = (n: number) => (n < 1 ? n.toFixed(8).replace(/\.?0+$/, '') : n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 }));

  type CryptoSortKey = 'symbol' | 'quantity' | 'currentPrice' | 'marketValue' | 'costBasis' | 'unrealizedPnl' | 'percentOfPortfolio';

  const { sortedItems, sortState, toggleSort, reset, isDefault, defaultState } = useTableSort(
    cryptoList,
    {
      symbol: (item) => item.symbol,
      quantity: (item) => item.quantity,
      currentPrice: (item) => item.currentPrice,
      marketValue: (item) => item.marketValue,
      costBasis: (item) => item.costBasis,
      unrealizedPnl: (item) => item.unrealizedPnl,
      percentOfPortfolio: (item) => item.percentOfPortfolio,
    },
    null,
    null,
    {
      marketValue: 'desc',
      unrealizedPnl: 'desc',
      symbol: 'asc',
    }
  );

  return (
    <div className="p-2 max-h-[300px] overflow-y-auto overflow-x-auto scrollbar-thin" data-testid="crypto-table">
      <TableSortBar
        tableId="crypto-holdings"
        title="Digital Currency"
        infoDescription="Direct crypto holdings (summed across institutions) with token quantity, cost basis, and unrealized gain/loss."
        sortState={sortState}
        defaultState={defaultState}
        isDefault={isDefault}
        reset={reset}
        columns={[
          ['symbol', 'Asset'],
          ['quantity', 'Quantity'],
          ['currentPrice', 'Price'],
          ['marketValue', 'Market Value'],
          ['costBasis', 'Cost Basis'],
          ['unrealizedPnl', 'Unrealized P&L'],
          ['percentOfPortfolio', '% Portfolio'],
        ]}
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
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="left"
            />
            <SortableHeader
              label="Quantity"
              columnKey="quantity"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
            <SortableHeader
              label="Price"
              columnKey="currentPrice"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
            <SortableHeader
              label="Market Value"
              columnKey="marketValue"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
            <SortableHeader
              label="Cost Basis"
              columnKey="costBasis"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
            <SortableHeader
              label="Unrealized P&L"
              columnKey="unrealizedPnl"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
            <SortableHeader
              label="% Port"
              columnKey="percentOfPortfolio"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as CryptoSortKey)}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Coins size={22} className="text-gray-300 dark:text-slate-600" />
                  <span>No Digital Currency Holdings Detected</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedItems.map((asset) => {
              const isProfit = asset.unrealizedPnl >= 0;
              return (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelectSymbol?.(asset.symbol)}
                  className={`transition ${
                    onSelectSymbol
                      ? 'cursor-pointer hover:bg-amber-500/5 dark:hover:bg-slate-800/60'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'
                  }`}
                  title={onSelectSymbol ? `Click to drill down into ${asset.symbol} accounts breakdown` : undefined}
                >
                  <td className="py-2.5 px-2 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1">
                          {asset.symbol}
                          {onSelectSymbol && <ChevronRight size={13} className="text-gray-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {asset.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                    {fmtQty(asset.quantity)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                    ${fmt(asset.currentPrice)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ${fmt(asset.marketValue)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                    {asset.costBasis > 0 ? `$${fmt(asset.costBasis)}` : 'N/A'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold ${
                        isProfit
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                      }`}
                    >
                      {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {isProfit ? '+' : ''}${fmt(asset.unrealizedPnl)} ({isProfit ? '+' : ''}
                      {asset.unrealizedPnlPct.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
                    {asset.percentOfPortfolio.toFixed(1)}%
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
