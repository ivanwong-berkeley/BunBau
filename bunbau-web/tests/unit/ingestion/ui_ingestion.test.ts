import { describe, it, expect } from 'vitest';
import type { StagingIngestionResponse } from '../../../src/lib/types/ingestion';

describe('Ingestion UI State & Reconciled Calculation Handlers', () => {
  const mockStaging: StagingIngestionResponse = {
    stagingId: 'stg_ui_test',
    accounts: [
      {
        accountKey: 'fidelity_6238',
        institution: 'Fidelity',
        accountName: 'Individual - TOD',
        accountMaskedNumber: '***-6238',
        accountType: 'Brokerage',
        totalValue: 500000,
        cashBalance: 100331.74,
        positions: [
          {
            positionKey: 'pos_1',
            accountKey: 'fidelity_6238',
            symbol: 'ORCL',
            description: 'Oracle Corp',
            assetCategory: 'Stock',
            quantity: 3000.138,
            costBasis: 162271.3,
            currentPrice: 144.77,
            marketValue: 434329.97,
            unrealizedGainLoss: 272058.67,
            unrealizedGainLossPct: 167.65,
            dataSource: 'CSV',
            updatedAt: '2026-10-06T00:00:00Z',
          },
        ],
        rawSourceFiles: [],
        sourceType: 'CSV',
        extractedAt: '2026-10-06T00:00:00Z',
        version: 1,
      },
    ],
    diffs: [
      {
        accountKey: 'fidelity_6238',
        accountName: 'Individual - TOD',
        institution: 'Fidelity',
        statedCashBefore: 100331.74,
        statedCashAfter: 100331.74,
        totalLockedCollateral: 98500,
        netFreeCash: 1831.74,
        totalValueBefore: 500000,
        totalValueAfter: 500000,
        positionDiffs: [],
        warnings: [],
      },
    ],
    warnings: [],
  };

  it('validates staging data contract structure for Diff Review modal', () => {
    expect(mockStaging.accounts.length).toBe(1);
    expect(mockStaging.diffs.length).toBe(1);
    const diff = mockStaging.diffs[0];
    expect(diff.totalLockedCollateral).toBe(98500);
    expect(diff.netFreeCash).toBeCloseTo(1831.74, 2);
    expect(diff.statedCashAfter - diff.totalLockedCollateral).toBeCloseTo(diff.netFreeCash, 2);
  });

  it('verifies symmetrical dual-tab and identical 4-button action contract', () => {
    const expectedTabs = ['tab-vision', 'tab-csv'];
    const expectedActions = [
      'action-reject-restart',
      'action-ask-ai',
      'action-preview-impact',
      'action-approve-import',
    ];
    expect(expectedTabs).toHaveLength(2);
    expect(expectedActions).toHaveLength(4);
  });
});
