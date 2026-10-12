import { describe, it, expect } from 'vitest';
import { buildAllocationPlan, buildWaterfall, TARGET_MIX, riskOf, CASH_BENCHMARK_APY } from '../../../src/lib/strategist/allocationPlan';
import { parseReport, validateReport, reportToMarkdown, DISCLAIMER, markdownOnlyReport } from '../../../src/lib/strategist/reportSchema';
import { capMemory, buildContext, buildRecap, parseCondensed, openActionLines, EMPTY_MEMORY, MEMORY_CAPS, memoryToPrompt } from '../../../src/lib/strategist/memory';
import type { CanonicalPosition } from '../../../src/lib/portfolio/types';

const pos = (symbol: string, assetClass: any, marketValue: number, apy?: number): CanonicalPosition => ({
  id: symbol, symbol, name: symbol, assetClass, quantity: 1, marketValue, apy, institution: 'I', accountId: 'a',
});

describe('allocation plan', () => {
  const positions = [pos('CASH', 'Cash', 20000, 0.5), pos('CD1', 'CD', 30000, 4.5), pos('SGOV', 'BondETF', 10000, 4.2), pos('AAPL', 'Stock', 40000, 1), pos('CSP', 'CSP', 5000)];

  it('T4: classes sum to 100% and options are excluded', () => {
    const p = buildAllocationPlan(positions, 'Moderate');
    expect(p.total).toBe(100000);
    expect(p.rows.reduce((s, r) => s + r.currentPct, 0)).toBeCloseTo(100, 1);
    expect(p.rows.find((r) => r.slice === 'CDs')?.value).toBe(30000);
    expect(p.rows.find((r) => r.slice === 'SGOV/Bonds')?.value).toBe(10000);
  });

  it('T5: target mixes sum to 100 and deltas flag over/under weight', () => {
    for (const k of Object.keys(TARGET_MIX) as (keyof typeof TARGET_MIX)[]) {
      expect(Object.values(TARGET_MIX[k]).reduce((a, b) => a + b, 0)).toBe(100);
    }
    const cons = buildAllocationPlan(positions, 'Conservative');
    expect(cons.rows.find((r) => r.slice === 'Equities')?.status).toBe('overweight');
    const agg = buildAllocationPlan(positions, 'Aggressive');
    expect(agg.rows.find((r) => r.slice === 'Equities')?.status).toBe('underweight');
    expect(riskOf('weird')).toBe('Moderate');
  });

  it('cash drag uses the benchmark gap and yields add up to the blend', () => {
    const p = buildAllocationPlan(positions, 'Moderate', 20000);
    expect(p.cash.annualDragUsd).toBeCloseTo((20000 * (CASH_BENCHMARK_APY - 0.5)) / 100, 1);
    const total = p.rows.reduce((s, r) => s + r.apyContribution, 0);
    expect(total).toBeCloseTo((20000 * 0.005 + 30000 * 0.045 + 10000 * 0.042 + 40000 * 0.01) / 1000, 1);
  });

  it('empty portfolio does not divide by zero', () => {
    const p = buildAllocationPlan([], 'Moderate');
    expect(p.total).toBe(0);
    expect(p.rows.every((r) => r.currentPct === 0)).toBe(true);
  });
});

describe('waterfall', () => {
  it('T6: steps add up and the remaining gap equals target - projected', () => {
    const w = buildWaterfall(1.5, 10, [{ label: 'a', apyImpact: 2 }, { label: 'b', apyImpact: 1.5 }]);
    expect(w[0].running).toBe(1.5);
    expect(w.find((s) => s.kind === 'projected')?.running).toBe(5);
    expect(w.find((s) => s.kind === 'gap')?.delta).toBe(5);
    expect(w[w.length - 1].running).toBe(10);
  });
  it('T6 edge: target already reached has no gap bar', () => {
    const w = buildWaterfall(12, 10, []);
    expect(w.some((s) => s.kind === 'gap')).toBe(false);
  });
});

