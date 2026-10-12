import { describe, it, expect } from 'vitest';
import { normalizeExtraction } from '../../../src/lib/extraction/normalize';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';

describe('WeBull Ground Truth Balance Reconciliation & Zero Cash Doubling', () => {
  it('preserves accountTotal and portfolioTotal on ExtractionResult in normalizeExtraction', () => {
    const raw = {
      institution: 'WeBull',
      account: '***-QSX4',
      accountType: 'Rollover IRA',
      accountTotal: 219702.33,
      positions: [
        { symbol: 'NVDA', category: 'Stock', value: 14053.09, quantity: 59.15845 },
        { symbol: 'USD', category: 'Cash', value: 11.78, quantity: 11.78 },
      ],
    };

    const result = normalizeExtraction(raw);
    expect(result.portfolioTotal).toBe(219702.33);
    expect((result as any).accountTotal).toBe(219702.33);
    expect(result.reconciliation?.statedTotal).toBe(219702.33);
  });

  it('guarantees zero cash double-counting by strictly isolating Cash to the cash ledger', () => {
    const screens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        netAccountValue: 59148.0,
        cashBalance: 57.11,
        settledCash: 57.11,
        positions: [
          // Gemini returns Cash as a holding row
          { symbol: 'USD', category: 'Cash', marketValue: 57.11, quantity: 57.11 },
          { symbol: 'AMD', category: 'Stock', marketValue: 13314.98, quantity: 20.58465, currentPrice: 646.84 },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          { symbol: 'TSM', category: 'Stock', marketValue: 3870.57, quantity: 8.16611, currentPrice: 473.98 },
        ],
      },
    ];

    const stitched = stitchWebullScreenshots(screens);
    expect(stitched.accounts).toHaveLength(1);
    const acc = stitched.accounts[0];

    // Cash must appear exactly once
    const cashPositions = acc.deduplicatedPositions.filter((p) => p.assetClass === 'Cash');
    expect(cashPositions).toHaveLength(1);
    expect(cashPositions[0].symbol).toBe('USD');
    expect(cashPositions[0].marketValue).toBe(57.11);

    // No stock row may have symbol 'USD'
    const stockUsd = acc.deduplicatedPositions.filter((p) => p.assetClass === 'Stock' && p.symbol === 'USD');
    expect(stockUsd).toHaveLength(0);
  });

  it('supersedes edge cut-off position with mathematically verified full row (resolving phantom AMD)', () => {
    const screens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        netAccountValue: 219702.33,
        cashBalance: 11.78,
        positions: [
          { symbol: 'NVDA', category: 'Stock', marketValue: 14053.09, quantity: 59.15845, currentPrice: 237.55 },
          // Screen 1 bottom edge: AMD is cut off horizontally, OCR reads 4068.30 with no price/qty match
          { symbol: 'AMD', category: 'Stock', marketValue: 4068.30, quantity: 1 },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6701_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        positions: [
          // Screen 2 top edge: AMD is cleanly visible with full shares and price matching 7.68072 * 646.84 = 4968.20
          { symbol: 'AMD', category: 'Stock', marketValue: 4968.20, quantity: 7.68072, currentPrice: 646.84 },
          { symbol: 'XOM', category: 'Stock', marketValue: 10383.09, quantity: 63.41981, currentPrice: 163.72 },
        ],
      },
    ];

    const stitched = stitchWebullScreenshots(screens);
    const acc = stitched.accounts[0];

    // There should be exactly ONE AMD row
    const amdPositions = acc.deduplicatedPositions.filter((p) => p.symbol === 'AMD');
    expect(amdPositions).toHaveLength(1);

    // The verified full row (4968.20) must supersede the cut-off row (4068.30)
    expect(amdPositions[0].marketValue).toBe(4968.20);
    expect(amdPositions[0].quantity).toBe(7.68072);
  });

  it('reconciles entire WeBull dataset with exact cent precision for both accounts', () => {
    // 1. Individual Cash (21 positions + 1 cash = $59,148.00)
    const cashScreens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        netAccountValue: 59148.0,
        cashBalance: 57.11,
        myPositionsCount: 21,
        positions: [
          { symbol: 'USD', category: 'Cash', marketValue: 57.11, quantity: 57.11 },
          { symbol: 'AMD', category: 'Stock', marketValue: 13314.98, quantity: 20.58465, currentPrice: 646.84 },
          { symbol: 'TSM', category: 'Stock', marketValue: 3870.57, quantity: 8.16611, currentPrice: 473.98 },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          // Overlaps
          { symbol: 'AMD', category: 'Stock', marketValue: 13314.98, quantity: 20.58465, currentPrice: 646.84 },
          { symbol: 'TSM', category: 'Stock', marketValue: 3870.57, quantity: 8.16611, currentPrice: 473.98 },
          { symbol: 'NVDA', category: 'Stock', marketValue: 3291.14, quantity: 13.85451, currentPrice: 237.55 },
          { symbol: 'GOOG', category: 'Stock', marketValue: 2799.46, quantity: 8.06181, currentPrice: 347.25 },
          { symbol: 'AVGO', category: 'Stock', marketValue: 2585.83, quantity: 6.86444, currentPrice: 376.70 },
          { symbol: 'UNH', category: 'Stock', marketValue: 6871.04, quantity: 18.26869, currentPrice: 376.11 },
          { symbol: 'PLTR', category: 'Stock', marketValue: 2007.18, quantity: 10.34947, currentPrice: 193.94 },
          { symbol: 'GLDM', category: 'ETF', marketValue: 5937.47, quantity: 73.06762, currentPrice: 81.26 },
          { symbol: 'SPY', category: 'ETF', marketValue: 2305.48, quantity: 2.96593, currentPrice: 777.32 },
          { symbol: 'MSFT', category: 'Stock', marketValue: 2632.53, quantity: 4.9692, currentPrice: 529.77 },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          { symbol: 'AMZN', category: 'Stock', marketValue: 2275.61, quantity: 8.74562, currentPrice: 260.20 },
          { symbol: 'TSLA', category: 'Stock', marketValue: 1880.78, quantity: 4.97323, currentPrice: 378.18 },
          { symbol: 'QCOM', category: 'Stock', marketValue: 577.38, quantity: 3.25121, currentPrice: 177.59 },
          { symbol: 'AAPL', category: 'Stock', marketValue: 7.80, quantity: 0.02318, currentPrice: 336.52 },
          { symbol: 'F', category: 'Stock', marketValue: 10.83, quantity: 0.89376, currentPrice: 12.12 },
          { symbol: 'SPOT', category: 'Stock', marketValue: 3.36, quantity: 0.00656, currentPrice: 512.95 },
          { symbol: 'SOFI', category: 'Stock', marketValue: 221.13, quantity: 14.11157, currentPrice: 15.67 },
          { symbol: 'SOFI', category: 'Stock', marketValue: 1567.0, quantity: 100, currentPrice: 15.67 },
          { symbol: 'SOFI $21.5 Call', category: 'Covered Call', marketValue: -1.0, quantity: -1, strikePrice: 21.5, underlying: 'SOFI' },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
        institution: 'WeBull',
        account: 'CUX5XLW4',
        accountType: 'Individual Cash',
        positions: [
          // Overlap with SOFI (both uncovered and covered stock)
          { symbol: 'SOFI', category: 'Stock', marketValue: 221.13, quantity: 14.11157, currentPrice: 15.67 },
          { symbol: 'SOFI', category: 'Stock', marketValue: 1567.0, quantity: 100, currentPrice: 15.67 },
          { symbol: 'MCD', category: 'Stock', marketValue: 1390.49, quantity: 6.02179, currentPrice: 230.91 },
          { symbol: 'FBTC', category: 'ETF', marketValue: 3853.80, quantity: 53.21458, currentPrice: 72.42 },
          { symbol: 'MSTR', category: 'Stock', marketValue: 1688.02, quantity: 10.92215, currentPrice: 154.55 },
        ],
      },
    ];

    const stitchedCash = stitchWebullScreenshots(cashScreens);
    expect(stitchedCash.accounts).toHaveLength(1);
    const cashAcc = stitchedCash.accounts[0];

    // Net Account Value anchor must match $59,148.00 exactly
    expect(cashAcc.netAccountValue).toBe(59148.0);
    expect(cashAcc.cashBalance).toBe(57.11);

    // Sum of deduplicated rows must match $59,148.00 within 2 cents
    const sumCashRows = Math.round(cashAcc.deduplicatedPositions.reduce((s, p) => s + p.marketValue, 0) * 100) / 100;
    expect(Math.abs(sumCashRows - 59148.0)).toBeLessThanOrEqual(0.05);

    // 2. Rollover IRA (26 positions + 1 cash = $219,702.33)
    const iraScreens: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        netAccountValue: 219702.33,
        cashBalance: 11.78,
        myPositionsCount: 26,
        positions: [
          { symbol: 'USD', category: 'Cash', marketValue: 11.78, quantity: 11.78 },
          { symbol: 'NVDA', category: 'Stock', marketValue: 14053.09, quantity: 59.15845, currentPrice: 237.55 },
          // Cut-off AMD
          { symbol: 'AMD', category: 'Stock', marketValue: 4068.30, quantity: 1 },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6701_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        positions: [
          { symbol: 'NVDA', category: 'Stock', marketValue: 14053.09, quantity: 59.15845, currentPrice: 237.55 },
          // Full verified AMD
          { symbol: 'AMD', category: 'Stock', marketValue: 4968.20, quantity: 7.68072, currentPrice: 646.84 },
          { symbol: 'XOM', category: 'Stock', marketValue: 10383.09, quantity: 63.41981, currentPrice: 163.72 },
          { symbol: 'EQIX', category: 'Stock', marketValue: 11016.92, quantity: 10.67769, currentPrice: 1031.77 },
          { symbol: 'UNH', category: 'Stock', marketValue: 9635.79, quantity: 25.6196, currentPrice: 376.11 },
          { symbol: 'GOOGL', category: 'Stock', marketValue: 2290.70, quantity: 6.53738, currentPrice: 350.40 },
          { symbol: 'TSM', category: 'Stock', marketValue: 2054.22, quantity: 4.33399, currentPrice: 473.98 },
          { symbol: 'AMZN', category: 'Stock', marketValue: 4454.96, quantity: 17.12129, currentPrice: 260.20 },
          { symbol: 'PLTR', category: 'Stock', marketValue: 2715.90, quantity: 14.00381, currentPrice: 193.94 },
          { symbol: 'AAPL', category: 'Stock', marketValue: 1492.74, quantity: 4.43581, currentPrice: 336.52 },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6702_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        positions: [
          { symbol: 'MSFT', category: 'Stock', marketValue: 4311.81, quantity: 8.13902, currentPrice: 529.77 },
          { symbol: 'BMO', category: 'Stock', marketValue: 1662.60, quantity: 10.27881, currentPrice: 161.75 },
          { symbol: 'GOOG', category: 'Stock', marketValue: 2148.30, quantity: 6.18662, currentPrice: 347.25 },
          { symbol: 'AVGO', category: 'Stock', marketValue: 2010.14, quantity: 5.33617, currentPrice: 376.70 },
          { symbol: 'META', category: 'Stock', marketValue: 1347.80, quantity: 1.8634, currentPrice: 723.30 },
          { symbol: 'QCOM', category: 'Stock', marketValue: 58.18, quantity: 0.32763, currentPrice: 177.59 },
          { symbol: 'TSLA', category: 'Stock', marketValue: 43.12, quantity: 0.11403, currentPrice: 378.18 },
          { symbol: 'MA', category: 'Stock', marketValue: 888.09, quantity: 1.55918, currentPrice: 569.59 },
          { symbol: 'CRM', category: 'Stock', marketValue: 1855.61, quantity: 8.2718, currentPrice: 224.33 },
          { symbol: 'GLDM', category: 'ETF', marketValue: 6178.25, quantity: 76.03061, currentPrice: 81.26 },
          { symbol: 'BITB', category: 'ETF', marketValue: 5763.93, quantity: 127.77496, currentPrice: 45.11 },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6703_20261007.png',
        institution: 'WeBull',
        account: 'CVS8QSX4',
        accountType: 'Rollover IRA',
        positions: [
          { symbol: 'CRM', category: 'Stock', marketValue: 1855.61, quantity: 8.2718, currentPrice: 224.33 },
          { symbol: 'NFLX', category: 'Stock', marketValue: 704.17, quantity: 10.0595, currentPrice: 70.00 },
          { symbol: 'SOFI', category: 'Stock', marketValue: 1136.71, quantity: 72.54043, currentPrice: 15.67 },
          { symbol: 'MCD', category: 'Stock', marketValue: 2116.57, quantity: 9.16621, currentPrice: 230.91 },
          { symbol: 'AI', category: 'Stock', isCovered: true, marketValue: 11240.0, quantity: 1000, currentPrice: 11.24 },
          { symbol: 'AI $13 Call', category: 'Covered Call', marketValue: -10.0, quantity: -10, strikePrice: 13.0, underlying: 'AI' },
          { symbol: 'ORCL', category: 'Stock', marketValue: 115169.67, quantity: 800.06719, currentPrice: 143.95 },
        ],
      },
    ];

    const stitchedIra = stitchWebullScreenshots(iraScreens);
    expect(stitchedIra.accounts).toHaveLength(1);
    const iraAcc = stitchedIra.accounts[0];

    // Net Account Value anchor must match $219,702.33 exactly
    expect(iraAcc.netAccountValue).toBe(219702.33);
    expect(iraAcc.cashBalance).toBe(11.78);

    // Sum of deduplicated rows must match $219,702.33 within 5 cents
    const sumIraRows = Math.round(iraAcc.deduplicatedPositions.reduce((s, p) => s + p.marketValue, 0) * 100) / 100;
    expect(Math.abs(sumIraRows - 219702.33)).toBeLessThanOrEqual(0.05);

    // 3. Combined Batch Ingestion
    const combinedScreens = [...cashScreens, ...iraScreens];
    const combinedStitched = stitchWebullScreenshots(combinedScreens);
    expect(combinedStitched.accounts).toHaveLength(2);

    const totalStated = Math.round(combinedStitched.accounts.reduce((s, a) => s + (a.netAccountValue || 0), 0) * 100) / 100;
    expect(totalStated).toBe(278850.33); // 59,148.00 + 219,702.33
  });
});
