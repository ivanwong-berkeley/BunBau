import { describe, it, expect } from 'vitest';
import { normalizeExtraction } from '../../src/lib/extraction/normalize';
import { extractionToPositions } from '../../src/lib/portfolio/adapter';
import { equitiesBySymbol, allocation, netWorth, cashSummary, optionsList } from '../../src/lib/portfolio/selectors';

/** Ground truth read by eye from the Fidelity "Individual - TOD" screenshot (account total $674,397.90). */
const FIDELITY_RAW = (sgovCategory: string) => ({
  institution: 'Fidelity',
  account: 'X24336238',
  accountTotal: 674397.9,
  positions: [
    { symbol: 'CASH', category: 'Cash', value: 100098.97 },
    { symbol: 'AAPL 310 Put', category: 'CSP', value: -103, quantity: -1 },
    { symbol: 'FBTC', category: 'ETF', value: 5864.78, quantity: 79.978 },
    { symbol: 'FCNTX', category: 'ETF', value: 7397.24, quantity: 266.088 },
    { symbol: 'GLDM', category: 'ETF', value: 1711.31, quantity: 20.857 },
    { symbol: 'MSFT 475 Put', category: 'CSP', value: -125, quantity: -1 },
    { symbol: 'NVDA', category: 'Stock', value: 4382.81, quantity: 18.734 },
    { symbol: 'NVDA 200 Put', category: 'CSP', value: -89, quantity: -1 },
    { symbol: 'ORCL', category: 'Stock', value: 426919.63, quantity: 3000.138 },
    { symbol: 'SGOV', category: sgovCategory, value: 77788.16, quantity: 774.474 },
    { symbol: 'SLV', category: 'ETF', value: 10948, quantity: 200 },
    { symbol: 'SLV 68 Call', category: 'Covered Call', value: -8, quantity: -2 },
    { symbol: 'T', category: 'Stock', value: 2430, quantity: 100 },
    { symbol: 'T 28 Call', category: 'Covered Call', value: -8, quantity: -1 },
    { symbol: 'UNH', category: 'Stock', value: 37190, quantity: 100 },
  ],
});

describe.each(['ETF', 'BondETF', 'Treasury', 'Bond/SGOV'])('Fidelity import, model labels SGOV as "%s"', (label) => {
  const ex = normalizeExtraction(FIDELITY_RAW(label));
  const positions = extractionToPositions(ex, 'acct1');

  it('reconciles with the stated account total', () => {
    expect(ex.reconciliation?.ok).toBe(true);
    expect(ex.reconciliation?.computedTotal).toBe(674397.9);
  });

  it('SGOV is listed in Equities Portfolio (Stocks & ETFs) when it is an ETF', () => {
    const syms = equitiesBySymbol(positions).map((r) => r.symbol);
    if (label === 'Treasury' || label === 'Bond/SGOV') {
      // normalize forces known bond ETFs to ETF so they are never hidden
      expect(ex.positions.find((p) => p.symbol === 'SGOV')?.category).toBe('ETF');
    }
    expect(syms).toContain('SGOV');
  });

  it('every owned position lands in exactly one dashboard container', () => {
    const owned = positions.filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall');
    const eq = new Set(equitiesBySymbol(positions).map((r) => r.symbol));
    const cashRows = positions.filter((p) => p.assetClass === 'Cash');
    for (const p of owned) {
      const inEq = eq.has(p.symbol);
      const inCash = p.assetClass === 'Cash';
      expect(inEq || inCash, `${p.symbol} is invisible`).toBe(true);
      expect(inEq && inCash).toBe(false);
    }
    expect(cashRows).toHaveLength(1);
    expect(optionsList(positions).map((o) => o.symbol).sort()).toEqual(
      ['AAPL 310 Put', 'MSFT 475 Put', 'NVDA 200 Put', 'SLV 68 Call', 'T 28 Call'].sort()
    );
  });

  it('allocation, equities and cash add up to net worth (no leakage, no double count)', () => {
    const alloc = allocation(positions).reduce((s, a) => s + a.value, 0);
    const eq = equitiesBySymbol(positions).reduce((s, r) => s + r.value, 0);
    const cash = cashSummary(positions).rawCash;
    expect(Math.round(alloc * 100)).toBe(Math.round(netWorth(positions) * 100));
    expect(Math.round((eq + cash) * 100)).toBe(Math.round(netWorth(positions) * 100));
    expect(netWorth(positions)).toBe(674397.9 + 333); // account total is net of short-option liabilities
  });

  it('CSP reserve = 100 x (310 + 475 + 200) once strikes are recovered from names', () => {
    expect(cashSummary(positions).cspReserve).toBe(98500);
  });
});

describe('reconciliation flags a dropped row', () => {
  it('reports a mismatch when a position is missing', () => {
    const raw = FIDELITY_RAW('ETF');
    raw.positions = raw.positions.filter((p) => p.symbol !== 'SGOV');
    const r = normalizeExtraction(raw);
    expect(r.reconciliation?.ok).toBe(false);
    expect(r.reconciliation?.diff).toBe(-77788.16);
  });
});
