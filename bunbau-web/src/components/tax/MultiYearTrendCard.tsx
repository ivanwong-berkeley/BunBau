'use client';

import React, { useMemo } from 'react';
import { AppletContainer } from '../AppletContainer';
import { MultiYearTaxComparison } from '../../lib/tax/models';
import { SmartTable, SmartColumn } from '../common/SmartTable';

interface MultiYearTrendCardProps {
  comparison: MultiYearTaxComparison;
}

interface TrendRow {
  key: string;
  metric: string;
  year2024: number;
  year2025: number;
  diff: number;
  diffPct: number;
}

export function MultiYearTrendCard({ comparison }: MultiYearTrendCardProps) {
  const kpis = comparison.kpis;

  const rows: TrendRow[] = useMemo(
    () => [
      {
        key: 'agi',
        metric: 'Adjusted Gross Income (AGI)',
        year2024: kpis.agi.year2024,
        year2025: kpis.agi.year2025,
        diff: kpis.agi.diff,
        diffPct: kpis.agi.diffPct,
      },
      {
        key: 'taxableIncome',
        metric: 'Taxable Income',
        year2024: kpis.taxableIncome.year2024,
        year2025: kpis.taxableIncome.year2025,
        diff: kpis.taxableIncome.diff,
        diffPct: kpis.taxableIncome.diffPct,
      },
      {
        key: 'totalTax',
        metric: 'Total Combined Tax (Fed + CA)',
        year2024: kpis.totalTax.year2024,
        year2025: kpis.totalTax.year2025,
        diff: kpis.totalTax.diff,
        diffPct: kpis.totalTax.diffPct,
      },
    ],
    [kpis]
  );

  const columns: SmartColumn<TrendRow>[] = useMemo(
    () => [
      {
        key: 'metric',
        label: 'Metric',
        align: 'left',
        sortValue: (r) => r.metric,
        render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.metric}</span>,
      },
      {
        key: 'year2024',
        label: `${comparison.previousYear || 2024} Filed`,
        align: 'right',
        sortValue: (r) => r.year2024,
        render: (r) => <span className="font-mono text-slate-700 dark:text-slate-300">${r.year2024.toLocaleString()}</span>,
      },
      {
        key: 'year2025',
        label: `${comparison.latestYear || 2025} Filed (Latest)`,
        align: 'right',
        sortValue: (r) => r.year2025,
        render: (r) => <span className="font-mono font-bold text-slate-900 dark:text-white">${r.year2025.toLocaleString()}</span>,
      },
      {
        key: 'diff',
        label: 'Variance ($)',
        align: 'right',
        sortValue: (r) => r.diff,
        render: (r) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            -${Math.abs(r.diff).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'diffPct',
        label: 'Variance (%)',
        align: 'right',
        sortValue: (r) => r.diffPct,
        render: (r) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {r.diffPct.toFixed(1)}%
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="mb-6" data-testid="multi-year-trend-card">
      <AppletContainer
        title="Income & Tax Liability Progression (2024 vs 2025)"
        infoDescription="Multi-year variance tracking of Adjusted Gross Income, Taxable Income, and Total Tax liability."
        tableComponent={
          <div className="p-2">
            <SmartTable<TrendRow>
              tableId="tax-trends"
              title="Income Trends"
              infoDescription="Comparative progression of Adjusted Gross Income, Taxable Income, and Total Tax liability."
              columns={columns}
              rows={rows}
              rowKey={(r) => r.key}
            />
          </div>
        }
      >
        {/* Visual Bar Comparison in Chart Mode */}
        <div className="p-6 space-y-5">
          {/* AGI Comparison Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">Adjusted Gross Income (AGI)</span>
              <span className="font-mono text-gray-500">2024: ${kpis.agi.year2024.toLocaleString()} ➔ 2025: ${kpis.agi.year2025.toLocaleString()} (-31.0%)</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
              <div className="bg-primary-violet/50 h-full" style={{ width: '100%' }} title="2024: $296,159" />
              <div className="bg-primary-violet h-full -ml-[31%]" style={{ width: '69%' }} title="2025: $204,303" />
            </div>
          </div>

          {/* Tax Liability Comparison Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">Total Tax Liability (Fed + CA)</span>
              <span className="font-mono text-gray-500">2024: ${kpis.totalTax.year2024.toLocaleString()} ➔ 2025: ${kpis.totalTax.year2025.toLocaleString()} (-47.0%)</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
              <div className="bg-rose-500/40 h-full" style={{ width: '100%' }} title="2024: $64,740" />
              <div className="bg-emerald-500 h-full -ml-[47%]" style={{ width: '53%' }} title="2025: $34,309" />
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-300">
            <strong>Key Takeaway:</strong> AGI dropped below the $250,000 threshold in 2025, completely eliminating the 3.8% Net Investment Income Tax ($0 vs $1,754 in 2024) and reducing combined tax by -$30,431.
          </div>
        </div>
      </AppletContainer>
    </div>
  );
}
