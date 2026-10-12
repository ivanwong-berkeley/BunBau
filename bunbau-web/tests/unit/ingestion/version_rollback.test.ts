import { describe, it, expect } from 'vitest';
import { createVersionSnapshot, rollbackAccountToVersion } from '../../../src/lib/ingestion/versioning';
import type { CanonicalAccountPayload } from '../../../src/lib/types/ingestion';

describe('Account Version Snapshot & Atomic Rollback Engine', () => {
  const accountV1: CanonicalAccountPayload = {
    accountKey: 'fidelity_6238',
    institution: 'Fidelity',
    accountName: 'Individual - TOD',
    accountMaskedNumber: '***-6238',
    accountType: 'Brokerage',
    totalValue: 500000,
    cashBalance: 100000,
    positions: [
      {
        positionKey: 'pos_orcl',
        accountKey: 'fidelity_6238',
        symbol: 'ORCL',
        description: 'Oracle Corp',
        assetCategory: 'Stock',
        quantity: 3000,
        costBasis: 160000,
        currentPrice: 144,
        marketValue: 432000,
        unrealizedGainLoss: 272000,
        unrealizedGainLossPct: 170,
        dataSource: 'CSV',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ],
    rawSourceFiles: [],
    sourceType: 'CSV',
    extractedAt: '2026-10-01T00:00:00Z',
    version: 1,
  };

  it('creates an immutable archive snapshot of Version 1', () => {
    const snapshotV1 = createVersionSnapshot(accountV1, 'ingest_001');
    expect(snapshotV1.version).toBe(1);
    expect(snapshotV1.accountKey).toBe('fidelity_6238');
    expect(snapshotV1.payload.positions.length).toBe(1);
    expect(snapshotV1.payload.positions[0].symbol).toBe('ORCL');
  });

  it('rolls back from Version 2 to Version 1 cleanly incrementing version to v3', () => {
    const snapshotV1 = createVersionSnapshot(accountV1, 'ingest_001');

    // Account updated to Version 2 with NVDA added
    const accountV2: CanonicalAccountPayload = {
      ...accountV1,
      version: 2,
      positions: [
        ...accountV1.positions,
        {
          positionKey: 'pos_nvda',
          accountKey: 'fidelity_6238',
          symbol: 'NVDA',
          description: 'Nvidia Corp',
          assetCategory: 'Stock',
          quantity: 20,
          costBasis: 2000,
          currentPrice: 240,
          marketValue: 4800,
          unrealizedGainLoss: 2800,
          unrealizedGainLossPct: 140,
          dataSource: 'CSV',
          updatedAt: '2026-10-07T00:00:00Z',
        },
      ],
    };
    expect(accountV2.positions.length).toBe(2);

    // Rollback to Snapshot V1
    const rolledBack = rollbackAccountToVersion(accountV2, snapshotV1);

    expect(rolledBack.version).toBe(3); // Next version
    expect(rolledBack.positions.length).toBe(1); // Restored to V1 positions
    expect(rolledBack.positions[0].symbol).toBe('ORCL');
  });
});
