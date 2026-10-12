import { describe, it, expect } from 'vitest';
import { CanonicalPosition, CanonicalAccount } from '../../../src/lib/portfolio/types';
import { allocation, ALLOCATION_LABELS, cryptoBySymbol, round8 } from '../../../src/lib/portfolio/selectors';
import { getCryptoDrilldown } from '../../../src/lib/portfolio/drilldownSelectors';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { exportReportToCsv } from '../../../src/lib/reports/csvExporter';
import { SLICES, sliceOf, buildAllocationPlan, TARGET_MIX } from '../../../src/lib/strategist/allocationPlan';

describe('Digital Currency (Crypto / Bitcoin) Integration', () => {
  const samplePositions: CanonicalPosition[] = [
    {
      id: 'fid_crypto_cash',
      symbol: 'USD***',
      name: 'US DOLLARS',
      assetClass: 'Cash',
      quantity: 1,
      marketValue: 4170.20,
      costBasis: 4170.20,
      institution: 'Fidelity',
      accountId: 'fidelity_7536801059',
    },
    {
      id: 'fid_crypto_btc',
      symbol: 'BTC/USD',
      name: 'BITCOIN',
      assetClass: 'Crypto',
      quantity: 0.05633444,
      marketValue: 4695.81,
      costBasis: 3490.84,
      institution: 'Fidelity',
      accountId: 'fidelity_7536801059',
    },
    {
      id: 'fid_eq_spy',
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      assetClass: 'ETF',
      quantity: 10,
      marketValue: 5000.00,
      costBasis: 4500.00,
      institution: 'Fidelity',
      accountId: 'fidelity_1234',
    },
  ];

  const sampleAccounts: CanonicalAccount[] = [
    {
      id: 'fidelity_7536801059',
      institution: 'Fidelity',
      maskedAccount: '***-1059',
      accountType: 'Crypto',
      positions: [samplePositions[0], samplePositions[1]],
      updatedAt: '2026-10-11T00:00:00Z',
    },
    {
      id: 'fidelity_1234',
      institution: 'Fidelity',
      maskedAccount: '***-1234',
      accountType: 'Brokerage',
      positions: [samplePositions[2]],
      updatedAt: '2026-10-11T00:00:00Z',
    },
  ];

  it('includes Crypto as a 5th first-class slice in ALLOCATION_LABELS', () => {
    expect(ALLOCATION_LABELS).toContain('Crypto');
    expect(ALLOCATION_LABELS).toEqual(['Cash', 'CDs', 'SGOV/Bonds', 'Equities', 'Crypto']);
  });

  it('separates Crypto from Equities in allocation()', () => {
    // Only the Fidelity Crypto account positions (no SPY)
    const cryptoAcctPositions = [samplePositions[0], samplePositions[1]];
    const slices = allocation(cryptoAcctPositions);

    const cashSlice = slices.find((s) => s.label === 'Cash');
    const eqSlice = slices.find((s) => s.label === 'Equities');
    const cryptoSlice = slices.find((s) => s.label === 'Crypto');

    expect(cashSlice?.value).toBe(4170.20);
    expect(cryptoSlice?.value).toBe(4695.81);
    expect(eqSlice?.value).toBe(0.00); // Equities must NOT include Bitcoin!

    // Verify percentages sum accurately
    const total = 4170.20 + 4695.81;
    expect(cashSlice?.pct).toBeCloseTo((4170.20 / total) * 100, 1);
    expect(cryptoSlice?.pct).toBeCloseTo((4695.81 / total) * 100, 1);
  });

  it('computes cryptoBySymbol with high fractional precision and cost basis', () => {
    const cryptoRows = cryptoBySymbol(samplePositions, 13866.01);
    expect(cryptoRows).toHaveLength(1);

    const btc = cryptoRows[0];
    expect(btc.symbol).toBe('BTC/USD');
    expect(btc.name).toBe('BITCOIN');
    expect(btc.quantity).toBe(0.05633444);
    expect(btc.marketValue).toBe(4695.81);
    expect(btc.costBasis).toBe(3490.84);
    expect(btc.unrealizedPnl).toBe(1204.97);
    expect(btc.unrealizedPnlPct).toBeCloseTo((1204.97 / 3490.84) * 100, 2);
    expect(btc.currentPrice).toBeCloseTo(4695.81 / 0.05633444, 2);
    expect(btc.institutions).toContain('Fidelity');
    expect(btc.accounts).toContain('fidelity_7536801059');
  });

  it('generates getCryptoDrilldown with account metadata', () => {
    const drilldown = getCryptoDrilldown(samplePositions, sampleAccounts);
    expect(drilldown).toHaveLength(1);

    const row = drilldown[0];
    expect(row.symbol).toBe('BTC/USD');
    expect(row.institution).toBe('Fidelity');
    expect(row.accountMasked).toBe('***-1059');
    expect(row.accountType).toBe('Crypto');
    expect(row.marketValue).toBe(4695.81);
    expect(row.costBasis).toBe(3490.84);
    expect(row.unrealizedPnl).toBe(1204.97);
  });

  it('generates Consolidated Report with Section 6 Digital Currency Ledger', () => {
    const report = buildConsolidatedReport(samplePositions, sampleAccounts, {
      reportTitle: 'Test Crypto Portfolio Audit Report',
    });

    expect(report.section1_ExecutiveSummary.cryptoValue).toBe(4695.81);
    expect(report.section6_DigitalCurrency).toBeDefined();
    expect(report.section6_DigitalCurrency.totalCryptoValue).toBe(4695.81);
    expect(report.section6_DigitalCurrency.totalCostBasis).toBe(3490.84);
    expect(report.section6_DigitalCurrency.totalUnrealizedPnl).toBe(1204.97);
    expect(report.section6_DigitalCurrency.uniqueAssetsCount).toBe(1);
    expect(report.section6_DigitalCurrency.rows).toHaveLength(1);
    expect(report.section6_DigitalCurrency.rows[0].symbol).toBe('BTC/USD');

    // Section 7 Flat master ledger
    expect(report.section7_MasterFlatLedger).toBeDefined();
    const btcFlat = report.section7_MasterFlatLedger.find((r) => r.symbol === 'BTC/USD');
    expect(btcFlat).toBeDefined();
    expect(btcFlat?.assetClass).toBe('Crypto');
    expect(btcFlat?.marketValue).toBe(4695.81);
  });

  it('exports Section 6 Digital Currency Ledger into CSV export', () => {
    const report = buildConsolidatedReport(samplePositions, sampleAccounts);
    const csv = exportReportToCsv(report);

    expect(csv).toContain('SECTION 6: DIGITAL CURRENCY & CRYPTO ASSETS LEDGER');
    expect(csv).toContain('Aggregated Crypto Value,$4695.81');
    expect(csv).toContain('Total Cost Basis,$3490.84');
    expect(csv).toContain('BTC/USD');
    expect(csv).toContain('BITCOIN');
    expect(csv).toContain('SECTION 7: COMPREHENSIVE FLAT MASTER AUDIT LEDGER (MACHINE-READABLE)');
  });

  it('includes Crypto in strategist allocationPlan with risk-adjusted target mix', () => {
    expect(SLICES).toContain('Crypto');
    expect(sliceOf(samplePositions[1])).toBe('Crypto');

    const plan = buildAllocationPlan(samplePositions, 'Moderate');
    expect(plan.rows.find((r) => r.slice === 'Crypto')).toBeDefined();

    const cryptoRow = plan.rows.find((r) => r.slice === 'Crypto')!;
    expect(cryptoRow.value).toBe(4695.81);
    expect(cryptoRow.targetPct).toBe(TARGET_MIX.Moderate.Crypto); // 3%
    expect(cryptoRow.status).toBe('overweight'); // 4695.81 is ~33% of 13866, way over 3%
  });
});
