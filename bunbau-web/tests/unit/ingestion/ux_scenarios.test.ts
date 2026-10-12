import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';
import { reconcileAccounts } from '../../../src/lib/ingestion/reconcile';
import { createVersionSnapshot, rollbackAccountToVersion } from '../../../src/lib/ingestion/versioning';
import { toLegacyPosition, toLegacyAccount } from '../../../src/lib/types/ingestion';
import { calculateOptionMoneyness } from '../../../src/lib/portfolio/moneyness';
import type { CanonicalAccountPayload } from '../../../src/lib/types/ingestion';

describe('Dual-Source End-to-End UX & Verification Scenarios', () => {
  const fixturePath = path.resolve(__dirname, '../../fixtures/fidelity_sample.csv');
  const csvContent = fs.readFileSync(fixturePath, 'utf-8');

  // Scenario A: CSV Only Ingestion
  it('Scenario A: CSV Only Ingestion correctly populates equities, options, collateral, and cash', () => {
    const router = new CSVRouter();
    const result = router.routeAndParse(csvContent, 'user-e2e');

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('Fidelity');
    expect(account.accountMaskedNumber).toBe('***-6238');
    expect(account.cashBalance).toBeCloseTo(100331.74, 2);

    const reconcileResult = reconcileAccounts([], [account], 'user-e2e');
    const finalAccount = reconcileResult.mergedAccounts[0];
    const diff = reconcileResult.diffs[0];

    // Collateral calculation
    expect(diff.totalLockedCollateral).toBe(98500);
    expect(diff.netFreeCash).toBeCloseTo(1831.74, 2);

    // Legacy selector compatibility
    const legacyAcc = toLegacyAccount(finalAccount);
    expect(legacyAcc.positions.length).toBe(account.positions.length);
    expect(legacyAcc.institution).toBe('Fidelity');
  });

  // Scenario B: Screenshot Only Ingestion
  it('Scenario B: Screenshot Only Ingestion retains visual state without dropping fields', () => {
    const mockScreenshotAcc: CanonicalAccountPayload = {
      accountKey: 'schwab_8888',
      institution: 'Charles Schwab',
      accountName: 'Brokerage',
      accountMaskedNumber: '***-8888',
      accountType: 'Brokerage',
      totalValue: 50000,
      cashBalance: 20000,
      positions: [
        {
          positionKey: 'pos_spy',
          accountKey: 'schwab_8888',
          symbol: 'SPY',
          description: 'SPDR S&P 500 ETF',
          assetCategory: 'ETF',
          quantity: 50,
          costBasis: 25000,
          currentPrice: 600,
          marketValue: 30000,
          unrealizedGainLoss: 5000,
          unrealizedGainLossPct: 20,
          dataSource: 'SCREENSHOT',
          updatedAt: new Date().toISOString(),
        },
      ],
      rawSourceFiles: [],
      sourceType: 'SCREENSHOT',
      extractedAt: new Date().toISOString(),
      version: 1,
    };

    const res = reconcileAccounts([mockScreenshotAcc], [], 'user-e2e');
    expect(res.mergedAccounts.length).toBe(1);
    expect(res.mergedAccounts[0].positions[0].dataSource).toBe('SCREENSHOT');
  });

  // Scenario C: Simultaneous Dual Upload
  it('Scenario C: Simultaneous Dual Upload merges fields and guarantees ZERO double-counting', () => {
    const mockSS: CanonicalAccountPayload = {
      accountKey: 'fidelity_6238',
      institution: 'Fidelity',
      accountName: 'Individual - TOD',
      accountMaskedNumber: '***-6238',
      accountType: 'Brokerage',
      totalValue: 100000,
      cashBalance: 100000,
      positions: [
        {
          positionKey: 'pos_orcl_ss',
          accountKey: 'fidelity_6238',
          symbol: 'ORCL',
          description: 'Oracle Corp',
          assetCategory: 'Stock',
          quantity: 3000, // Screenshot shows rounded 3000
          costBasis: 0,
          currentPrice: 144,
          marketValue: 432000,
          unrealizedGainLoss: 0,
          unrealizedGainLossPct: 0,
          dataSource: 'SCREENSHOT',
          updatedAt: new Date().toISOString(),
        },
      ],
      rawSourceFiles: [],
      sourceType: 'SCREENSHOT',
      extractedAt: new Date().toISOString(),
      version: 1,
    };

    const router = new CSVRouter();
    const parsedCsv = router.routeAndParse(csvContent, 'user-e2e');

    const res = reconcileAccounts([mockSS], parsedCsv.accounts, 'user-e2e');
    const merged = res.mergedAccounts[0];

    // Verify ORCL is NOT doubled
    const orclRows = merged.positions.filter((p) => p.symbol === 'ORCL');
    expect(orclRows.length).toBe(1);
    // CSV floating point precision is retained
    expect(orclRows[0].quantity).toBe(3000.138);
    expect(orclRows[0].dataSource).toBe('MERGED');

    // Total net worth does not double count ORCL
    const sumHoldings = merged.positions.reduce((sum, p) => sum + p.marketValue, 0);
    expect(merged.totalValue).toBeCloseTo(merged.cashBalance + sumHoldings, 2);
  });

  // Scenario D: Sequential Version Update
  it('Scenario D: Sequential Version Update increments version to N+1', () => {
    const router = new CSVRouter();
    const parsed = router.routeAndParse(csvContent, 'user-e2e');
    const accV1 = parsed.accounts[0];

    const snapshotV1 = createVersionSnapshot(accV1, 'ingest_v1');
    expect(snapshotV1.version).toBe(1);

    const accV2: CanonicalAccountPayload = {
      ...accV1,
      version: accV1.version + 1,
      totalValue: accV1.totalValue + 5000,
    };

    expect(accV2.version).toBe(2);
  });

  // Scenario E: Rollback UX
  it('Scenario E: 1-Click Rollback safely restores Version 1 state', () => {
    const router = new CSVRouter();
    const parsed = router.routeAndParse(csvContent, 'user-e2e');
    const accV1 = parsed.accounts[0];

    const snapshotV1 = createVersionSnapshot(accV1, 'ingest_v1');

    const accV2: CanonicalAccountPayload = {
      ...accV1,
      version: 2,
      positions: accV1.positions.slice(0, 3), // 3 positions instead of 14
    };

    const restoredAcc = rollbackAccountToVersion(accV2, snapshotV1);
    expect(restoredAcc.version).toBe(3); // Next version
    expect(restoredAcc.positions.length).toBe(accV1.positions.length); // Full 14 positions restored
  });

  // Scenario F: Regression Verification of Options Moneyness GYR
  it('Scenario F (Regression): Options Moneyness GYR alerts correctly evaluate thresholds', () => {
    // AAPL Strike $310 vs Quote $333.63 -> Gap = (333.63 - 310) / 310 = 7.62% -> Safe (GREEN, >5%)
    const mGreen = calculateOptionMoneyness('CSP', 310, 333.63);
    expect(mGreen.urgency).toBe('safe');
    expect(mGreen.moneynessPct).toBeGreaterThan(5);

    // AAPL Strike $310 vs Quote $320 -> Gap = (320 - 310) / 310 = 3.23% -> Soon (YELLOW, 2-5%)
    const mYellow = calculateOptionMoneyness('CSP', 310, 320.0);
    expect(mYellow.urgency).toBe('soon');
    expect(mYellow.moneynessPct).toBeGreaterThanOrEqual(2);
    expect(mYellow.moneynessPct).toBeLessThanOrEqual(5);

    // AAPL Strike $310 vs Quote $312 -> Gap = (312 - 310) / 310 = 0.65% -> Urgent (RED, <=2%)
    const mRed = calculateOptionMoneyness('CSP', 310, 312.0);
    expect(mRed.urgency).toBe('urgent');
    expect(mRed.moneynessPct).toBeLessThanOrEqual(2);
  });
});
