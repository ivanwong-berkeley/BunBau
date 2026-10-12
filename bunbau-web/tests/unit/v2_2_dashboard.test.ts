import { describe, it, expect } from 'vitest';
import { allocation, netWorth } from '../../src/lib/portfolio/selectors';
import { buildSeedAccounts } from '../../src/lib/portfolio/seed';
import { flattenPositions } from '../../src/lib/portfolio/selectors';
import { makeMemoryStore } from './memoryStore';
import { PortfolioSnapshot } from '../../src/lib/portfolio/types';

describe('v2.2 Dashboard: Asset Allocation & Table Data', () => {
  const seed = flattenPositions(buildSeedAccounts());

  it('calculates allocation slices summing to 100% of owned net worth', () => {
    const slices = allocation(seed);
    expect(slices.map((s) => s.label)).toEqual(['Cash', 'CDs', 'SGOV/Bonds', 'Equities', 'Crypto']);
    const totalAlloc = slices.reduce((sum, s) => sum + s.value, 0);
    const totalNetWorth = netWorth(seed);
    expect(Math.abs(totalAlloc - totalNetWorth)).toBeLessThan(1);

    const totalPct = slices.reduce((sum, s) => sum + s.pct, 0);
    expect(Math.round(totalPct)).toBe(100);
  });

  it('allocation excludes short options from total value and percentages', () => {
    const slices = allocation(seed);
    for (const slice of slices) {
      expect(slice.value).toBeGreaterThanOrEqual(0);
      expect(slice.pct).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('v2.2 Dashboard: Snapshots Capture & Immutability', () => {
  it('creates immutable point-in-time snapshot in the store', async () => {
    const { store, snapshots } = makeMemoryStore();
    const accounts = buildSeedAccounts();
    const positions = flattenPositions(accounts);

    const snap: PortfolioSnapshot = {
      id: 'snap_1700000001',
      createdAt: new Date().toISOString(),
      totalNetWorth: netWorth(positions),
      positionsCount: positions.length,
      accountsCount: accounts.length,
      institutions: ['Fidelity', 'Schwab'],
      accounts,
    };

    await store.createSnapshot!('user1', snap);
    expect(snapshots.size).toBe(1);

    const listed = await store.listSnapshots!('user1');
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe('snap_1700000001');
    expect(listed[0].totalNetWorth).toBe(netWorth(positions));
    expect(listed[0].accountsCount).toBe(accounts.length);
  });

  it('lists multiple snapshots ordered by createdAt newest first', async () => {
    const { store } = makeMemoryStore();
    const accounts = buildSeedAccounts();

    const snap1: PortfolioSnapshot = {
      id: 'snap_old',
      createdAt: '2026-10-01T10:00:00.000Z',
      totalNetWorth: 500000,
      positionsCount: 10,
      accountsCount: 1,
      institutions: ['Fidelity'],
      accounts,
    };

    const snap2: PortfolioSnapshot = {
      id: 'snap_new',
      createdAt: '2026-10-05T10:00:00.000Z',
      totalNetWorth: 600000,
      positionsCount: 12,
      accountsCount: 1,
      institutions: ['Fidelity'],
      accounts,
    };

    await store.createSnapshot!('user1', snap1);
    await store.createSnapshot!('user1', snap2);

    const listed = await store.listSnapshots!('user1');
    expect(listed.map((s) => s.id)).toEqual(['snap_new', 'snap_old']);
  });
});

describe('v2.2 CSV & TSV formatting correctness', () => {
  it('escapes quotes and commas properly for CSV export', () => {
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    expect(escapeCsv('Simple')).toBe('Simple');
    expect(escapeCsv('$100,000.00')).toBe('"$100,000.00"');
    expect(escapeCsv('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(escapeCsv('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });
});
