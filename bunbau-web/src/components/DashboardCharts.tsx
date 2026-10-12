'use client';

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { CanonicalPosition } from '../lib/portfolio/types';
import { allocation, cashSummary, equitiesBySymbol, optionsList, cryptoBySymbol } from '../lib/portfolio/selectors';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function AssetAllocationChart({ positions }: { positions: CanonicalPosition[] }) {
  const slices = allocation(positions);
  const data = {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => s.value),
        backgroundColor: [
          '#10B981', // Mint  - Cash
          '#F59E0B', // Amber - CDs
          '#8B5CF6', // Violet - SGOV/Bonds
          '#F43F5E', // Coral - Equities
          '#F97316', // Orange / Gold - Crypto
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Plus Jakarta Sans', sans-serif" }
        }
      }
    }
  };

  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
}

export function CryptoChart({ positions }: { positions: CanonicalPosition[] }) {
  const cryptoItems = cryptoBySymbol(positions);
  if (cryptoItems.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
        <span>No direct crypto positions</span>
      </div>
    );
  }

  const palette = ['#F59E0B', '#6366F1', '#EC4899', '#10B981', '#3B82F6', '#8B5CF6'];
  const data = {
    labels: cryptoItems.map((c) => c.symbol),
    datasets: [
      {
        data: cryptoItems.map((c) => c.marketValue),
        backgroundColor: cryptoItems.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { family: "'Plus Jakarta Sans', sans-serif" },
        },
      },
    },
  };

  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
}

import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';

export function AssetAllocationTable({ positions }: { positions: CanonicalPosition[] }) {
  const slices = allocation(positions);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const colorMap: Record<string, string> = {
    Cash: 'bg-emerald-500',
    CDs: 'bg-amber-500',
    'SGOV/Bonds': 'bg-purple-500',
    Equities: 'bg-rose-500',
    Crypto: 'bg-orange-500',
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  type AllocKey = 'label' | 'value' | 'pct';
  const { sortedItems, sortState, toggleSort, reset, isDefault, defaultState } = useTableSort(
    slices,
    {
      label: (s) => s.label,
      value: (s) => s.value,
      pct: (s) => s.pct,
    },
    null,
    null,
    {
      value: 'desc',
      pct: 'desc',
    }
  );

  return (
    <div className="p-2 max-h-[300px] overflow-y-auto overflow-x-auto scrollbar-thin" data-testid="asset-allocation-table">
      <TableSortBar
        tableId="asset-allocation"
        title="Asset Allocation"
        infoDescription="Portfolio value and share by asset category."
        sortState={sortState}
        defaultState={defaultState}
        isDefault={isDefault}
        reset={reset}
        columns={[['label', 'Asset Category'], ['value', 'Total Value'], ['pct', '% of Portfolio']]}
        className="mb-1"
      />
      <table className="w-full text-sm text-slate-900 dark:text-slate-200">
        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <tr className="text-xs text-gray-500 uppercase">
            <SortableHeader
              label="Asset Category"
              columnKey="label"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={toggleSort}
              align="left"
            />
            <SortableHeader
              label="Total Value"
              columnKey="value"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={toggleSort}
              align="right"
            />
            <SortableHeader
              label="% of Portfolio"
              columnKey="pct"
              currentKey={sortState.key}
              currentDirection={sortState.direction}
              onSort={toggleSort}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedItems.map((slice) => (
            <tr key={slice.label} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
              <td className="py-2.5 px-2 font-medium flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colorMap[slice.label] || 'bg-slate-400'}`} />
                {slice.label}
              </td>
              <td className="py-2.5 px-2 text-right font-mono">${fmt(slice.value)}</td>
              <td className="py-2.5 px-2 text-right font-mono text-gray-500 dark:text-slate-400">{slice.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 dark:border-slate-700 font-bold">
            <td className="py-2 px-2">Total</td>
            <td className="py-2 px-2 text-right font-mono">${fmt(total)}</td>
            <td className="py-2 px-2 text-right font-mono">100.0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PnLAttributionChart() {
  const data = {
    labels: ['Fidelity', 'Schwab', 'Webull', 'Citi'],
    datasets: [
      {
        label: 'Unrealized P&L ($)',
        data: [12500, -3200, 4100, 800],
        backgroundColor: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          return value > 0 ? '#10B981' : '#F43F5E';
        },
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { grid: { display: true, color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
}


export function CashManagerChart({ positions }: { positions: CanonicalPosition[] }) {
  const cash = cashSummary(positions);

  const chartData = {
    labels: ['Free Cash', 'CSP Reserves'],
    datasets: [
      {
        data: [Math.max(0, cash.netFreeCash), Math.max(0, cash.cspReserve)],
        backgroundColor: ['#10B981', '#F59E0B'],
        borderWidth: 0,
      }
    ]
  };
  
  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={chartData} options={{ cutout: '70%', plugins: { legend: { position: 'right' as const, labels: { usePointStyle: true } } } }} />
    </div>
  );
}

export function EquitiesChart({ positions }: { positions: CanonicalPosition[] }) {
  // Aggregated by symbol across institutions; top 5, remainder grouped into 'Other'
  const equities = equitiesBySymbol(positions);
  
  const top = equities.slice(0, 5);
  const otherValue = equities.slice(5).reduce((sum, p) => sum + p.value, 0);
  
  const labels = top.map(p => p.symbol);
  const values = top.map(p => p.value);
  if (otherValue > 0) {
    labels.push('Other');
    values.push(otherValue);
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ['#8B5CF6', '#3B82F6', '#14B8A6', '#F43F5E', '#F59E0B', '#64748B'],
        borderWidth: 0,
      }
    ]
  };
  
  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={chartData} options={{ cutout: '60%', plugins: { legend: { position: 'right' as const, labels: { usePointStyle: true } } } }} />
    </div>
  );
}

export function OptionsChart({ positions }: { positions: CanonicalPosition[] }) {
  const options = optionsList(positions);
  
  const labels = options.map(p => p.symbol);
  const values = options.map(p => Math.abs(p.marketValue)); // Visualizing premium at risk/liability
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Option Premium Value',
        data: values,
        backgroundColor: options.map(p => (p.assetClass === 'CSP' ? '#F59E0B' : '#F43F5E')),
        borderRadius: 4,
      }
    ]
  };
  
  return (
    <div className="h-64">
      <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { display: true } }, x: { grid: { display: false } } } }} />
    </div>
  );
}
