import { describe, it, expect } from 'vitest';
import { blendedApy, blendedApyBreakdown } from '../../../src/lib/portfolio/selectors';
import {
  getBlendedApyDrilldown,
  getPortfolioApyDrilldown,
} from '../../../src/lib/portfolio/drilldownSelectors';
import {
  buildApyDrillDown,
  buildPortfolioApyDrillDown,
} from '../../../src/lib/portfolio/drilldownFormatters';
import {
  buildPortfolioApyCharts,
  buildYieldContributionCharts,
  groupSmallSlices,
} from '../../../src/lib/portfolio/apyCharts';
import type { CanonicalPosition, CanonicalAccount } from '../../../src/lib/portfolio/types';

const pos = (o: Partial<CanonicalPosition> & { symbol: string; marketValue: number }): CanonicalPosition =>
  ({
    id: o.symbol,
    name: o.symbol,
    assetClass: 'Cash',
    quantity: 1,
    institution: 'Fidelity',
    accountId: 'a1',
    ...o,
  }) as CanonicalPosition;

const accounts: CanonicalAccount[] = [
  { id: 'a1', institution: 'Fidelity', maskedAccount: '***1234', accountType: 'Brokerage', positions: [], updatedAt: '' },
];

const positions: CanonicalPosition[] = [
  pos({ symbol: 'SPAXX', marketValue: 400000, apy: 4.0 }),
  pos({ symbol: 'CD1', marketValue: 300000, apy: 4.5, assetClass: 'CD' }),
  pos({ symbol: 'AAPL', marketValue: 800000, assetClass: 'Equity' }),
  pos({ symbol: 'NVDA', marketValue: 500000, assetClass: 'Equity' }),
];

describe('v5.3 blended APY: two bases, one source of truth', () => {
  const bd = blendedApyBreakdown(positions);

  it('T2 bridge: yield-bearing APY x yield share = portfolio APY', () => {
    expect((bd.apyYieldBearing * bd.yieldSharePct) / 100).toBeCloseTo(bd.apyPortfolio, 1);
  });

  it('breakdown values', () => {
    expect(bd.totalValue).toBe(2000000);
    expect(bd.yieldValue).toBe(700000);
    expect(bd.nonYieldValue).toBe(1300000);
    expect(bd.annualIncome).toBeCloseTo(29500, 2);
    expect(bd.apyYieldBearing).toBeCloseTo(4.21, 2);
    expect(bd.apyPortfolio).toBeCloseTo(1.48, 2);
  });

  it('card helper equals breakdown portfolio APY', () => {
    expect(blendedApy(positions)).toBe(bd.apyPortfolio);
  });

  it('T1 portfolio drill-down contributions sum to the card value', () => {
    const rows = getPortfolioApyDrilldown(positions, accounts);
    const sum = rows.reduce((s, r) => s + r.weightedContribution, 0);
    expect(sum).toBeCloseTo(bd.apyPortfolio, 1);
    expect(rows).toHaveLength(4);
  });

  it('yield-bearing drill-down contributions sum to yield-bearing APY', () => {
    const rows = getBlendedApyDrilldown(positions, accounts);
    const sum = rows.reduce((s, r) => s + r.weightedContribution, 0);
    expect(sum).toBeCloseTo(bd.apyYieldBearing, 1);
  });

  it('T3 options are excluded from both bases', () => {
    const withOption = [
      ...positions,
      pos({
        symbol: 'AAPL260101P100',
        marketValue: 5000,
        apy: 9,
        assetClass: 'Option',
        option: { underlying: 'AAPL', right: 'PUT', strike: 100, expiry: '2026-01-01', contracts: -1 } as any,
      }),
    ];
    expect(blendedApyBreakdown(withOption)).toEqual(bd);
    expect(getBlendedApyDrilldown(withOption, accounts)).toHaveLength(2);
    expect(getPortfolioApyDrilldown(withOption, accounts)).toHaveLength(4);
  });

  it('T7 edge cases: empty, all non-yield', () => {
    expect(blendedApyBreakdown([])).toMatchObject({ apyPortfolio: 0, apyYieldBearing: 0, totalValue: 0 });
    const none = blendedApyBreakdown([pos({ symbol: 'X', marketValue: 100 })]);
    expect(none.apyPortfolio).toBe(0);
    expect(none.apyYieldBearing).toBe(0);
    expect(none.nonYieldValue).toBe(100);
  });

  it('T6 income vs non-income pie sums to total value; shares add to 100%', () => {
    const cfg = buildPortfolioApyDrillDown(positions, accounts);
    const charts = cfg.charts!(cfg.rows);
    const total = charts[0].slices.reduce((s, x) => s + x.value, 0);
    expect(total).toBe(bd.totalValue);
    expect(charts[0].slices.map((s) => s.value)).toEqual([700000, 1300000]);
    expect(charts[0].centerLabel).toBe('1.48%');
    expect(cfg.defaultView).toBe('pie');
    expect(cfg.related).toBeDefined();
    expect(cfg.related!.build().title).toContain('Yield-bearing');
  });

  it('T5 yield-bearing pie sums to the income total', () => {
    const cfg = buildApyDrillDown(positions, accounts);
    const charts = cfg.charts!(cfg.rows);
    const total = charts[0].slices.reduce((s, x) => s + x.value, 0);
    expect(total).toBeCloseTo(bd.annualIncome, 2);
    expect(cfg.defaultView).toBeUndefined();
  });

  it('T8 charts follow the rows they are given (institution/search filter)', () => {
    const cfg = buildPortfolioApyDrillDown(positions, accounts);
    const only = cfg.rows.filter((r) => r.rawValues!.symbol === 'AAPL');
    const charts = buildPortfolioApyCharts(only);
    expect(charts[0].slices).toHaveLength(1);
    expect(charts[0].slices[0].label).toContain('Non-income');
    expect(buildYieldContributionCharts([])[0].slices).toEqual([]);
  });

  it('groupSmallSlices groups the tail into Other and keeps totals', () => {
    const slices = Array.from({ length: 12 }, (_, i) => ({ label: `S${i}`, value: 10 }));
    const grouped = groupSmallSlices(slices, 5);
    expect(grouped).toHaveLength(6);
    expect(grouped[5].label).toBe('Other');
    expect(grouped.reduce((s, x) => s + x.value, 0)).toBe(120);
  });
});
