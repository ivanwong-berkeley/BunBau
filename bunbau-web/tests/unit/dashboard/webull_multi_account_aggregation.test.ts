import { describe, it, expect } from 'vitest';
import {
  getEquityDrilldown,
  getNetWorthDrilldown,
  getFreeCashDrilldown,
  getOptionCollateralDrilldown,
} from '../../../src/lib/portfolio/drilldownSelectors';
import { CanonicalPosition, CanonicalAccount } from '../../../src/lib/portfolio/types';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';

describe('WeBull Multi-Account Portfolio Aggregation & Symbol Coexistence', () => {
  const webullAccounts: CanonicalAccount[] = [
    {
      id: 'webull_cux5xlw4',
      institution: 'WeBull',
      accountType: 'Individual Cash',
      accountMasked: '...XLW4',
      positionsCount: 21,
      totalValue: 59148.0,
    },
    {
      id: 'webull_cvs8qsx4',
      institution: 'WeBull',
      accountType: 'Rollover IRA',
      accountMasked: '...QSX4',
      positionsCount: 26,
      totalValue: 219702.33,
    },
  ];

  const webullPositions: CanonicalPosition[] = [
    // --- Account 1: Individual Cash (CUX5XLW4) ---
    {
      id: 'p_cash_usd',
      symbol: 'USD',
      description: 'US Dollar (Cash)',
      assetClass: 'Cash',
      quantity: 57.11,
      marketValue: 57.11,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_amd',
      symbol: 'AMD',
      description: 'ADVANCED MICRO DEVICES',
      assetClass: 'Stock',
      quantity: 20.58465,
      marketValue: 13314.98,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_tsm',
      symbol: 'TSM',
      description: 'TAIWAN SEMICONDUCTOR',
      assetClass: 'Stock',
      quantity: 8.16611,
      marketValue: 3870.57,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_sofi_unhedged',
      symbol: 'SOFI',
      description: 'SOFI TECHNOLOGIES INC',
      assetClass: 'Stock',
      quantity: 14.11157,
      marketValue: 220.85,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_sofi_covered',
      symbol: 'SOFI',
      description: 'SOFI TECHNOLOGIES INC (COLLATERAL)',
      assetClass: 'Stock',
      quantity: 100,
      marketValue: 1567.0,
      isCovered: true,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_sofi_call',
      symbol: 'SOFI 21.5 C',
      description: 'SOFI 21.5 Call',
      assetClass: 'CoveredCall',
      quantity: -1,
      marketValue: -1.0,
      option: {
        underlying: 'SOFI',
        strike: 21.5,
        right: 'CALL',
        contracts: 1,
        expiry: '2026-10-09',
      },
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },
    {
      id: 'p_cash_mcd',
      symbol: 'MCD',
      description: "MCDONALD'S CORP",
      assetClass: 'Stock',
      quantity: 6.02179,
      marketValue: 1800.0,
      institution: 'WeBull',
      accountId: 'webull_cux5xlw4',
    },

    // --- Account 2: Rollover IRA (CVS8QSX4) ---
    {
      id: 'p_ira_usd',
      symbol: 'USD',
      description: 'US Dollar (Cash)',
      assetClass: 'Cash',
      quantity: 11.78,
      marketValue: 11.78,
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
    {
      id: 'p_ira_nvda',
      symbol: 'NVDA',
      description: 'NVIDIA CORP',
      assetClass: 'Stock',
      quantity: 59.15845,
      marketValue: 14053.09,
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
    {
      id: 'p_ira_sofi',
      symbol: 'SOFI',
      description: 'SOFI TECHNOLOGIES INC',
      assetClass: 'Stock',
      quantity: 72.54043,
      marketValue: 1135.26,
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
    {
      id: 'p_ira_mcd',
      symbol: 'MCD',
      description: "MCDONALD'S CORP",
      assetClass: 'Stock',
      quantity: 9.16621,
      marketValue: 2740.7,
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
    {
      id: 'p_ira_ai_covered',
      symbol: 'AI',
      description: 'C3.AI INC (COLLATERAL)',
      assetClass: 'Stock',
      quantity: 1000,
      marketValue: 13000.0,
      isCovered: true,
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
    {
      id: 'p_ira_ai_call',
      symbol: 'AI 13 C',
      description: 'C3.AI 13 Call',
      assetClass: 'CoveredCall',
      quantity: -10,
      marketValue: -150.0,
      option: {
        underlying: 'AI',
        strike: 13,
        right: 'CALL',
        contracts: 10,
        expiry: '2026-10-16',
      },
      institution: 'WeBull',
      accountId: 'webull_cvs8qsx4',
    },
  ];

  it('aggregates portfolio net worth accurately across both WeBull accounts', () => {
    const drilldownRows = getNetWorthDrilldown(webullAccounts, webullPositions);
    expect(drilldownRows).toHaveLength(2);

    const cashAcct = drilldownRows.find((b) => b.accountId === 'webull_cux5xlw4')!;
    const iraAcct = drilldownRows.find((b) => b.accountId === 'webull_cvs8qsx4')!;
    expect(cashAcct).toBeDefined();
    expect(iraAcct).toBeDefined();

    expect(cashAcct.accountType).toBe('Individual Cash');
    expect(iraAcct.accountType).toBe('Rollover IRA');

    const totalPortfolioNW = drilldownRows.reduce((acc, r) => acc + r.totalNetWorth, 0);
    expect(totalPortfolioNW).toBeGreaterThan(0);
    expect(cashAcct.percentOfPortfolio + iraAcct.percentOfPortfolio).toBeCloseTo(100, 1);
  });

  it('correctly aggregates multi-account coexistence for SOFI without dropping either account', () => {
    const sofiRows = getEquityDrilldown(webullPositions, webullAccounts, 'SOFI');
    // 3 position rows: 2 in Cash (14.11157 unhedged + 100 covered collateral) and 1 in IRA (72.54043)
    expect(sofiRows.length).toBe(3);

    const cashRows = sofiRows.filter((b) => b.accountId === 'webull_cux5xlw4');
    const iraRow = sofiRows.find((b) => b.accountId === 'webull_cvs8qsx4');

    expect(cashRows).toHaveLength(2);
    expect(iraRow).toBeDefined();

    const cashQtys = cashRows.map((r) => r.quantity).sort((a, b) => a - b);
    expect(cashQtys[0]).toBeCloseTo(14.11157, 4);
    expect(cashQtys[1]).toBe(100);
    expect(iraRow?.quantity).toBeCloseTo(72.54043, 4);

    const totalCashSofi = cashRows.reduce((sum, r) => sum + r.quantity, 0);
    expect(totalCashSofi).toBeCloseTo(114.11157, 4);

    const totalSofiQty = sofiRows.reduce((sum, r) => sum + r.quantity, 0);
    expect(totalSofiQty).toBeCloseTo(186.652, 3);

    expect(cashRows[0].accountType).toBe('Individual Cash');
    expect(iraRow?.accountType).toBe('Rollover IRA');
  });

  it('correctly aggregates multi-account coexistence for MCD across both accounts', () => {
    const mcdRows = getEquityDrilldown(webullPositions, webullAccounts, 'MCD');
    expect(mcdRows.length).toBe(2);

    const cashEntry = mcdRows.find((b) => b.accountId === 'webull_cux5xlw4');
    const iraEntry = mcdRows.find((b) => b.accountId === 'webull_cvs8qsx4');

    expect(cashEntry?.quantity).toBeCloseTo(6.02179, 4);
    expect(iraEntry?.quantity).toBeCloseTo(9.16621, 4);

    const totalMcdQty = mcdRows.reduce((sum, r) => sum + r.quantity, 0);
    expect(totalMcdQty).toBeCloseTo(15.188, 3);
  });

  it('preserves single-account stock drilldowns like AMD and NVDA', () => {
    const amdRows = getEquityDrilldown(webullPositions, webullAccounts, 'AMD');
    expect(amdRows).toHaveLength(1);
    expect(amdRows[0].accountId).toBe('webull_cux5xlw4');
    expect(amdRows[0].accountType).toBe('Individual Cash');

    const nvdaRows = getEquityDrilldown(webullPositions, webullAccounts, 'NVDA');
    expect(nvdaRows).toHaveLength(1);
    expect(nvdaRows[0].accountId).toBe('webull_cvs8qsx4');
    expect(nvdaRows[0].accountType).toBe('Rollover IRA');
  });

  it('verifies end-to-end stitching and deduplication with WeBull standardized filenames', () => {
    const rawExtractions: RawVisionScreenExtraction[] = [
      // Screen 1: Top overview Individual Cash
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
        netAccountValue: 59148.0,
        cashBalance: 57.11,
        settledCash: 57.11,
        myPositionsCount: 3,
        positions: [
          { symbol: 'AMD', quantity: 20.58465, marketValue: 13314.98, assetClass: 'Stock' },
          { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' },
        ],
      },
      // Screen 2: Scrolled Individual Cash with overlap (TSM)
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
        positions: [
          { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' }, // overlap
          { symbol: 'MCD', quantity: 6.02179, marketValue: 1800.0, assetClass: 'Stock' },
        ],
      },
      // Screen 3: Top overview Rollover IRA
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
        netAccountValue: 219702.33,
        cashBalance: 11.78,
        settledCash: 11.78,
        myPositionsCount: 2,
        positions: [
          { symbol: 'NVDA', quantity: 59.15845, marketValue: 14053.09, assetClass: 'Stock' },
          { symbol: 'MCD', quantity: 9.16621, marketValue: 2740.7, assetClass: 'Stock' }, // Coexists with Cash MCD!
        ],
      },
    ];

    const result = stitchWebullScreenshots(rawExtractions);

    expect(result.accounts).toHaveLength(2);
    expect(result.totalOverlapsRemoved).toBe(1); // Exactly 1 TSM duplicate removed

    const cashAcct = result.accounts.find((a) => a.accountId === 'CUX5XLW4')!;
    const iraAcct = result.accounts.find((a) => a.accountId === 'CVS8QSX4')!;

    expect(cashAcct).toBeDefined();
    expect(iraAcct).toBeDefined();

    // In Cash: 1 Cash USD position + 3 non-cash positions (AMD, TSM, MCD) = 4 total
    expect(cashAcct.deduplicatedPositions).toHaveLength(4);
    const nonCashPositions = cashAcct.deduplicatedPositions.filter((p) => p.assetClass !== 'Cash');
    expect(nonCashPositions).toHaveLength(3);
    expect(cashAcct.isCountVerified).toBe(true);

    // In IRA: 1 Cash USD position + 2 non-cash positions (NVDA, MCD) = 3 total
    expect(iraAcct.deduplicatedPositions).toHaveLength(3);
    const nonCashIra = iraAcct.deduplicatedPositions.filter((p) => p.assetClass !== 'Cash');
    expect(nonCashIra).toHaveLength(2);
    expect(iraAcct.isCountVerified).toBe(true);

    // Both MCDs coexist without colliding
    const cashMcd = cashAcct.deduplicatedPositions.find((p) => p.symbol === 'MCD')!;
    const iraMcd = iraAcct.deduplicatedPositions.find((p) => p.symbol === 'MCD')!;
    expect(cashMcd.quantity).toBeCloseTo(6.02179, 4);
    expect(iraMcd.quantity).toBeCloseTo(9.16621, 4);
  });
});
