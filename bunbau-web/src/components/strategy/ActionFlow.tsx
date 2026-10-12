'use client';

import React from 'react';
import { ArrowDown, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { ActionStatus, StrategyAction } from '../../lib/strategist/reportSchema';

const NEXT: Record<ActionStatus, ActionStatus> = { todo: 'doing', doing: 'done', done: 'todo' };
const riskColor = { Low: 'text-emerald-500', Medium: 'text-amber-500', High: 'text-rose-500' } as const;

/** Step-by-step execution flow. Status changes are saved with the report version. */
export function ActionFlow({
  actions,
  onStatus,
  readOnly = false,
}: {
  actions: StrategyAction[];
  onStatus?: (id: string, s: ActionStatus) => void;
  readOnly?: boolean;
}) {
  if (!actions.length) {
    return <p className="text-sm text-slate-500" data-testid="action-flow-empty">No action steps yet. Generate a report to get a step-by-step plan.</p>;
  }
  return (
    <ol className="space-y-0" data-testid="action-flow">
      {actions.map((a, i) => (
        <li key={a.id} data-testid={`action-step-${i + 1}`}>
          <div className={`rounded-xl border p-3 flex gap-3 items-start ${a.status === 'done' ? 'border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40'}`}>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onStatus?.(a.id, NEXT[a.status])}
              title={`Status: ${a.status}. Click to change.`}
              aria-label={`Step ${i + 1} status ${a.status}`}
              data-testid={`action-status-${i + 1}`}
              className="mt-0.5 shrink-0 disabled:cursor-default"
            >
              {a.status === 'done' ? <CheckCircle2 size={20} className="text-emerald-500" /> : a.status === 'doing' ? <Loader2 size={20} className="text-amber-500" /> : <Circle size={20} className="text-slate-400" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                <span className="text-slate-400 mr-1">{i + 1}.</span>
                {a.title}
                {a.symbol ? <span className="ml-2 text-xs font-mono text-primary-violet">{a.symbol}</span> : null}
              </p>
              {a.detail && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{a.detail}</p>}
              <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] font-mono">
                {a.amountUsd !== undefined && <span>${a.amountUsd.toLocaleString('en-US')}</span>}
                <span className="text-emerald-500">APY {a.expectedApyImpact >= 0 ? '+' : ''}{a.expectedApyImpact.toFixed(2)} pts</span>
                <span className={riskColor[a.risk]}>risk {a.risk}</span>
                <span className="uppercase text-slate-400">{a.status}</span>
              </div>
            </div>
          </div>
          {i < actions.length - 1 && (
            <div className="flex justify-center py-1 text-slate-300 dark:text-slate-600" aria-hidden>
              <ArrowDown size={18} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
