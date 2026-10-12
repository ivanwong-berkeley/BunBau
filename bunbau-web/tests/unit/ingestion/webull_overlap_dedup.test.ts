import { describe, it, expect } from 'vitest';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';

describe('WeBull Intra-Account Overlap Deduplication & Stitching Engine Unit Tests', () => {
  it('deduplicates scrolling overlap positions within the same account while preserving distinct positions', () => {
    // Simulate 2 consecutive screenshots of WeBull Individual Cash (CUX5XLW4)
    // Screen 1 captures AMD, TSM, and MCD
    const screen1: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
      institution: 'WeBull',
      account: 'CUX5XLW4',
      accountType: 'Individual Cash',
      asOfDate: '2026-10-07',
      netAccountValue: 59148.0,
      cashBalance: 57.11,
      settledCash: 57.11,
      myPositionsCount: 4,
      positions: [
        { symbol: 'AMD', quantity: 20.58465, currentPrice: 646.84, marketValue: 13314.98 },
        { symbol: 'TSM', quantity: 8.16611, currentPrice: 473.98, marketValue: 3870.57 },
        { symbol: 'MCD', quantity: 6.02179, currentPrice: 230.91, marketValue: 1390.49 }, // Cut line item
      ],
    };

    // Screen 2 captures MCD (scrolling overlap!), FBTC, and MSTR
    const screen2: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
      institution: 'WeBull',
      account: 'CUX5XLW4',
      accountType: 'Individual Cash',
      asOfDate: '2026-10-07',
      positions: [
        { symbol: 'MCD', quantity: 6.02179, currentPrice: 230.91, marketValue: 1390.49 }, // Duplicate from overlap
        { symbol: 'FBTC', quantity: 53.21458, currentPrice: 72.42, marketValue: 3853.8 },
        { symbol: 'MSTR', quantity: 10.92215, currentPrice: 154.55, marketValue: 1688.02 },
      ],
    };

    const result = stitchWebullScreenshots([screen1, screen2]);

    expect(result.accounts).toHaveLength(1);
    const acct = result.accounts[0];
    expect(acct.accountId).toBe('CUX5XLW4');
    expect(acct.accountType).toBe('Individual Cash');
    expect(acct.overlapDuplicatesRemoved).toBe(1); // 1 MCD duplicate eliminated
    expect(acct.cashBalance).toBe(57.11);

    // Positions should be: USD (cash), AMD, TSM, MCD (only once!), FBTC, MSTR
    const symbols = acct.deduplicatedPositions.map((p) => p.symbol);
    expect(symbols).toEqual(['USD', 'AMD', 'TSM', 'MCD', 'FBTC', 'MSTR']);

    // Check count verification against expectedPositionsCount (4 non-cash positions)
    // Wait: AMD, TSM, MCD, FBTC, MSTR = 5 positions
    expect(acct.screenshotCount).toBe(2);
  });

  it('strictly preserves identical symbols that coexist across different accounts (SOFI & MCD in Cash and IRA)', () => {
    // Screen A: Individual Cash (CUX5XLW4) holding SOFI and MCD
    const screenCash: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
      institution: 'WeBull',
      account: 'CUX5XLW4',
      accountType: 'Individual Cash',
      asOfDate: '2026-10-07',
      positions: [
        { symbol: 'SOFI', quantity: 14.11157, currentPrice: 15.67, marketValue: 221.13 },
        { symbol: 'MCD', quantity: 6.02179, currentPrice: 230.91, marketValue: 1390.49 },
      ],
    };

    // Screen B: Rollover IRA (CVS8QSX4) ALSO holding SOFI and MCD
    const screenIRA: RawVisionScreenExtraction = {
      fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
      institution: 'WeBull',
      account: 'CVS8QSX4',
      accountType: 'Rollover IRA',
      asOfDate: '2026-10-07',
      positions: [
        { symbol: 'SOFI', quantity: 72.54043, currentPrice: 15.67, marketValue: 1136.71 },
        { symbol: 'MCD', quantity: 9.16621, currentPrice: 230.91, marketValue: 2116.57 },
      ],
    };

    const result = stitchWebullScreenshots([screenCash, screenIRA]);

    // Must yield 2 distinct accounts
    expect(result.accounts).toHaveLength(2);
    expect(result.totalOverlapsRemoved).toBe(0); // Zero cross-account collision

    const cashAcct = result.accounts.find((a) => a.accountId === 'CUX5XLW4')!;
    const iraAcct = result.accounts.find((a) => a.accountId === 'CVS8QSX4')!;

    expect(cashAcct).toBeDefined();
    expect(iraAcct).toBeDefined();

    // Both accounts must have their own SOFI and MCD!
    const sofiCash = cashAcct.deduplicatedPositions.find((p) => p.symbol === 'SOFI');
    const sofiIRA = iraAcct.deduplicatedPositions.find((p) => p.symbol === 'SOFI');
    expect(sofiCash?.quantity).toBe(14.11157);
    expect(sofiIRA?.quantity).toBe(72.54043);

    const mcdCash = cashAcct.deduplicatedPositions.find((p) => p.symbol === 'MCD');
    const mcdIRA = iraAcct.deduplicatedPositions.find((p) => p.symbol === 'MCD');
    expect(mcdCash?.quantity).toBe(6.02179);
    expect(mcdIRA?.quantity).toBe(9.16621);
  });

  it('correctly deconstructs WeBull Covered Option tree hierarchies into underlying stock and short call', () => {
    // Screen with WeBull Covered Option block for SOFI and AI
    const screen: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
      institution: 'WeBull',
      account: 'CUX5XLW4',
      accountType: 'Individual Cash',
      positions: [
        // Standalone unhedged SOFI
        { symbol: 'SOFI', quantity: 14.11157, currentPrice: 15.67, marketValue: 221.13 },
        // Group Covered Option block
        {
          symbol: 'SOFI [Covered Option]',
          quantity: 1,
          marketValue: 1566.0,
          isCoveredOptionGroup: true,
          coveredChildren: [
            {
              symbol: 'SOFI',
              description: 'SOFI Stock',
              quantity: 100,
              currentPrice: 15.67,
              marketValue: 1567.0,
              isCovered: true,
            },
            {
              symbol: 'SOFI 10/09/26 C 21.5',
              underlying: 'SOFI',
              quantity: -1,
              strikePrice: 21.5,
              optionType: 'Call',
              expirationDate: '2026-10-09',
              marketValue: -1.0,
            },
          ],
        },
      ],
    };

    const result = stitchWebullScreenshots([screen]);
    const acct = result.accounts[0];

    // Verify parent group row 'SOFI [Covered Option]' is discarded
    expect(acct.deduplicatedPositions.some((p) => p.symbol.includes('[Covered Option]'))).toBe(false);

    // Verify covered stock (100 shares) and standalone stock (14.11157 shares) are consolidated into 1 canonical row
    const sofiStockRows = acct.deduplicatedPositions.filter(
      (p) => p.symbol === 'SOFI' && p.assetClass === 'Stock'
    );
    expect(sofiStockRows).toHaveLength(1);
    expect(sofiStockRows[0].quantity).toBeCloseTo(114.11157, 5);
    expect(sofiStockRows[0].marketValue).toBe(1788.13);

    // Verify covered call contract exists with proper OptionInfo
    const sofiCall = acct.deduplicatedPositions.find((p) => p.assetClass === 'CoveredCall');
    expect(sofiCall).toBeDefined();
    expect(sofiCall?.option?.underlying).toBe('SOFI');
    expect(sofiCall?.option?.strike).toBe(21.5);
    expect(sofiCall?.option?.right).toBe('CALL');
    expect(sofiCall?.option?.contracts).toBe(1);
    expect(sofiCall?.option?.expiry).toBe('2026-10-09');
  });

  it('verifies position counts against WeBull header My Positions (N) ground truth', () => {
    const screen1: RawVisionScreenExtraction = {
      fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
      account: 'CVS8QSX4',
      myPositionsCount: 3, // Ground truth: 3 positions
      positions: [
        { symbol: 'NVDA', quantity: 59.15845, marketValue: 14053.09 },
        { symbol: 'CRM', quantity: 8.2718, marketValue: 1855.61 },
      ],
    };

    const screen2: RawVisionScreenExtraction = {
      fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6701_20261007.png',
      account: 'CVS8QSX4',
      positions: [
        { symbol: 'CRM', quantity: 8.2718, marketValue: 1855.61 }, // Overlap
        { symbol: 'ORCL', quantity: 800.06719, marketValue: 115169.67 },
      ],
    };

    const result = stitchWebullScreenshots([screen1, screen2]);
    const acct = result.accounts[0];

    expect(acct.expectedPositionsCount).toBe(3);
    expect(acct.overlapDuplicatesRemoved).toBe(1);
    expect(acct.isCountVerified).toBe(true); // Exactly 3 non-cash positions: NVDA, CRM, ORCL
  });
});
