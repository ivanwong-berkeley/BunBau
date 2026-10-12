'use client';

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { SmartTable } from '../common/SmartTable';
import { AllocationPlan, AllocationRow, WaterfallStep } from '../../lib/strategist/allocationPlan';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function Card({ title, subtitle, children, testId }: { title: string; subtitle?: string; children: React.ReactNode; testId: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 p-3" data-testid={testId}>
      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</h5>
      {subtitle && <p className="text-[11px] text-slate-500 mb-2">{subtitle}</p>}
      <div className="h-52">{children}</div>
    </div>
  );
}

export function StrategyCharts({ plan, steps, targetApy, currentApy }: { plan: AllocationPlan; steps: WaterfallStep[]; targetApy: number; currentApy: number }) {
  const labels = plan.rows.map((r) => r.slice);
  const over = plan.rows.filter((r) => r.status === 'overweight').map((r) => r.slice);
  const under = plan.rows.filter((r) => r.status === 'underweight').map((r) => r.slice);
  const verdict =
    plan.total <= 0
      ? 'No owned assets found.'
      : `${over.length ? `Overweight: ${over.join(', ')}. ` : ''}${under.length ? `Underweight: ${under.join(', ')}. ` : ''}${!over.length && !under.length ? 'Allocation is close to the suggested mix.' : ''}`;

  const axis = { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.15)' } };
  const legend = { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8, color: '#94a3b8', font: { size: 10 } } };

  const wf = {
    labels: steps.map((s) => s.label),
    datasets: [
      {
        label: 'APY %',
        data: steps.map((s, i) =>
          s.kind === 'action' || s.kind === 'gap' ? [steps[i - 1] ? (steps[i - 1].kind === 'gap' ? steps[i - 1].running : steps[i - 1].running) : 0, s.running] : [0, s.running]
        ),
        backgroundColor: steps.map((s) => (s.kind === 'start' ? '#64748b' : s.kind === 'action' ? '#10B981' : s.kind === 'gap' ? '#F43F5E' : s.kind === 'target' ? '#F59E0B' : '#8B5CF6')),
        borderRadius: 3,
      },
    ],
  };

  return (
    <div className="space-y-4" data-testid="strategy-charts">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="cash-kpis">
        {[
          ['Idle cash', usd(plan.cash.idleUsd)],
          ['Cash share', `${plan.cash.pct.toFixed(1)}% (guide ${plan.cash.guidelinePct}%)`],
          ['Cash drag / yr', usd(plan.cash.annualDragUsd)],
          ['Gap to target', `${Math.max(0, targetApy - currentApy).toFixed(2)} pts`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2">
            <p className="text-[10px] uppercase text-slate-500">{k}</p>
            <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{v}</p>
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-slate-700 dark:text-slate-200" data-testid="allocation-verdict">{verdict}</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card title="Where your money is" subtitle="Current allocation" testId="chart-allocation">
          <Doughnut data={{ labels, datasets: [{ data: plan.rows.map((r) => r.value), backgroundColor: COLORS, borderWidth: 0 }] }} options={{ maintainAspectRatio: false, cutout: '62%', plugins: { legend } }} />
        </Card>
        <Card title="Current vs suggested mix" subtitle="% of owned assets for your risk profile" testId="chart-target">
          <Bar
            data={{
              labels,
              datasets: [
                { label: 'Current %', data: plan.rows.map((r) => r.currentPct), backgroundColor: '#64748b', borderRadius: 3 },
                { label: 'Suggested %', data: plan.rows.map((r) => r.targetPct), backgroundColor: '#F59E0B', borderRadius: 3 },
              ],
            }}
            options={{ maintainAspectRatio: false, plugins: { legend }, scales: { x: axis, y: axis } }}
          />
        </Card>
        <Card title="Yield by asset class" subtitle="APY points each class contributes to the blend" testId="chart-yield">
          <Bar
            data={{ labels, datasets: [{ label: 'APY pts', data: plan.rows.map((r) => r.apyContribution), backgroundColor: COLORS, borderRadius: 3 }] }}
            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: axis, y: axis } }}
          />
        </Card>
        <Card title="Path to target APY" subtitle="Current → each action → target" testId="chart-waterfall">
          <Bar data={wf as any} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: axis, y: axis } }} />
        </Card>
      </div>

      <div data-testid="allocation-table">
        <SmartTable<AllocationRow>
          tableId="strategy-allocation"
          title="Allocation vs suggested mix"
          infoDescription="Current vs suggested allocation for your risk profile, with the dollars to move. Computed from your portfolio, not by the AI."
          rows={plan.rows}
          rowKey={(r) => r.slice}
          density="compact"
          columns={[
            { key: 'slice', label: 'Class', render: (r) => <span className="font-semibold">{r.slice}</span> },
            { key: 'value', label: 'Value', align: 'right', render: (r) => <span className="font-mono">{usd(r.value)}</span> },
            { key: 'currentPct', label: 'Current', align: 'right', render: (r) => <span className="font-mono">{r.currentPct.toFixed(1)}%</span> },
            { key: 'targetPct', label: 'Suggested', align: 'right', render: (r) => <span className="font-mono">{r.targetPct}%</span> },
            { key: 'shiftUsd', label: 'Move', align: 'right', render: (r) => <span className={`font-mono ${r.shiftUsd < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{r.shiftUsd >= 0 ? '+' : '-'}{usd(Math.abs(r.shiftUsd))}</span> },
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>
    </div>
  );
}
