/**
 * Deterministic allocation / yield maths for the Strategy page. The AI never invents these numbers;
 * charts and the action flow are computed here from the portfolio.
 */
import { CanonicalPosition } from '../portfolio/types';
import { BOND_ETF_SYMBOLS, round2 } from '../portfolio/selectors';

export const SLICES = ['Cash', 'CDs', 'SGOV/Bonds', 'Equities', 'Crypto'] as const;
export type Slice = (typeof SLICES)[number];
export type Risk = 'Conservative' | 'Moderate' | 'Aggressive';

/** Suggested mix (% of owned assets) per risk profile. Each row sums to 100. */
export const TARGET_MIX: Record<Risk, Record<Slice, number>> = {
  Conservative: { Cash: 5, CDs: 30, 'SGOV/Bonds': 35, Equities: 30, Crypto: 0 },
  Moderate: { Cash: 5, CDs: 15, 'SGOV/Bonds': 25, Equities: 52, Crypto: 3 },
  Aggressive: { Cash: 3, CDs: 5, 'SGOV/Bonds': 12, Equities: 73, Crypto: 7 },
};

/** Treasury-bill style yield used to price the cost of idle cash (percent). */
export const CASH_BENCHMARK_APY = 4.5;

export function riskOf(v: string | undefined | null): Risk {
  return v === 'Conservative' || v === 'Aggressive' ? v : 'Moderate';
}

export function sliceOf(p: CanonicalPosition): Slice | null {
  if (p.assetClass === 'CSP' || p.assetClass === 'CoveredCall' || p.option) return null;
  if (p.assetClass === 'Cash') return 'Cash';
  if (p.assetClass === 'CD') return 'CDs';
  if (p.assetClass === 'Treasury' || p.assetClass === 'BondETF' || BOND_ETF_SYMBOLS.has(p.symbol)) return 'SGOV/Bonds';
  if (p.assetClass === 'Crypto') return 'Crypto';
  return 'Equities';
}

export interface AllocationRow {
  slice: Slice;
  value: number;
  currentPct: number;
  targetPct: number;
  deltaPct: number; // current - target (positive = overweight)
  shiftUsd: number; // dollars to move to reach target (negative = reduce)
  status: 'overweight' | 'underweight' | 'on-target';
  yieldUsd: number;
  apyContribution: number; // percentage points of blended APY
}

export interface AllocationPlan {
  total: number;
  rows: AllocationRow[];
  cash: { idleUsd: number; pct: number; guidelinePct: number; annualDragUsd: number };
}

export function buildAllocationPlan(positions: CanonicalPosition[], risk: Risk, idleCashUsd?: number): AllocationPlan {
  const sums: Record<Slice, number> = { Cash: 0, CDs: 0, 'SGOV/Bonds': 0, Equities: 0, Crypto: 0 };
  const yields: Record<Slice, number> = { Cash: 0, CDs: 0, 'SGOV/Bonds': 0, Equities: 0, Crypto: 0 };
  for (const p of positions) {
    const s = sliceOf(p);
    if (!s) continue;
    sums[s] += p.marketValue;
    yields[s] += p.marketValue * ((p.apy ?? 0) / 100);
  }
  const total = SLICES.reduce((t, s) => t + sums[s], 0);
  const target = TARGET_MIX[risk];
  const rows: AllocationRow[] = SLICES.map((slice) => {
    const currentPct = total > 0 ? (sums[slice] / total) * 100 : 0;
    const delta = currentPct - target[slice];
    return {
      slice,
      value: round2(sums[slice]),
      currentPct: round2(currentPct),
      targetPct: target[slice],
      deltaPct: round2(delta),
      shiftUsd: round2(((target[slice] - currentPct) / 100) * total),
      status: delta > 5 ? 'overweight' : delta < -5 ? 'underweight' : 'on-target',
      yieldUsd: round2(yields[slice]),
      apyContribution: total > 0 ? round2((yields[slice] / total) * 100) : 0,
    };
  });
  const cashValue = sums.Cash;
  const idle = idleCashUsd ?? cashValue;
  const cashApy = cashValue > 0 ? (yields.Cash / cashValue) * 100 : 0;
  return {
    total: round2(total),
    rows,
    cash: {
      idleUsd: round2(idle),
      pct: total > 0 ? round2((cashValue / total) * 100) : 0,
      guidelinePct: target.Cash,
      annualDragUsd: round2(Math.max(0, idle) * Math.max(0, CASH_BENCHMARK_APY - cashApy) / 100),
    },
  };
}

export interface WaterfallStep {
  label: string;
  /** Change in APY points (null for the absolute bars). */
  delta: number | null;
  /** Running APY after this step. */
  running: number;
  kind: 'start' | 'action' | 'projected' | 'gap' | 'target';
}

/** Current APY -> each action -> projected -> remaining gap -> target. */
export function buildWaterfall(
  currentApy: number,
  targetApy: number,
  actions: { label: string; apyImpact: number }[]
): WaterfallStep[] {
  const steps: WaterfallStep[] = [{ label: 'Current', delta: null, running: round2(currentApy), kind: 'start' }];
  let running = currentApy;
  for (const a of actions) {
    const d = Number.isFinite(a.apyImpact) ? a.apyImpact : 0;
    running += d;
    steps.push({ label: a.label, delta: round2(d), running: round2(running), kind: 'action' });
  }
  steps.push({ label: 'Projected', delta: null, running: round2(running), kind: 'projected' });
  const remaining = targetApy - running;
  if (remaining > 0.005) {
    steps.push({ label: 'Remaining gap', delta: round2(remaining), running: round2(targetApy), kind: 'gap' });
  }
  steps.push({ label: 'Target', delta: null, running: round2(targetApy), kind: 'target' });
  return steps;
}
