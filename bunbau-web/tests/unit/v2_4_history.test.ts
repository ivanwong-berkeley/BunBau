import { describe, it, expect } from 'vitest';
import { expectedHistoryDeletePhrase, matchesHistoryDeletePhrase } from '../../src/lib/portfolio/deletePhrase';
import { PortfolioSnapshot, ImportRecord, CanonicalAccount } from '../../src/lib/portfolio/types';
import { deleteSnapshotsHistory, deleteUploadsHistory, PortfolioStore } from '../../src/lib/portfolio/commit';

describe('v2.4 History & Snapshots Management', () => {
  describe('History Delete Phrase Matching', () => {
    it('requires exact phrase "Delete all the history" for full history deletion', () => {
      const phrase = expectedHistoryDeletePhrase('all');
      expect(phrase).toBe('Delete all the history');
      expect(matchesHistoryDeletePhrase('Delete all the history', 'all')).toBe(true);
      expect(matchesHistoryDeletePhrase('delete all the history', 'all')).toBe(false);
      expect(matchesHistoryDeletePhrase('Delete all the history ', 'all')).toBe(false);
    });

    it('requires exact phrase with from/to dates for date range deletion', () => {
      const phrase = expectedHistoryDeletePhrase('range', '2026-10-01', '2026-10-06');
      expect(phrase).toBe('Delete the selected history from 2026-10-01 to 2026-10-06');
      expect(matchesHistoryDeletePhrase('Delete the selected history from 2026-10-01 to 2026-10-06', 'range', '2026-10-01', '2026-10-06')).toBe(true);
      expect(matchesHistoryDeletePhrase('Delete the selected history', 'range', '2026-10-01', '2026-10-06')).toBe(false);
    });
  });

  describe('History Deletion Logic (Snapshots and Uploads)', () => {
    const mockSnapshots: PortfolioSnapshot[] = [
      {
        id: 'snap_1',
        createdAt: '2026-10-01T12:00:00Z',
        totalNetWorth: 500000,
        positionsCount: 10,
        accountsCount: 1,
        institutions: ['Schwab'],
        accounts: [],
      },
      {
        id: 'snap_2',
        createdAt: '2026-10-04T12:00:00Z',
        totalNetWorth: 520000,
        positionsCount: 12,
        accountsCount: 1,
        institutions: ['Fidelity'],
        accounts: [],
      },
      {
        id: 'snap_3',
        createdAt: '2026-10-06T12:00:00Z',
        totalNetWorth: 550000,
        positionsCount: 15,
        accountsCount: 2,
        institutions: ['Schwab', 'Fidelity'],
        accounts: [],
      },
    ];

    const mockImports: ImportRecord[] = [
      {
        id: 'imp_1',
        institution: 'Schwab',
        accountId: 'acc_schwab',
        maskedAccount: '***-1111',
        createdAt: '2026-10-01T10:00:00Z',
        status: 'committed',
        positionCount: 10,
        storagePaths: ['path/1.png'],
        approvedExtraction: { institution: 'Schwab', account: '***-1111', positions: [] },
      },
      {
        id: 'imp_2',
        institution: 'Fidelity',
        accountId: 'acc_fidelity',
        maskedAccount: '***-2222',
        createdAt: '2026-10-05T10:00:00Z',
        status: 'committed',
        positionCount: 15,
        storagePaths: ['path/2.png'],
        approvedExtraction: { institution: 'Fidelity', account: '***-2222', positions: [] },
      },
    ];

    it('filters and deletes snapshots within a selected date range', async () => {
      let deletedIds: string[] = [];
      const fakeStore: PortfolioStore = {
        async listAccounts() { return []; },
        async commitAccountAndImport() {},
        async deleteAccounts() {},
        async listSnapshots() { return mockSnapshots; },
        async deleteSnapshots(uid, ids) { deletedIds = ids; },
      };

      // Range: 2026-10-01 to 2026-10-03 (should delete snap_1 only)
      const count = await deleteSnapshotsHistory(fakeStore, 'uid_1', 'range', '2026-10-01', '2026-10-03');
      expect(count).toBe(1);
      expect(deletedIds).toEqual(['snap_1']);
    });

    it('deletes all snapshots when scope is all', async () => {
      let deletedIds: string[] = [];
      const fakeStore: PortfolioStore = {
        async listAccounts() { return []; },
        async commitAccountAndImport() {},
        async deleteAccounts() {},
        async listSnapshots() { return mockSnapshots; },
        async deleteSnapshots(uid, ids) { deletedIds = ids; },
      };

      const count = await deleteSnapshotsHistory(fakeStore, 'uid_1', 'all');
      expect(count).toBe(3);
      expect(deletedIds).toEqual(['snap_1', 'snap_2', 'snap_3']);
    });

    it('filters and deletes upload audit records within a selected date range', async () => {
      let deletedIds: string[] = [];
      const fakeStore: PortfolioStore = {
        async listAccounts() { return []; },
        async commitAccountAndImport() {},
        async deleteAccounts() {},
        async listImports() { return mockImports; },
        async deleteImports(uid, ids) { deletedIds = ids; },
      };

      const count = await deleteUploadsHistory(fakeStore, 'uid_1', 'range', '2026-10-04', '2026-10-06');
      expect(count).toBe(1);
      expect(deletedIds).toEqual(['imp_2']);
    });
  });
});
