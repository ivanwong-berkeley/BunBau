import { describe, it, expect } from 'vitest';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';
import { getEquityDrilldown } from '../../../src/lib/portfolio/drilldownSelectors';
import { buildEquityDrillDown } from '../../../src/lib/portfolio/drilldownFormatters';
import { equitiesBySymbol } from '../../../src/lib/portfolio/selectors';
import { CanonicalPosition, CanonicalAccount } from '../../../src/lib/portfolio/types';

describe('WeBull Covered Options Hierarchy & Intra-Account Stock Consolidation', () => {
  it('supersedes truncated/cut-off option row with complete option row from subsequent screen', () => {
    const screens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        netAccountValue: 59148.0,
        cashBalance: 57.11,
        positions: [
          // Edge cut-off row at bottom of Screen 3: Last price 0.01 read as marketValue, no strike/expiry
          {
            symbol: 'SOFI',
            category: 'Option',
            marketValue: -0.01,
            quantity: -1,
          },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          // Full option row from Screen 4: full contract, strike 21.5, call, expiry 2026-10-09, mkt value -$1.00
          {
            symbol: 'SOFI 21.5 Call',
            category: 'CoveredCall',
            marketValue: -1.0,
            quantity: -1,
            currentPrice: 0.01,
            optionDetails: {
              underlying: 'SOFI',
              strike: 21.5,
              right: 'CALL',
              expiry: '2026-10-09',
              contracts: 1,
            },
          },
        ],
      },
    ];

    const stitched = stitchWebullScreenshots(screens);
    expect(stitched.accounts).toHaveLength(1);
    const acc = stitched.accounts[0];

    const options = acc.deduplicatedPositions.filter(
      (p) => p.assetClass === 'CoveredCall' || p.assetClass === 'CSP' || p.assetClass === 'Option' || !!p.option
    );

    // Exactly 1 option must remain: the complete one supersedes the -$0.01 phantom cut-off
    expect(options).toHaveLength(1);
    expect(options[0].marketValue).toBe(-1.0);
    expect(options[0].option?.strike).toBe(21.5);
    expect(options[0].option?.right).toBe('CALL');
    expect(options[0].option?.expiry).toBe('2026-10-09');
  });

  it('consolidates unhedged shares and collateral shares into a single canonical stock row while eliminating scrolling duplicates', () => {
    const screens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        netAccountValue: 59148.0,
        positions: [
          // 14.11157 unhedged shares
          {
            symbol: 'SOFI',
            category: 'Stock',
            marketValue: 221.13,
            quantity: 14.11157,
            currentPrice: 15.67,
          },
          // 100 collateral shares backing Covered Call
          {
            symbol: 'SOFI Stock',
            category: 'Stock',
            marketValue: 1567.0,
            quantity: 100,
            currentPrice: 15.67,
          },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          // Scrolling duplicate of the 100 collateral shares
          {
            symbol: 'SOFI Stock',
            category: 'Stock',
            marketValue: 1567.0,
            quantity: 100,
            currentPrice: 15.67,
          },
          // Short covered call option
          {
            symbol: 'SOFI 21.5 Call',
            category: 'CoveredCall',
            marketValue: -1.0,
            quantity: -1,
            optionDetails: {
              underlying: 'SOFI',
              strike: 21.5,
              right: 'CALL',
              expiry: '2026-10-09',
              contracts: 1,
            },
          },
        ],
      },
    ];

    const stitched = stitchWebullScreenshots(screens);
    const acc = stitched.accounts[0];

    const sofiStock = acc.deduplicatedPositions.filter((p) => p.symbol === 'SOFI' && p.assetClass === 'Stock');

    // Must be exactly 1 consolidated SOFI position
    expect(sofiStock).toHaveLength(1);
    expect(sofiStock[0].quantity).toBeCloseTo(114.11157, 5);
    expect(sofiStock[0].marketValue).toBe(1788.13); // 221.13 + 1567.00
  });

  it('preserves multi-account separation for SOFI across Individual Cash and Rollover IRA', () => {
    const screens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          { symbol: 'SOFI', category: 'Stock', marketValue: 221.13, quantity: 14.11157 },
          { symbol: 'SOFI Stock', category: 'Stock', marketValue: 1567.0, quantity: 100 },
          {
            symbol: 'SOFI 21.5 Call',
            category: 'CoveredCall',
            marketValue: -1.0,
            quantity: -1,
            optionDetails: { underlying: 'SOFI', strike: 21.5, right: 'CALL', expiry: '2026-10-09', contracts: 1 },
          },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6702_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        positions: [
          { symbol: 'SOFI', category: 'Stock', marketValue: 1567.0, quantity: 100 },
        ],
      },
    ];

    const stitched = stitchWebullScreenshots(screens);
    expect(stitched.accounts).toHaveLength(2);

    const indAcc = stitched.accounts.find(
      (a) => a.accountMasked.includes('XLW4') || a.accountId.includes('CUX5XLW4')
    )!;
    const iraAcc = stitched.accounts.find(
      (a) => a.accountMasked.includes('QSX4') || a.accountId.includes('CVS8QSX4')
    )!;

    const indSofi = indAcc.deduplicatedPositions.filter(
      (p) => p.symbol === 'SOFI' || p.option?.underlying === 'SOFI'
    );
    const iraSofi = iraAcc.deduplicatedPositions.filter(
      (p) => p.symbol === 'SOFI' || p.option?.underlying === 'SOFI'
    );

    expect(indSofi).toHaveLength(2); // 1 consolidated Stock + 1 CoveredCall
    expect(indSofi.find((p) => p.assetClass === 'Stock')?.quantity).toBeCloseTo(114.11157, 5);
    expect(indSofi.find((p) => p.assetClass === 'CoveredCall')?.marketValue).toBe(-1.0);
    expect(iraSofi).toHaveLength(1); // 1 Stock (100 shares)
    expect(iraSofi[0].quantity).toBe(100);
  });

  it('correctly calculates share-precision CC status (Partial vs Available) in Equity Drilldown', () => {
    const accounts: CanonicalAccount[] = [
      {
        id: 'acc_ind',
        institution: 'WeBull',
        accountType: 'Individual Cash',
        maskedAccount: '***-XLW4',
        positions: [],
      },
      {
        id: 'acc_ira',
        institution: 'WeBull',
        accountType: 'Rollover IRA',
        maskedAccount: '***-QSX4',
        positions: [],
      },
    ];

    const positions: CanonicalPosition[] = [
      // Individual Cash: 114.11157 shares
      {
        id: 'pos_sofi_ind',
        institution: 'WeBull',
        accountId: 'acc_ind',
        symbol: 'SOFI',
        assetClass: 'Stock',
        quantity: 114.11157,
        marketValue: 1788.13,
      },
      // Individual Cash: 1 Covered Call (-1 contract = 100 shares locked)
      {
        id: 'pos_cc_ind',
        institution: 'WeBull',
        accountId: 'acc_ind',
        symbol: 'SOFI 21.5 Call',
        assetClass: 'CoveredCall',
        quantity: -1,
        marketValue: -1.0,
        option: {
          underlying: 'SOFI',
          strike: 21.5,
          right: 'CALL',
          expiry: '2026-10-09',
          contracts: 1,
        },
      },
      // Rollover IRA: 100 shares (no CC)
      {
        id: 'pos_sofi_ira',
        institution: 'WeBull',
        accountId: 'acc_ira',
        symbol: 'SOFI',
        assetClass: 'Stock',
        quantity: 100,
        marketValue: 1567.0,
      },
    ];

    const drilldown = getEquityDrilldown(positions, accounts, 'SOFI');
    expect(drilldown).toHaveLength(2);

    const indRow = drilldown.find((r) => r.accountId === 'acc_ind')!;
    const iraRow = drilldown.find((r) => r.accountId === 'acc_ira')!;

    // Individual Cash: partially covered (100 locked, 14.11157 free)
    expect(indRow.isCovered).toBe(false);
    expect(indRow.isPartial).toBe(true);
    expect(indRow.coveredShares).toBe(100);
    expect(indRow.availableShares).toBeCloseTo(14.11157, 5);

    // Rollover IRA: fully available (0 locked, 100 free)
    expect(iraRow.isCovered).toBe(false);
    expect(iraRow.isPartial).toBe(false);
    expect(iraRow.coveredShares).toBe(0);
    expect(iraRow.availableShares).toBe(100);

    // Formatter summary cards: Holding Accounts must be exactly 2
    const config = buildEquityDrillDown(positions, accounts, 'SOFI');
    const holdingAccountsCard = config.summaryCards.find((c) => c.label === 'Holding Accounts');
    expect(holdingAccountsCard?.value).toBe('2');

    // Individual Cash raw value should be Partial
    const indFormattedRow = config.rows.find((r) => r.rawValues.accountMasked === '***-XLW4');
    expect(indFormattedRow?.rawValues.isCovered).toBe('Partial');
  });

  it('aggregates equities in equitiesBySymbol with isPartialCovered and accurate available shares', () => {
    const positions: CanonicalPosition[] = [
      {
        id: 'pos_sofi_ind',
        institution: 'WeBull',
        accountId: 'acc_ind',
        symbol: 'SOFI',
        assetClass: 'Stock',
        quantity: 114.11157,
        marketValue: 1788.13,
      },
      {
        id: 'pos_cc_ind',
        institution: 'WeBull',
        accountId: 'acc_ind',
        symbol: 'SOFI 21.5 Call',
        assetClass: 'CoveredCall',
        quantity: -1,
        marketValue: -1.0,
        option: {
          underlying: 'SOFI',
          strike: 21.5,
          right: 'CALL',
          expiry: '2026-10-09',
          contracts: 1,
        },
      },
      {
        id: 'pos_sofi_ira',
        institution: 'WeBull',
        accountId: 'acc_ira',
        symbol: 'SOFI',
        assetClass: 'Stock',
        quantity: 100,
        marketValue: 1567.0,
      },
    ];

    const equities = equitiesBySymbol(positions);
    const sofi = equities.find((e) => e.symbol === 'SOFI');

    expect(sofi).toBeDefined();
    expect(sofi!.quantity).toBeCloseTo(214.11157, 5);
    expect(sofi!.coveredShares).toBe(100);
    expect(sofi!.availableShares).toBeCloseTo(114.11157, 5);
    expect(sofi!.covered).toBe(false);
    expect(sofi!.isPartialCovered).toBe(true);
  });
});
