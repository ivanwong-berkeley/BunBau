import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';

describe('Fidelity CSV Adapter & Router with Real Sample', () => {
  const fixturePath = path.resolve(__dirname, '../../fixtures/fidelity_sample.csv');
  const csvContent = fs.readFileSync(fixturePath, 'utf-8');

  it('router correctly identifies Fidelity format', () => {
    const router = new CSVRouter();
    const result = router.routeAndParse(csvContent, 'user-123');
    expect(result.adapterId).toBe('fidelity_csv');
    expect(result.accounts.length).toBe(1);
  });

  it('extracts account identity and metadata accurately', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('Fidelity');
    expect(account.accountMaskedNumber).toBe('***-6238');
    expect(account.accountName).toBe('Individual - TOD');
    expect(account.accountType).toBe('Brokerage');
    expect(result.extractedTimestamp).toContain('Oct-06-2026');
  });

  it('accurately aggregates FCASH** and Pending activity cash balances', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');
    const account = result.accounts[0];

    // FCASH: 100,098.97, Pending activity: 232.77 -> Total Cash: 100,331.74
    expect(account.cashBalance).toBeCloseTo(100331.74, 2);
  });

  it('extracts all 5 options with exact OCC terms', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');
    const account = result.accounts[0];

    const options = account.positions.filter((p) => p.assetCategory === 'Option');
    expect(options.length).toBe(5);

    // AAPL PUT $310
    const aapl = options.find((o) => o.optionDetails?.underlying === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl?.optionDetails?.type).toBe('PUT');
    expect(aapl?.optionDetails?.strike).toBe(310);
    expect(aapl?.optionDetails?.expirationDate).toBe('2026-10-23');
    expect(aapl?.optionDetails?.contractsCount).toBe(1);

    // MSFT PUT $475
    const msft = options.find((o) => o.optionDetails?.underlying === 'MSFT');
    expect(msft).toBeDefined();
    expect(msft?.optionDetails?.type).toBe('PUT');
    expect(msft?.optionDetails?.strike).toBe(475);
    expect(msft?.optionDetails?.expirationDate).toBe('2026-10-23');

    // NVDA PUT $200
    const nvda = options.find((o) => o.optionDetails?.underlying === 'NVDA');
    expect(nvda).toBeDefined();
    expect(nvda?.optionDetails?.type).toBe('PUT');
    expect(nvda?.optionDetails?.strike).toBe(200);
    expect(nvda?.optionDetails?.expirationDate).toBe('2026-11-06');

    // SLV CALL $68 (-2 contracts)
    const slv = options.find((o) => o.optionDetails?.underlying === 'SLV');
    expect(slv).toBeDefined();
    expect(slv?.optionDetails?.type).toBe('CALL');
    expect(slv?.optionDetails?.strike).toBe(68);
    expect(slv?.optionDetails?.expirationDate).toBe('2026-10-16');
    expect(slv?.optionDetails?.contractsCount).toBe(2);

    // T CALL $28 (-1 contract)
    const t = options.find((o) => o.optionDetails?.underlying === 'T');
    expect(t).toBeDefined();
    expect(t?.optionDetails?.type).toBe('CALL');
    expect(t?.optionDetails?.strike).toBe(28);
    expect(t?.optionDetails?.expirationDate).toBe('2026-11-20');
  });

  it('correctly calculates CSP locked collateral and free cash', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');
    const account = result.accounts[0];

    const csps = account.positions.filter(
      (p) => p.assetCategory === 'Option' && p.optionDetails?.type === 'PUT'
    );
    expect(csps.length).toBe(3);

    const lockedCollateral = csps.reduce((acc, p) => {
      const strike = p.optionDetails?.strike || 0;
      const contracts = p.optionDetails?.contractsCount || 1;
      return acc + strike * 100 * contracts;
    }, 0);

    // 310 * 100 + 475 * 100 + 200 * 100 = 31,000 + 47,500 + 20,000 = 98,500
    expect(lockedCollateral).toBe(98500);

    const netFreeCash = account.cashBalance - lockedCollateral;
    expect(netFreeCash).toBeCloseTo(1831.74, 2);
  });

  it('preserves exact fractional share precision and cleans parenthesized negative values', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');
    const account = result.accounts[0];

    // ORCL fractional shares: 3000.138
    const orcl = account.positions.find((p) => p.symbol === 'ORCL');
    expect(orcl).toBeDefined();
    expect(orcl?.quantity).toBe(3000.138);
    expect(orcl?.currentPrice).toBe(144.77);
    expect(orcl?.costBasis).toBe(162271.30);
    expect(orcl?.marketValue).toBe(434329.97);

    // SGOV classified as Bond_SGOV
    const sgov = account.positions.find((p) => p.symbol === 'SGOV');
    expect(sgov).toBeDefined();
    expect(sgov?.assetCategory).toBe('Bond_SGOV');
    expect(sgov?.quantity).toBe(774.474);
  });
});
