'use client';

import React from 'react';
import { CanonicalPosition } from '../lib/portfolio/types';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';

interface SnapshotPositionsTableProps {
  positions: CanonicalPosition[];
}

export function SnapshotPositionsTable({ positions }: SnapshotPositionsTableProps) {
  type PosSortKey = 'symbol' | 'assetClass' | 'quantity' | 'marketValue';

  const { sortedItems, sortState, toggleSort, reset, isDefault, defaultState } = useTableSort<CanonicalPosition, PosSortKey>(
    positions,
    {
      symbol: (p) => p.symbol,
      assetClass: (p) => p.assetClass,
      quantity: (p) => p.quantity,
      marketValue: (p) => p.marketValue,
    },
    null,
    null,
    {
      marketValue: 'desc',
      quantity: 'desc',
      symbol: 'asc',
    }
  );

  return (
    <div className="overflow-x-auto">
      <TableSortBar
        tableId="snapshot-positions"
        title="Snapshot Positions"
        infoDescription="Positions captured in this portfolio snapshot."
        sortState={sortState}
        defaultState={defaultState}
        isDefault={isDefault}
        reset={reset}
        columns={[['symbol', 'Symbol'], ['assetClass', 'Class'], ['quantity', 'Quantity'], ['marketValue', 'Market Value']]}
        className="mb-1"
      />
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-200 dark:border-slate-800">
            <SortableHeader
              label="Symbol"
              columnKey="symbol"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as PosSortKey)}
              align="left"
            />
            <SortableHeader
              label="Class"
              columnKey="assetClass"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as PosSortKey)}
              align="left"
            />
            <SortableHeader
              label="Quantity"
              columnKey="quantity"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as PosSortKey)}
              align="right"
            />
            <SortableHeader
              label="Market Value"
              columnKey="marketValue"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={(k) => toggleSort(k as PosSortKey)}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedItems.map((p) => (
            <tr key={p.id}>
              <td className="py-1.5 font-medium">{p.symbol}</td>
              <td className="py-1.5 text-gray-400">{p.assetClass}</td>
              <td className="py-1.5 text-right font-mono">{p.quantity}</td>
              <td className="py-1.5 text-right font-mono font-semibold">${p.marketValue.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
