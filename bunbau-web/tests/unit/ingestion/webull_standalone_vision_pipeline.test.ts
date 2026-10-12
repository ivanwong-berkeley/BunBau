import { describe, it, expect } from 'vitest';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';
import { normalizeExtraction } from '../../../src/lib/extraction/normalize';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('WeBull Standalone Vision Pipeline (Zero CSV Dependency)', () => {
  it('processes multi-screenshot datasets autonomously without needing CSV or prior DB accounts', () => {
    // 1. User uploads 8 screenshots across 2 accounts
    const files = [
      'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
      'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
      'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
      'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
      'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
      'Webull_Rollover-IRA_CVS8QSX4_IMG_6701_20261007.png',
      'Webull_Rollover-IRA_CVS8QSX4_IMG_6702_20261007.png',
      'Webull_Rollover-IRA_CVS8QSX4_IMG_6703_20261007.png',
    ];

    // Verify metadata parser can determine datasets
    const clusters = new Map<string, string[]>();
    for (const f of files) {
      const meta = parseFilenameMetadata(f);
      const key = `${meta.institution}_${meta.accountRaw}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(f);
    }

    expect(clusters.size).toBe(2);
    expect(clusters.get('WeBull_CUX5XLW4')).toHaveLength(4);
    expect(clusters.get('WeBull_CVS8QSX4')).toHaveLength(4);

    // 2. Simulated extractions per dataset
    const cashExtractions: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png',
        netAccountValue: 59148.0,
        cashBalance: 57.11,
        settledCash: 57.11,
        myPositionsCount: 4,
        positions: [
          { symbol: 'AMD', quantity: 20.58465, marketValue: 13314.98, assetClass: 'Stock' },
          { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png',
        positions: [
          { symbol: 'TSM', quantity: 8.16611, marketValue: 3870.57, assetClass: 'Stock' }, // overlap
          { symbol: 'SOFI', quantity: 14.11157, marketValue: 220.85, assetClass: 'Stock' },
        ],
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png',
        positions: [
          // WeBull Covered Option tree
          {
            symbol: 'SOFI [Covered Option]',
            quantity: 1,
            marketValue: 1566.0,
            isCoveredOptionGroup: true,
            coveredChildren: [
              { symbol: 'SOFI Stock', quantity: 100, marketValue: 1567.0, assetClass: 'Stock', isCovered: true },
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
      },
      {
        fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png',
        positions: [
          { symbol: 'MCD', quantity: 6.02179, marketValue: 1800.0, assetClass: 'Stock' },
        ],
      },
    ];

    const iraExtractions: RawVisionScreenExtraction[] = [
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png',
        netAccountValue: 219702.33,
        cashBalance: 11.78,
        settledCash: 11.78,
        myPositionsCount: 5,
        positions: [
          { symbol: 'NVDA', quantity: 59.15845, marketValue: 14053.09, assetClass: 'Stock' },
          { symbol: 'SOFI', quantity: 72.54043, marketValue: 1135.26, assetClass: 'Stock' }, // Coexists with Cash!
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6701_20261007.png',
        positions: [
          { symbol: 'SOFI', quantity: 72.54043, marketValue: 1135.26, assetClass: 'Stock' }, // overlap
          { symbol: 'MCD', quantity: 9.16621, marketValue: 2740.7, assetClass: 'Stock' }, // Coexists with Cash!
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6702_20261007.png',
        positions: [
          {
            symbol: 'AI [Covered Option]',
            quantity: 10,
            marketValue: 11230.0,
            isCoveredOptionGroup: true,
            coveredChildren: [
              { symbol: 'AI Stock', quantity: 1000, marketValue: 11240.0, assetClass: 'Stock', isCovered: true },
              {
                symbol: 'AI $13 Call',
                quantity: -10,
                marketValue: -10.0,
                assetClass: 'CoveredCall',
                underlying: 'AI',
                strikePrice: 13,
                expirationDate: '2026-10-09',
              },
            ],
          },
        ],
      },
      {
        fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6703_20261007.png',
        positions: [
          { symbol: 'ORCL', quantity: 800.06719, marketValue: 115169.67, assetClass: 'Stock' },
        ],
      },
    ];

    const result = stitchWebullScreenshots([...cashExtractions, ...iraExtractions]);

    expect(result.accounts).toHaveLength(2);
    // Overlaps removed: 1 in Cash (TSM) + 1 SOFI stock consolidation in Cash + 1 in IRA (SOFI) = 3 overlaps removed
    expect(result.totalOverlapsRemoved).toBe(3);

    const cashAccount = result.accounts.find((a) => a.accountId === 'CUX5XLW4')!;
    const iraAccount = result.accounts.find((a) => a.accountId === 'CVS8QSX4')!;

    expect(cashAccount.cashBalance).toBe(57.11);
    expect(cashAccount.netAccountValue).toBe(59148.0);
    expect(cashAccount.isCountVerified).toBe(true);

    expect(iraAccount.cashBalance).toBe(11.78);
    expect(iraAccount.netAccountValue).toBe(219702.33);
    expect(iraAccount.isCountVerified).toBe(true);

    // Verify Symbol Coexistence (SOFI & MCD in both accounts)
    const cashSofi = cashAccount.deduplicatedPositions.filter((p) => p.symbol.includes('SOFI'));
    const iraSofi = iraAccount.deduplicatedPositions.filter((p) => p.symbol.includes('SOFI'));
    expect(cashSofi.length).toBeGreaterThan(0);
    expect(iraSofi.length).toBeGreaterThan(0);

    const cashMcd = cashAccount.deduplicatedPositions.find((p) => p.symbol === 'MCD');
    const iraMcd = iraAccount.deduplicatedPositions.find((p) => p.symbol === 'MCD');
    expect(cashMcd?.quantity).toBeCloseTo(6.02179, 4);
    expect(iraMcd?.quantity).toBeCloseTo(9.16621, 4);
  });
});
