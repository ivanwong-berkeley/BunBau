'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { CanonicalAccount, CanonicalPosition, ExtractionResult, PortfolioSnapshot, ImportRecord } from '../lib/portfolio/types';
import { buildSeedAccounts } from '../lib/portfolio/seed';
import { flattenPositions, institutionsOf, netWorth } from '../lib/portfolio/selectors';
import { commitImport, deleteAccounts, DeleteMode, CommitResult } from '../lib/portfolio/commit';
import { healAccounts } from '../lib/portfolio/adapter';
import { firestoreStore } from '../lib/portfolio/firestoreStore';

interface PortfolioContextType {
  /** Real accounts only (empty in demo mode). */
  accounts: CanonicalAccount[];
  /** Positions every page should render: real data, or the demo seed when the user has none. */
  positions: CanonicalPosition[];
  /** True only when loading finished and the user has zero accounts. Seed is never mixed with real data. */
  isDemo: boolean;
  loading: boolean;
  institutions: string[];
  snapshots: PortfolioSnapshot[];
  imports: ImportRecord[];
  refresh: () => Promise<void>;
  importExtraction: (extraction: ExtractionResult, files?: File[]) => Promise<CommitResult>;
  removeAccounts: (mode: DeleteMode, institution?: string) => Promise<number>;
  removeSnapshots: (scope: import('../lib/portfolio/deletePhrase').HistoryDeleteScope, fromDate?: string, toDate?: string) => Promise<number>;
  removeUploads: (scope: import('../lib/portfolio/deletePhrase').HistoryDeleteScope, fromDate?: string, toDate?: string) => Promise<number>;
  captureSnapshot: () => Promise<PortfolioSnapshot>;
}

const PortfolioContext = createContext<PortfolioContextType>({} as PortfolioContextType);

const explain = (e: any): Error => {
  if (e?.code === 'permission-denied') {
    return new Error('Firebase permission denied. Publish the latest firestore.rules (and storage.rules) in the Firebase console.');
  }
  return e instanceof Error ? e : new Error('Unexpected portfolio error.');
};

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<CanonicalAccount[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setSnapshots([]);
      setImports([]);
      setFetched(true);
      return;
    }
    setFetching(true);
    try {
      const accts = await firestoreStore.listAccounts(user.uid);
      const healedAccts = healAccounts(accts);
      setAccounts(healedAccts);
      if (firestoreStore.listSnapshots) {
        try {
          const snaps = await firestoreStore.listSnapshots(user.uid);
          setSnapshots(snaps);
        } catch (err) {
          console.error('Failed to load snapshots', err);
        }
      }
      if (firestoreStore.listImports) {
        try {
          const imps = await firestoreStore.listImports(user.uid);
          setImports(imps);
        } catch (err) {
          console.error('Failed to load imports', err);
        }
      }
    } catch (e: any) {
      console.error('Failed to load portfolio', e);
      setAccounts([]);
    } finally {
      setFetching(false);
      setFetched(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setFetched(false);
    refresh();
  }, [authLoading, refresh]);

  const loading = authLoading || fetching || !fetched;
  const isDemo = !loading && accounts.length === 0;

  const positions = useMemo(
    () => (isDemo ? flattenPositions(buildSeedAccounts()) : flattenPositions(accounts)),
    [isDemo, accounts]
  );

  const importExtraction = useCallback(
    async (extraction: ExtractionResult, files?: File[]) => {
      if (!user) throw new Error('Please sign in before importing.');
      try {
        const result = await commitImport(firestoreStore, user.uid, extraction, { files });
        await refresh();
        return result;
      } catch (e) {
        throw explain(e);
      }
    },
    [user, refresh]
  );

  const removeAccounts = useCallback(
    async (mode: DeleteMode, institution?: string) => {
      if (!user) throw new Error('Please sign in first.');
      try {
        const n = await deleteAccounts(firestoreStore, user.uid, mode, institution);
        await refresh();
        return n;
      } catch (e) {
        throw explain(e);
      }
    },
    [user, refresh]
  );

  const captureSnapshot = useCallback(async (): Promise<PortfolioSnapshot> => {
    if (!user) throw new Error('Please sign in to capture a snapshot.');
    if (accounts.length === 0) {
      throw new Error('Cannot capture snapshot in Demo Mode. Please import your brokerage statement first.');
    }
    if (!firestoreStore.createSnapshot) {
      throw new Error('Snapshot storage is not configured.');
    }

    const now = new Date();
    const snapshotId = `snap_${now.getTime()}`;
    const currentPositions = flattenPositions(accounts);
    const snapshot: PortfolioSnapshot = {
      id: snapshotId,
      createdAt: now.toISOString(),
      totalNetWorth: netWorth(currentPositions),
      positionsCount: currentPositions.length,
      accountsCount: accounts.length,
      institutions: institutionsOf(accounts),
      accounts,
    };

    try {
      await firestoreStore.createSnapshot(user.uid, snapshot);
      setSnapshots((prev) => [snapshot, ...prev]);
      return snapshot;
    } catch (e) {
      throw explain(e);
    }
  }, [user, accounts]);

  const removeSnapshots = useCallback(
    async (scope: import('../lib/portfolio/deletePhrase').HistoryDeleteScope, fromDate?: string, toDate?: string) => {
      if (!user) throw new Error('Please sign in first.');
      try {
        const { deleteSnapshotsHistory } = await import('../lib/portfolio/commit');
        const count = await deleteSnapshotsHistory(firestoreStore, user.uid, scope, fromDate, toDate);
        await refresh();
        return count;
      } catch (e) {
        throw explain(e);
      }
    },
    [user, refresh]
  );

  const removeUploads = useCallback(
    async (scope: import('../lib/portfolio/deletePhrase').HistoryDeleteScope, fromDate?: string, toDate?: string) => {
      if (!user) throw new Error('Please sign in first.');
      try {
        const { deleteUploadsHistory } = await import('../lib/portfolio/commit');
        const count = await deleteUploadsHistory(firestoreStore, user.uid, scope, fromDate, toDate);
        await refresh();
        return count;
      } catch (e) {
        throw explain(e);
      }
    },
    [user, refresh]
  );

  return (
    <PortfolioContext.Provider
      value={{
        accounts,
        positions,
        isDemo,
        loading,
        institutions: institutionsOf(accounts),
        snapshots,
        imports,
        refresh,
        importExtraction,
        removeAccounts,
        removeSnapshots,
        removeUploads,
        captureSnapshot,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);
