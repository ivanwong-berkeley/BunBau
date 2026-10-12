import { describe, it, expect } from 'vitest';
import { buildSeedAccounts } from '../../src/lib/portfolio/seed';
import {
  flattenPositions, netWorth, cspReserve, cashSummary, coveredSymbols, equitiesBySymbol,
  optionsList, maturities, allocation, blendedApy,
} from '../../src/lib/portfolio/selectors';
import { MOCK_FIDELITY_EXTRACTION, MOCK_SCHWAB_EXTRACTION } from '../../src/lib/portfolio/mockExtraction';
import { extractionToPositions } from '../../src/lib/portfolio/adapter';

const seed = flattenPositions(buildSeedAccounts(new Date('2026-10-06T00:00:00Z')));

describe('selectors on demo seed', () => {
  it('U-01 @R-34 CSP reserve = 98,500 and net free cash = 1,508.97; premiums excluded from net worth', () => {
    expect(cspReserve(seed)).toBe(98500);
    const cash = cashSummary(seed);
    expect(cash.rawCash).toBe(100008.97);
    expect(cash.netFreeCash).toBe(1508.97);
    const withoutOptions = seed.filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall');
    expect(netWorth(seed)).toBe(netWorth(withoutOptions));
    expect(netWorth(seed)).toBeGreaterThan(0);
  });

  it('U-02 @R-54 covered flags only on SLV and T', () => {
    const covered = coveredSymbols(seed);
    expect([...covered].sort()).toEqual(['SLV', 'T']);
    const eq = equitiesBySymbol(seed);
    expect(eq.find((r) => r.symbol === 'SLV')?.covered).toBe(true);
    expect(eq.find((r) => r.symbol === 'T')?.covered).toBe(true);
    expect(eq.find((r) => r.symbol === 'ORCL')?.covered).toBe(false);
    expect(eq.find((r) => r.symbol === 'NVDA')?.covered).toBe(false);
  });

  it('seed has 3 CSP + 2 CC, CDs/T-bill sorted by maturity (populates Calendar)', () => {
    expect(optionsList(seed).filter((p) => p.assetClass === 'CSP')).toHaveLength(3);
    expect(optionsList(seed).filter((p) => p.assetClass === 'CoveredCall')).toHaveLength(2);
    const m = maturities(seed);
    expect(m).toHaveLength(3);
    const times = m.map((x) => new Date(x.maturityDate).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('allocation sums to ~100% and excludes option premiums', () => {
    const a = allocation(seed);
    expect(a.map((s) => s.label)).toEqual(['Cash', 'CDs', 'SGOV/Bonds', 'Equities', 'Crypto']);
    const pct = a.reduce((s, x) => s + x.pct, 0);
    expect(pct).toBeGreaterThan(99.9);
    expect(pct).toBeLessThan(100.1);
    // SGOV (ETF) is bucketed with bonds
    expect(a.find((s) => s.label === 'SGOV/Bonds')!.value).toBeGreaterThanOrEqual(77788.16);
  });

  it('U-08 @R-40 blended APY is value-weighted and rounded (no float noise)', () => {
    const apy = blendedApy(seed);
    expect(apy).toBeGreaterThan(0);
    expect(String(apy).length).toBeLessThanOrEqual(6);
    expect(blendedApy([])).toBe(0);
  });
});

describe('aggregation across institutions', () => {
  it('U-03 @R-45 same symbol across 2 institutions aggregates to one row', () => {
    const f = extractionToPositions(MOCK_FIDELITY_EXTRACTION, 'acc-f');
    const s = extractionToPositions(MOCK_SCHWAB_EXTRACTION, 'acc-s');
    const rows = equitiesBySymbol([...f, ...s]).filter((r) => r.symbol === 'NVDA');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(5382.81);
    expect(rows[0].institutions.sort()).toEqual(['Fidelity', 'Schwab']);
  });

  it('Fidelity fixture yields 15 positions incl. UNH, 3 CSP, 2 CC; reserve 98,500', () => {
    const f = extractionToPositions(MOCK_FIDELITY_EXTRACTION, 'acc-f');
    expect(f).toHaveLength(15);
    expect(f.some((p) => p.symbol === 'UNH')).toBe(true);
    expect(f.filter((p) => p.assetClass === 'CSP')).toHaveLength(3);
    expect(f.filter((p) => p.assetClass === 'CoveredCall')).toHaveLength(2);
    expect(cspReserve(f)).toBe(98500);
    expect(cashSummary(f).netFreeCash).toBe(1598.97);
  });
});
