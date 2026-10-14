'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { CompleteTaxYearReturn } from '../lib/tax/models';
import { DEMO_TAX_RETURNS, DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from '../lib/tax/seedData';
import { taxStore } from '../lib/tax/taxStore';
import { resolveLiveTaxpayerProfile } from '../lib/tax/taxProfileHelper';

export interface TaxContextType {
  /** Real user-uploaded returns only (empty array in demo mode). */
  taxReturns: CompleteTaxYearReturn[];
  /** Returns rendered across the application: user-uploaded live data if present, or DEMO_TAX_RETURNS when empty. */
  activeTaxReturns: CompleteTaxYearReturn[];
  /** Chronologically sorted returns (ascending by taxYear). */
  sortedTaxReturns: CompleteTaxYearReturn[];
  /** Latest available return chronologically (e.g. 2025 or future 2026). */
  latestTaxReturn: CompleteTaxYearReturn;
  /** Prior return immediately preceding latestTaxReturn for comparative audits (e.g. 2024). */
  previousTaxReturn: CompleteTaxYearReturn;
  /** Active 2024 return (either user uploaded or demo fixture). */
  activeReturn2024: CompleteTaxYearReturn;
  /** Active 2025 return (either user uploaded or demo fixture). */
  activeReturn2025: CompleteTaxYearReturn;
  /** True strictly when not loading and the user has zero uploaded tax returns. */
  isTaxDemo: boolean;
  /** True while loading user returns from Firestore or auth state. */
  taxLoading: boolean;
  /** Import or save an ingested tax return. */
  importTaxReturn: (taxReturn: CompleteTaxYearReturn) => Promise<void>;
  /** Import multiple tax returns incrementally. */
  importTaxReturnsBatch: (returns: CompleteTaxYearReturn[]) => Promise<void>;
  /** Delete a specific tax return year. */
  removeTaxReturn: (year: number) => Promise<void>;
  /** Delete a specific list or range of tax return years. */
  deleteTaxReturnYears: (years: number[]) => Promise<void>;
  /** Clear all uploaded tax returns, immediately reverting back to Demo Mode. */
  clearTaxReturns: () => Promise<void>;
  /** Re-fetch returns from store. */
  refreshTaxReturns: () => Promise<void>;
}

const TaxContext = createContext<TaxContextType>({} as TaxContextType);

export const TaxProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [taxReturns, setTaxReturns] = useState<CompleteTaxYearReturn[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);

  const refreshTaxReturns = useCallback(async () => {
    if (!user) {
      setTaxReturns([]);
      setFetched(true);
      return;
    }
    setFetching(true);
    try {
      const returns = await taxStore.listTaxReturns(user.uid);
      setTaxReturns(returns);
    } catch (err) {
      console.error('Failed to load user tax returns:', err);
      setTaxReturns([]);
    } finally {
      setFetching(false);
      setFetched(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setFetched(false);
    refreshTaxReturns();
  }, [authLoading, refreshTaxReturns]);

  const taxLoading = authLoading || fetching || !fetched;
  const isTaxDemo = !taxLoading && taxReturns.length === 0;

  const activeTaxReturns = useMemo(() => {
    if (isTaxDemo) return DEMO_TAX_RETURNS;
    return taxReturns.map((ret) => {
      const isTaylorPrimary = ret.profile?.primaryTaxpayer?.name?.toLowerCase().includes('taylor');
      const isTaylorSpouse = ret.profile?.spouseTaxpayer?.name?.toLowerCase().includes('taylor');
      if (isTaylorPrimary || isTaylorSpouse || !ret.profile?.primaryTaxpayer?.name) {
        return {
          ...ret,
          profile: resolveLiveTaxpayerProfile(user, ret.profile, ret.pdfDocumentMetadata?.fileName),
        };
      }
      return ret;
    });
  }, [isTaxDemo, taxReturns, user]);

  const sortedTaxReturns = useMemo(() => {
    return [...activeTaxReturns].sort((a, b) => a.taxYear - b.taxYear);
  }, [activeTaxReturns]);

  const latestTaxReturn = useMemo(() => {
    if (sortedTaxReturns.length > 0) {
      return sortedTaxReturns[sortedTaxReturns.length - 1];
    }
    return DEMO_TAX_RETURN_2025;
  }, [sortedTaxReturns]);

  const previousTaxReturn = useMemo(() => {
    if (sortedTaxReturns.length >= 2) {
      return sortedTaxReturns[sortedTaxReturns.length - 2];
    }
    if (sortedTaxReturns.length === 1) {
      return sortedTaxReturns[0];
    }
    return DEMO_TAX_RETURN_2024;
  }, [sortedTaxReturns]);

  const activeReturn2024 = useMemo(() => {
    const found = activeTaxReturns.find((r) => r.taxYear === 2024);
    if (found) return found;
    if (isTaxDemo) return DEMO_TAX_RETURN_2024;
    return previousTaxReturn;
  }, [activeTaxReturns, isTaxDemo, previousTaxReturn]);

  const activeReturn2025 = useMemo(() => {
    const found = activeTaxReturns.find((r) => r.taxYear === 2025);
    if (found) return found;
    if (isTaxDemo) return DEMO_TAX_RETURN_2025;
    return latestTaxReturn;
  }, [activeTaxReturns, isTaxDemo, latestTaxReturn]);

  const importTaxReturn = useCallback(
    async (uploadedReturn: CompleteTaxYearReturn) => {
      if (!user) throw new Error('Please sign in to upload tax returns.');
      const sanitized = {
        ...uploadedReturn,
        profile: resolveLiveTaxpayerProfile(user, uploadedReturn.profile, uploadedReturn.pdfDocumentMetadata?.fileName),
      };
      await taxStore.saveTaxReturn(user.uid, sanitized);
      await refreshTaxReturns();
    },
    [user, refreshTaxReturns]
  );

  const importTaxReturnsBatch = useCallback(
    async (newReturns: CompleteTaxYearReturn[]) => {
      if (!user) throw new Error('Please sign in to upload tax returns.');
      const sanitizedBatch = newReturns.map((r) => ({
        ...r,
        profile: resolveLiveTaxpayerProfile(user, r.profile, r.pdfDocumentMetadata?.fileName),
      }));
      await taxStore.saveTaxReturnsIncremental(user.uid, sanitizedBatch);
      await refreshTaxReturns();
    },
    [user, refreshTaxReturns]
  );

  const removeTaxReturn = useCallback(
    async (year: number) => {
      if (!user) throw new Error('Please sign in to manage tax returns.');
      await taxStore.deleteTaxReturn(user.uid, year);
      await refreshTaxReturns();
    },
    [user, refreshTaxReturns]
  );

  const deleteTaxReturnYears = useCallback(
    async (years: number[]) => {
      if (!user) throw new Error('Please sign in to manage tax returns.');
      await taxStore.deleteTaxReturnYears(user.uid, years);
      await refreshTaxReturns();
    },
    [user, refreshTaxReturns]
  );

  const clearTaxReturns = useCallback(async () => {
    if (!user) {
      setTaxReturns([]);
      return;
    }
    const years = taxReturns.map((r) => r.taxYear);
    await taxStore.clearAllTaxReturns(user.uid, years);
    setTaxReturns([]);
    await refreshTaxReturns();
  }, [user, taxReturns, refreshTaxReturns]);

  return (
    <TaxContext.Provider
      value={{
        taxReturns,
        activeTaxReturns,
        sortedTaxReturns,
        latestTaxReturn,
        previousTaxReturn,
        activeReturn2024,
        activeReturn2025,
        isTaxDemo,
        taxLoading,
        importTaxReturn,
        importTaxReturnsBatch,
        removeTaxReturn,
        deleteTaxReturnYears,
        clearTaxReturns,
        refreshTaxReturns,
      }}
    >
      {children}
    </TaxContext.Provider>
  );
};

export const useTax = () => useContext(TaxContext);
export const useTaxContext = useTax;
