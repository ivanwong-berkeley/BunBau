import { describe, it, expect } from 'vitest';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';

describe('Progressive Per-Screen Vision Extraction Pipeline', () => {
  it('extracts and stitches screens sequentially with discrete per-screen latency and overlap deduplication', () => {
    // Simulated sequence of 4 WeBull screens processed progressively
    const screen1: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
      account: 'CUX5XLW4',
      accountType: 'Individual Cash',
      institution: 'WeBull',
      asOfDate: '2026-10-07',
      netAccountValue: 59148.0,
      cashBalance: 57.11,
      settledCash: 57.11,
      myPositionsCount: 4,
      positions: [
        { symbol: 'AMD', quantity: 20.58465, marketValue: 13314.98, assetClass: 'Stock' },
        { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' },
      ],
    };

    const screen2: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
      account: 'CUX5XLW4',
      positions: [
        { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' }, // Overlap from screen 1
        { symbol: 'SOFI', quantity: 14.11157, marketValue: 220.85, assetClass: 'Stock' },
      ],
    };

    const screen3: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
      account: 'CUX5XLW4',
      positions: [
        {
          symbol: 'SOFI [Covered Option]',
          quantity: 1,
          marketValue: 1566.0,
          isCoveredOptionGroup: true,
          coveredChildren: [
            { symbol: 'SOFI', description: 'SOFI Stock', quantity: 100, marketValue: 1567.0, assetClass: 'Stock', isCovered: true },
            {
              symbol: 'SOFI $21.5 Call',
              quantity: -1,
              marketValue: -1.0,
              assetClass: 'CoveredCall',
              underlying: 'SOFI',
              strikePrice: 21.5,
              expirationDate: '2026-10-09',
            },
          ],
        },
      ],
    };

    const screen4: RawVisionScreenExtraction = {
      fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
      account: 'CUX5XLW4',
      positions: [
        { symbol: 'MCD', quantity: 6.02179, marketValue: 1800.0, assetClass: 'Stock' },
      ],
    };

    // Stitched result from progressively collected screens
    const progressiveScreens = [screen1, screen2, screen3, screen4];
    const stitched = stitchWebullScreenshots(progressiveScreens);

    expect(stitched.accounts).toHaveLength(1);
    const account = stitched.accounts[0];

    expect(account.accountId).toBe('CUX5XLW4');
    expect(account.netAccountValue).toBe(59148.0);
    expect(account.cashBalance).toBe(57.11);
    expect(account.overlapDuplicatesRemoved).toBe(2); // 1 duplicate TSM + 1 SOFI stock consolidation
    expect(account.isCountVerified).toBe(true); // Matches ground-truth 4 underlying assets (AMD, TSM, SOFI, MCD)

    // Verify covered option tree was deconstructed
    const coveredCall = account.deduplicatedPositions.find((p) => p.assetClass === 'CoveredCall');
    expect(coveredCall).toBeDefined();
    expect(coveredCall?.option?.strike).toBe(21.5);
    expect(coveredCall?.option?.underlying).toBe('SOFI');

    // Verify SOFI stock is consolidated into 1 canonical position
    const sofiStock = account.deduplicatedPositions.filter((p) => p.symbol === 'SOFI' && p.assetClass === 'Stock');
    expect(sofiStock).toHaveLength(1);
    expect(sofiStock[0].quantity).toBeCloseTo(114.11157, 5);
  });
});
