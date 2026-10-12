import { describe, it, expect } from 'vitest';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';

describe('Account Hierarchy & Scoped Report Selection', () => {
  const accounts: CanonicalAccount[] = [
    {
      id: 'acc_fid_1',
      institution: 'Fidelity',
      accountType: 'Brokerage',
      maskedAccount: '***-1111',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_fid_2',
      institution: 'Fidelity',
      accountType: 'Roth IRA',
      maskedAccount: '***-2222',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_schwab',
      institution: 'Charles Schwab',
      accountType: 'Individual',
      maskedAccount: '***-3333',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const positions: CanonicalPosition[] = [
    {
      id: 'p1',
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
      symbol: 'AAPL',
      assetClass: 'Stock',
      quantity: 10,
      marketValue: 2200,
    },
    {
      id: 'p2',
      institution: 'Fidelity',
      accountId: 'acc_fid_2',
      symbol: 'MSFT',
      assetClass: 'Stock',
      quantity: 5,
      marketValue: 2000,
    },
    {
      id: 'p3',
      institution: 'Charles Schwab',
      accountId: 'acc_schwab',
      symbol: 'NVDA',
      assetClass: 'Stock',
      quantity: 20,
      marketValue: 2400,
    },
  ];

  it('generates report scoped strictly to multiple selected accounts across institutions', () => {
    // Select Fidelity Brokerage + Schwab Individual, omit Fidelity Roth IRA
    const selectedIds = ['acc_fid_1', 'acc_schwab'];
    const report = buildConsolidatedReport(positions, accounts, {
      filterAccountIds: selectedIds,
    });

    expect(report.metadata.accountsCount).toBe(2);
    expect(report.metadata.positionsCount).toBe(2); // AAPL and NVDA
    expect(report.section6_MasterFlatLedger.some((r) => r.symbol === 'MSFT')).toBe(false);
    expect(report.section6_MasterFlatLedger.some((r) => r.symbol === 'AAPL')).toBe(true);
    expect(report.section6_MasterFlatLedger.some((r) => r.symbol === 'NVDA')).toBe(true);

    // Sum of net worth should be 2200 + 2400 = 4600
    expect(report.section1_ExecutiveSummary.computedNetWorth).toBe(4600);
  });
});
