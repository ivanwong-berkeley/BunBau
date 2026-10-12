import { describe, it, expect } from 'vitest';
import {
  getEquityDrilldown,
  getNetWorthDrilldown,
  getFreeCashDrilldown,
  getBlendedApyDrilldown,
  getOptionCollateralDrilldown,
  getAssetAllocationDrilldown,
} from '../../../src/lib/portfolio/drilldownSelectors';
import {
  buildNetWorthDrillDown,
  buildFreeCashDrillDown,
  buildApyDrillDown,
  buildOptionCollateralDrillDown,
  buildEquityDrillDown,
  buildAssetAllocationDrillDown,
} from '../../../src/lib/portfolio/drilldownFormatters';
import { CanonicalPosition, CanonicalAccount } from '../../../src/lib/portfolio/types';

describe('Dashboard Drill-Down Breakdowns & Selectors', () => {
  const sampleAccounts: CanonicalAccount[] = [
    {
      id: 'acc_fid_1',
      institution: 'Fidelity',
      accountType: 'Brokerage',
      accountMasked: '...238',
      positionsCount: 3,
      totalValue: 50000,
    },
    {
      id: 'acc_schwab_1',
      institution: 'Schwab',
      accountType: 'Rollover IRA',
      accountMasked: '...673',
      positionsCount: 2,
      totalValue: 30000,
    },
    {
      id: 'acc_citi_1',
      institution: 'Citi',
      accountType: 'CD Account',
      accountMasked: '...CD1',
      positionsCount: 1,
      totalValue: 20000,
    },
  ];

  const samplePositions: CanonicalPosition[] = [
    // Fidelity NVDA stock (100 shares, covered by CC)
    {
      id: 'p1',
      symbol: 'NVDA',
      description: 'NVIDIA CORP',
      assetClass: 'Stock',
      quantity: 100,
      costBasis: 100,
      currentPrice: 120,
      marketValue: 12000,
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
    },
    // Fidelity NVDA Covered Call
    {
      id: 'p2',
      symbol: 'NVDA 10/16/26 C 130',
      underlying: 'NVDA',
      description: 'CALL NVDA @ 130',
      assetClass: 'Option',
      quantity: -1,
      optionType: 'Call',
      strikePrice: 130,
      expirationDate: '2026-10-16',
      marketValue: -300,
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
    },
    // Fidelity Cash
    {
      id: 'p3',
      symbol: 'SPAXX',
      description: 'FIDELITY GOVERNMENT MONEY MARKET',
      assetClass: 'Cash',
      quantity: 25000,
      currentPrice: 1,
      marketValue: 25000,
      apy: 4.85,
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
    },
    // Schwab NVDA stock (50 shares, uncovered)
    {
      id: 'p4',
      symbol: 'NVDA',
      description: 'NVIDIA CORP',
      assetClass: 'Stock',
      quantity: 50,
      costBasis: 110,
      currentPrice: 120,
      marketValue: 6000,
      institution: 'Schwab',
      accountId: 'acc_schwab_1',
    },
    // Schwab CSP on AAPL (Strike 180, 1 contract = $18,000 locked)
    {
      id: 'p5',
      symbol: 'AAPL 11/20/26 P 180',
      underlying: 'AAPL',
      description: 'PUT AAPL @ 180',
      assetClass: 'Option',
      quantity: -1,
      optionType: 'Put',
      strikePrice: 180,
      expirationDate: '2026-11-20',
      marketValue: -400,
      institution: 'Schwab',
      accountId: 'acc_schwab_1',
    },
    // Schwab Cash
    {
      id: 'p6',
      symbol: 'SWVXX',
      description: 'SCHWAB VALUE ADVANTAGE MONEY FUND',
      assetClass: 'Cash',
      quantity: 24000,
      currentPrice: 1,
      marketValue: 24000,
      apy: 5.15,
      institution: 'Schwab',
      accountId: 'acc_schwab_1',
    },
    // Citi CD
    {
      id: 'p7',
      symbol: 'CITI-CD-1YR',
      description: 'CITIBANK 1-YR CD',
      assetClass: 'FixedIncome',
      quantity: 1,
      currentPrice: 20000,
      marketValue: 20000,
      apy: 4.5,
      maturityDate: '2027-10-01',
      institution: 'Citi',
      accountId: 'acc_citi_1',
    },
  ];

  describe('getEquityDrilldown', () => {
    it('returns breakdown across all accounts for a specific target equity symbol', () => {
      const rows = getEquityDrilldown(samplePositions, sampleAccounts, 'NVDA');
      expect(rows.length).toBe(2);

      // Fidelity holding
      const fidRow = rows.find((r) => r.institution === 'Fidelity');
      expect(fidRow).toBeDefined();
      expect(fidRow?.quantity).toBe(100);
      expect(fidRow?.marketValue).toBe(12000);
      expect(fidRow?.isCovered).toBe(true); // CC active
      expect(fidRow?.percentOfSymbol).toBeCloseTo(66.67, 1);

      // Schwab holding
      const schwabRow = rows.find((r) => r.institution === 'Schwab');
      expect(schwabRow).toBeDefined();
      expect(schwabRow?.quantity).toBe(50);
      expect(schwabRow?.marketValue).toBe(6000);
      expect(schwabRow?.isCovered).toBe(false); // No CC
      expect(schwabRow?.percentOfSymbol).toBeCloseTo(33.33, 1);
    });

    it('returns breakdown for all equities when targetSymbol is omitted', () => {
      const rows = getEquityDrilldown(samplePositions, sampleAccounts);
      expect(rows.length).toBe(2);
      expect(rows.map((r) => r.symbol)).toEqual(['NVDA', 'NVDA']);
    });
  });

  describe('getNetWorthDrilldown', () => {
    it('reconciles total net worth across all accounts with asset category attribution', () => {
      const rows = getNetWorthDrilldown(sampleAccounts, samplePositions);
      expect(rows.length).toBe(3);

      const fid = rows.find((r) => r.institution === 'Fidelity')!;
      expect(fid.cashValue).toBe(25000);
      expect(fid.equitiesValue).toBe(12000);
      expect(fid.optionsValue).toBe(-300);
      expect(fid.totalNetWorth).toBe(37000); // 25000 + 12000 (options premiums excluded)

      const schwab = rows.find((r) => r.institution === 'Schwab')!;
      expect(schwab.cashValue).toBe(24000);
      expect(schwab.equitiesValue).toBe(6000);
      expect(schwab.optionsValue).toBe(-400);
      expect(schwab.totalNetWorth).toBe(30000); // 24000 + 6000

      const citi = rows.find((r) => r.institution === 'Citi')!;
      expect(citi.fixedIncomeValue).toBe(20000);
      expect(citi.totalNetWorth).toBe(20000);

      const totalPortfolio = fid.totalNetWorth + schwab.totalNetWorth + citi.totalNetWorth;
      expect(totalPortfolio).toBe(87000);
      expect(fid.percentOfPortfolio).toBeCloseTo((37000 / 87000) * 100, 1);
    });
  });

  describe('getFreeCashDrilldown', () => {
    it('accurately computes raw cash, CSP locked collateral, and net free cash per account', () => {
      const rows = getFreeCashDrilldown(samplePositions, sampleAccounts);
      expect(rows.length).toBe(2); // Fidelity & Schwab have cash

      const fid = rows.find((r) => r.institution === 'Fidelity')!;
      expect(fid.rawCash).toBe(25000);
      expect(fid.cspReserve).toBe(0);
      expect(fid.netFreeCash).toBe(25000);

      const schwab = rows.find((r) => r.institution === 'Schwab')!;
      expect(schwab.rawCash).toBe(24000);
      expect(schwab.cspReserve).toBe(18000); // 180 strike * 1 contract * 100
      expect(schwab.netFreeCash).toBe(6000); // 24000 - 18000
    });
  });

  describe('getBlendedApyDrilldown', () => {
    it('aggregates yield-bearing instruments and computes weighted contribution', () => {
      const rows = getBlendedApyDrilldown(samplePositions, sampleAccounts);
      expect(rows.length).toBe(3); // SPAXX (4.85%), SWVXX (5.15%), CITI-CD (4.50%)

      const spaxx = rows.find((r) => r.symbol === 'SPAXX')!;
      expect(spaxx.marketValue).toBe(25000);
      expect(spaxx.apy).toBe(4.85);
      expect(spaxx.annualIncome).toBeCloseTo((25000 * 4.85) / 100, 2);

      const cd = rows.find((r) => r.symbol === 'CITI-CD-1YR')!;
      expect(cd.marketValue).toBe(20000);
      expect(cd.apy).toBe(4.5);
      expect(cd.maturityDate).toBe('2027-10-01');
    });
  });

  describe('getOptionCollateralDrilldown', () => {
    it('separates CSP collateral and Covered Calls correctly', () => {
      const rows = getOptionCollateralDrilldown(samplePositions, sampleAccounts);
      expect(rows.length).toBe(2);

      const csp = rows.find((r) => r.right === 'PUT')!;
      expect(csp.underlying).toBe('AAPL');
      expect(csp.strike).toBe(180);
      expect(csp.contracts).toBe(1);
      expect(csp.collateralLocked).toBe(18000);

      const cc = rows.find((r) => r.right === 'CALL')!;
      expect(cc.underlying).toBe('NVDA');
      expect(cc.strike).toBe(130);
      expect(cc.contracts).toBe(1);
      expect(cc.collateralLocked).toBe(0); // CC locks shares, not cash collateral
    });
  });

  describe('getAssetAllocationDrilldown', () => {
    it('breaks down positions by asset category', () => {
      const rows = getAssetAllocationDrilldown(samplePositions, sampleAccounts);
      expect(rows.length).toBe(5); // NVDA x2, SPAXX, SWVXX, CITI-CD (options excluded from allocation)

      const stockRows = rows.filter((r) => r.assetClass === 'Stock');
      expect(stockRows.length).toBe(2);
      expect(stockRows.reduce((sum, r) => sum + r.marketValue, 0)).toBe(18000);
    });
  });

  describe('drilldownFormatters', () => {
    it('buildNetWorthDrillDown produces fully formatted modal model with summary cards', () => {
      const model = buildNetWorthDrillDown(sampleAccounts, samplePositions);
      expect(model.title).toBe('Total Net Worth Breakdown');
      expect(model.columns.length).toBeGreaterThan(5);
      expect(model.rows.length).toBe(3);
      expect(model.summaryCards.length).toBe(3);
      expect(model.summaryCards[0].label).toBe('Aggregated Net Worth');
    });

    it('buildFreeCashDrillDown produces formatted modal model with CSP reserve subtraction', () => {
      const model = buildFreeCashDrillDown(samplePositions, sampleAccounts);
      expect(model.title).toBe('Global Net Free Cash Breakdown');
      expect(model.rows.length).toBe(2);
      expect(model.summaryCards.find((c) => c.label === 'Locked CSP Collateral')?.value).toBe('-$18,000.00');
    });

    it('buildEquityDrillDown produces symbol-focused breakdown when targetSymbol specified', () => {
      const model = buildEquityDrillDown(samplePositions, sampleAccounts, 'NVDA');
      expect(model.title).toBe('NVDA Multi-Account Breakdown');
      expect(model.rows.length).toBe(2);
    });

    it('buildOptionCollateralDrillDown formats option positions with strike and contracts', () => {
      const model = buildOptionCollateralDrillDown(samplePositions, sampleAccounts);
      expect(model.title).toBe('Option Collateral Breakdown');
      expect(model.rows.length).toBe(2);
      expect(model.summaryCards.find((c) => c.label === 'Total Collateral Locked')?.value).toBe('$18,000.00');
    });
  });
});
