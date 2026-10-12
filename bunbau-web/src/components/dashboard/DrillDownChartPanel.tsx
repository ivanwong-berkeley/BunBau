'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { DrillDownChart } from '../../lib/portfolio/apyCharts';

ChartJS.register(ArcElement, Tooltip, Legend);

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Doughnut chart(s) for a drill-down. Accessible: legend table + text alternative per chart. */
export function DrillDownChartPanel({ charts }: { charts: DrillDownChart[] }) {
  if (charts.length === 0 || charts.every((c) => c.slices.length === 0)) {
    return (
      <div className="p-8 text-center text-sm text-gray-500" data-testid="drilldown-chart-empty">
        No data to chart for the current filters.
      </div>
    );
  }
  return (
    <div
      className={`grid gap-6 ${charts.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
      data-testid="drilldown-chart-panel"
    >
      {charts.map((c) => {
        const total = c.slices.reduce((s, x) => s + x.value, 0);
        return (
          <section
            key={c.id}
            className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            aria-label={c.title}
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{c.title}</h4>
            <div className="relative h-64">
              <Doughnut
                data={{
                  labels: c.slices.map((s) => s.label),
                  datasets: [
                    {
                      data: c.slices.map((s) => s.value),
                      backgroundColor: c.slices.map((s) => s.color),
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  cutout: '62%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const v = Number(ctx.parsed);
                          const p = total > 0 ? (v / total) * 100 : 0;
                          return ` ${ctx.label}: ${money(v)} (${p.toFixed(1)}%)`;
                        },
                      },
                    },
                  },
                }}
              />
              {c.centerLabel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {c.centerLabel}
                  </span>
                  {c.centerSub && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">{c.centerSub}</span>
                  )}
                </div>
              )}
            </div>
            <ul className="mt-3 space-y-1 text-xs">
              {c.slices.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span
                      className="inline-block w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {money(s.value)} · {total > 0 ? ((s.value / total) * 100).toFixed(1) : '0.0'}%
                  </span>
                </li>
              ))}
            </ul>
            {c.caption && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{c.caption}</p>}
          </section>
        );
      })}
    </div>
  );
}