describe('report schema + export', () => {
  const good = { headline: 'h', summary: 's', markdown: '## Hi\n- a', risks: ['r'], actions: [{ id: 'a1', title: 'Do', expectedApyImpact: 1.2, risk: 'Low', amountUsd: 1000 }] };

  it('T7: accepts valid JSON (also inside a fence) and rejects out-of-range or malformed', () => {
    expect(parseReport('```json\n' + JSON.stringify(good) + '\n```').ok).toBe(true);
    expect(parseReport('no json here').ok).toBe(false);
    expect(validateReport({ ...good, actions: [{ title: 'x', expectedApyImpact: 99 }] }).ok).toBe(false);
    expect(validateReport({ ...good, actions: [{ title: 'x', expectedApyImpact: 1, amountUsd: -5 }] }).ok).toBe(false);
    expect(validateReport({ markdown: '' }).ok).toBe(false);
  });

  it('caps actions at 12 and falls back to markdown-only', () => {
    const many = { ...good, actions: Array.from({ length: 20 }, (_, i) => ({ title: `t${i}`, expectedApyImpact: 0.1 })) };
    const r = validateReport(many);
    expect(r.ok && r.report.actions.length).toBe(12);
    expect(markdownOnlyReport('  raw  ').markdown).toBe('raw');
  });

  it('T3: markdown export has the header, action list and disclaimer; no HTML escaping surprises', () => {
    const r = validateReport(good);
    if (!r.ok) throw new Error('bad');
    const md = reportToMarkdown(r.report, { version: 3, generatedAt: '2026-10-10', totalValue: 100000, currentApy: 1.53, targetApy: 10, risk: 'Moderate', modelTag: 'm (Tier 2)' });
    expect(md).toContain('# Yield Strategy Report (v3)');
    expect(md).toContain('Target APY: 10.00%');
    expect(md).toContain('## Action plan');
    expect(md).toContain('Model: m (Tier 2)');
    expect(md.trim().endsWith(`_${DISCLAIMER}_`)).toBe(true);
  });
});

describe('memory + context', () => {
  it('T9: caps lists and keeps open actions from the report state', () => {
    const big = capMemory({ goals: Array.from({ length: 40 }, (_, i) => 'g' + i), summary: 'x'.repeat(5000) });
    expect(big.goals.length).toBe(MEMORY_CAPS.perList);
    expect(big.summary.length).toBeLessThanOrEqual(MEMORY_CAPS.summaryChars);
    const open = openActionLines([
      { id: '1', title: 'Buy CD', detail: '', expectedApyImpact: 1, risk: 'Low', status: 'todo' },
      { id: '2', title: 'Done thing', detail: '', expectedApyImpact: 1, risk: 'Low', status: 'done' },
    ]);
    expect(open).toEqual(['Buy CD']);
    const m = parseCondensed('not json', { ...EMPTY_MEMORY, goals: ['keep me'] }, open);
    expect(m.goals).toEqual(['keep me']);
    expect(m.openActions).toEqual(['Buy CD']);
    const j = parseCondensed('{"goals":["a"],"decisions":["d"],"summary":"s","openActions":["AI tried to drop"]}', EMPTY_MEMORY, open);
    expect(j.openActions).toEqual(['Buy CD']);
    expect(j.decisions).toEqual(['d']);
  });

  it('T8: the context contains key fields and stays under budget', () => {
    const holdings = Array.from({ length: 15 }, (_, i) => ({ symbol: 'S' + i, value: i * 1000 }));
    const ctx = buildContext({ totalValue: 1e6, currentApy: 1.5, targetApy: 10, risk: 'Moderate', idleCash: 8000, allocation: [{ slice: 'Cash', currentPct: 5, targetPct: 5 }], topHoldings: holdings }, { ...EMPTY_MEMORY, summary: 'long relationship' }, 900);
    expect(ctx).toContain('targetApyPct');
    expect(ctx).toContain('long relationship');
    expect(ctx.length).toBeLessThan(1400);
    expect(memoryToPrompt(EMPTY_MEMORY)).toContain('new client');
  });

  it('T21: the login recap is built from memory', () => {
    expect(buildRecap(EMPTY_MEMORY)).toBeNull();
    const r = buildRecap({ ...EMPTY_MEMORY, goals: ['10% APY'], decisions: ['move cash to CDs'], openActions: ['a', 'b'] }, '2026-10-10T12:00:00Z');
    expect(r).toContain('2026-10-10');
    expect(r).toContain('move cash to CDs');
    expect(r).toContain('2 actions are still open');
  });
});
