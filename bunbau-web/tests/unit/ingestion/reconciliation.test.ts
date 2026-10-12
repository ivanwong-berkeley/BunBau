import { describe, it, expect } from 'vitest';
import { reconcileAccounts } from '../../../src/lib/ingestion/reconcile';
import type { CanonicalAccountPayload, CanonicalPosition } from '../../../src/lib/types/ingestion';

describe('Dual-Source Reconciliation & Zero Double-Counting Engine', () => {
  const mockScreenshotAccount: CanonicalAccountPayload = {
    accountKey: 'schwab_8888',
    institution: 'Charles Schwab',
    accountName: 'Brokerage',
    accountMaskedNumber: '***-8888',
    accountType: 'Brokerage',
    totalValue: 78000,
    cashBalance: 45000,
    positions: [
      {
        positionKey: 'pos_aapl_stock',
        accountKey: 'schwab_8888',
        symbol: 'AAPL',
        description: 'Apple Inc',
        assetCategory: 'Stock',
        quantity: 100, // Screenshot shows rounded 100
        costBasis: 0, // Screenshot lacks cost basis
        currentPrice: 330.0,
        marketValue: 33000.0,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        dataSource: 'SCREENSHOT',
        updatedAt: '2026-10-06T12:00:00Z',
      },
      {
        positionKey: 'pos_cd_enrich',
        accountKey: 'schwab_8888',
        symbol: 'CD',
        description: 'BANK CD',
        assetCategory: 'CD',
        quantity: 10000,
        costBasis: 10000,
        currentPrice: 100,
        marketValue: 10000,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        maturityDate: '2026-10-15', // Screenshot table visibly shows maturity date!
        dataSource: 'SCREENSHOT',
        updatedAt: '2026-10-06T12:00:00Z',
      },
    ],
    rawSourceFiles: [
      {
        fileHash: 'hash_screenshot_123',
        fileName: 'schwab_screen.png',
        fileType: 'IMAGE',
        storagePath: 'raw_ingest/schwab_screen.png',
      },
    ],
    sourceType: 'SCREENSHOT',
    extractedAt: '2026-10-06T12:00:00Z',
    version: 1,
  };

  const mockCsvAccount: CanonicalAccountPayload = {
    accountKey: 'schwab_8888',
    institution: 'Charles Schwab',
    accountName: 'Brokerage',
    accountMaskedNumber: '***-8888',
    accountType: 'Brokerage',
    totalValue: 78523,
    cashBalance: 45000,
    positions: [
      {
        positionKey: 'pos_aapl_csv',
        accountKey: 'schwab_8888',
        symbol: 'AAPL',
        description: 'Apple Inc Common Stock',
        assetCategory: 'Stock',
        quantity: 100.523, // CSV has exact fractional shares!
        costBasis: 28000.0, // CSV has exact cost basis!
        currentPrice: 333.63,
        marketValue: 33537.4,
        unrealizedGainLoss: 5537.4,
        unrealizedGainLossPct: 19.78,
        dataSource: 'CSV',
        updatedAt: '2026-10-06T09:00:00Z',
      },
      {
        positionKey: 'pos_cd_csv',
        accountKey: 'schwab_8888',
        symbol: 'CD',
        description: 'BANK CD 4.85%',
        assetCategory: 'CD',
        quantity: 10000,
        costBasis: 10000,
        currentPrice: 100,
        marketValue: 10000,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        yieldApy: 4.85, // CSV has APY but missing maturity date in header
        dataSource: 'CSV',
        updatedAt: '2026-10-06T09:00:00Z',
      },
      {
        positionKey: 'pos_csp_aapl',
        accountKey: 'schwab_8888',
        symbol: 'AAPL 10/16/2026 310.00 P',
        description: 'AAPL OCT 16 2026 310 PUT',
        assetCategory: 'Option',
        quantity: -1,
        costBasis: 250,
        currentPrice: 1.5,
        marketValue: -150,
        unrealizedGainLoss: 100,
        unrealizedGainLossPct: 40,
        optionDetails: {
          underlying: 'AAPL',
          type: 'PUT',
          strike: 310,
          expirationDate: '2026-10-16',
          isCollateralizedCsp: true,
          contractsCount: 1,
          premium: 1.5,
        },
        dataSource: 'CSV',
        updatedAt: '2026-10-06T09:00:00Z',
      },
    ],
    rawSourceFiles: [
      {
        fileHash: 'hash_csv_456',
        fileName: 'schwab_export.csv',
        fileType: 'CSV',
        storagePath: 'raw_ingest/schwab_export.csv',
      },
    ],
    sourceType: 'CSV',
    extractedAt: '2026-10-06T09:00:00Z',
    version: 1,
  };

  it('guarantees ZERO DOUBLE-COUNTING: AAPL merged into exactly 1 position', () => {
    const result = reconcileAccounts([mockScreenshotAccount], [mockCsvAccount], 'user-123');

    expect(result.mergedAccounts.length).toBe(1);
    const merged = result.mergedAccounts[0];

    // Count AAPL positions
    const aaplPositions = merged.positions.filter((p) => p.symbol === 'AAPL');
    expect(aaplPositions.length).toBe(1);

    const mergedAapl = aaplPositions[0];
    // CSV precedence rule: exact fractional quantity and cost basis retained
    expect(mergedAapl.quantity).toBe(100.523);
    expect(mergedAapl.costBasis).toBe(28000.0);
    expect(mergedAapl.dataSource).toBe('MERGED');

    // Net worth must NOT double count AAPL
    const totalPosValue = merged.positions.reduce((sum, p) => sum + p.marketValue, 0);
    expect(merged.totalValue).toBeCloseTo(merged.cashBalance + totalPosValue, 2);
  });

  it('enriches CD with maturity date from screenshot and APY from CSV', () => {
    const result = reconcileAccounts([mockScreenshotAccount], [mockCsvAccount], 'user-123');
    const merged = result.mergedAccounts[0];

    const cdPositions = merged.positions.filter((p) => p.assetCategory === 'CD');
    expect(cdPositions.length).toBe(1);

    const mergedCd = cdPositions[0];
    expect(mergedCd.maturityDate).toBe('2026-10-15'); // Enriched from screenshot
    expect(mergedCd.yieldApy).toBe(4.85); // Preserved from CSV
    expect(mergedCd.dataSource).toBe('MERGED');
  });

  it('accurately locks CSP collateral and calculates net free cash', () => {
    const result = reconcileAccounts([mockScreenshotAccount], [mockCsvAccount], 'user-123');
    const diff = result.diffs[0];

    // Strike 310 * 100 * 1 contract = $31,000 locked
    expect(diff.totalLockedCollateral).toBe(31000);
    // Cash $45,000 - $31,000 = $14,000 Net Free Cash
    expect(diff.netFreeCash).toBe(14000);
  });
});
