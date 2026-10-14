import { collection, doc, getDocs, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CompleteTaxYearReturn } from './models';

/** Strip undefined fields since Firestore rejects them. */
export const stripUndefined = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const getLocalCacheKey = (uid: string) => `bunbau_tax_returns_${uid}`;

const hasLocalStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export const sanitizeStoredTaxReturn = (ret: CompleteTaxYearReturn): CompleteTaxYearReturn => {
  if (!ret || !ret.federal) return ret;
  if (Array.isArray(ret.federal.rentalProperties)) {
    ret.federal.rentalProperties = ret.federal.rentalProperties.map((p) => {
      if (p.address && p.address.includes('Evergreen')) {
        return { ...p, address: '3343 Los Prados, San Mateo, CA 94403' };
      }
      return p;
    });
  }
  return ret;
};

export const taxStore = {
  /**
   * List all stored tax returns for a given user.
   * Tries Firestore first, falls back to localStorage if offline/empty, and caches to localStorage.
   */
  async listTaxReturns(uid: string): Promise<CompleteTaxYearReturn[]> {
    if (!uid) return [];
    try {
      if (db && Object.keys(db).length > 0) {
        const snap = await getDocs(collection(db, 'users', uid, 'taxReturns'));
        if (snap && !snap.empty) {
          const list = snap.docs.map((d) => sanitizeStoredTaxReturn(d.data() as CompleteTaxYearReturn));
          const sorted = list.sort((a, b) => a.taxYear - b.taxYear);
          if (hasLocalStorage()) {
            try {
              localStorage.setItem(getLocalCacheKey(uid), JSON.stringify(sorted));
            } catch {}
          }
          return sorted;
        }
      }
    } catch (err) {
      // Offline / permission denied / unit test mock -> check local cache
    }

    // Local storage fallback
    if (hasLocalStorage()) {
      try {
        const cached = localStorage.getItem(getLocalCacheKey(uid));
        if (cached) {
          const parsed = JSON.parse(cached) as CompleteTaxYearReturn[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(sanitizeStoredTaxReturn).sort((a, b) => a.taxYear - b.taxYear);
          }
        }
      } catch {}
    }

    return [];
  },

  /**
   * Save a completed tax return for a specific year.
   */
  async saveTaxReturn(uid: string, taxReturn: CompleteTaxYearReturn): Promise<void> {
    if (!uid) return;
    const sanitized = stripUndefined(taxReturn);

    // Save to Firestore if available
    try {
      if (db && Object.keys(db).length > 0) {
        await setDoc(doc(db, 'users', uid, 'taxReturns', String(taxReturn.taxYear)), sanitized);
      }
    } catch (err) {
      // Local cache handles offline storage
    }

    // Always update local cache
    if (hasLocalStorage()) {
      try {
        const cached = localStorage.getItem(getLocalCacheKey(uid));
        const list: CompleteTaxYearReturn[] = cached ? JSON.parse(cached) : [];
        const index = list.findIndex((r) => r.taxYear === taxReturn.taxYear);
        if (index >= 0) {
          list[index] = sanitized;
        } else {
          list.push(sanitized);
        }
        localStorage.setItem(getLocalCacheKey(uid), JSON.stringify(list));
      } catch (err) {
        console.warn('Failed to update local storage tax cache:', err);
      }
    }
  },

  /**
   * Delete a single tax return year.
   */
  async deleteTaxReturn(uid: string, year: number): Promise<void> {
    if (!uid) return;
    try {
      if (db && Object.keys(db).length > 0) {
        await deleteDoc(doc(db, 'users', uid, 'taxReturns', String(year)));
      }
    } catch (err) {
      // Offline fallback
    }

    if (hasLocalStorage()) {
      try {
        const cached = localStorage.getItem(getLocalCacheKey(uid));
        if (cached) {
          const list: CompleteTaxYearReturn[] = JSON.parse(cached);
          const filtered = list.filter((r) => r.taxYear !== year);
          localStorage.setItem(getLocalCacheKey(uid), JSON.stringify(filtered));
        }
      } catch {}
    }
  },

  /**
   * Save multiple tax returns incrementally without dropping existing history years.
   */
  async saveTaxReturnsIncremental(uid: string, newReturns: CompleteTaxYearReturn[]): Promise<void> {
    if (!uid || newReturns.length === 0) return;
    for (const r of newReturns) {
      await this.saveTaxReturn(uid, r);
    }
  },

  /**
   * Delete a specific set/range of tax return years.
   */
  async deleteTaxReturnYears(uid: string, years: number[]): Promise<void> {
    if (!uid || years.length === 0) return;
    try {
      if (db && Object.keys(db).length > 0) {
        const batch = writeBatch(db);
        years.forEach((y) => {
          batch.delete(doc(db, 'users', uid, 'taxReturns', String(y)));
        });
        await batch.commit();
      }
    } catch (err) {}

    if (hasLocalStorage()) {
      try {
        const cached = localStorage.getItem(getLocalCacheKey(uid));
        if (cached) {
          const list: CompleteTaxYearReturn[] = JSON.parse(cached);
          const yearSet = new Set(years);
          const filtered = list.filter((r) => !yearSet.has(r.taxYear));
          localStorage.setItem(getLocalCacheKey(uid), JSON.stringify(filtered));
        }
      } catch {}
    }
  },

  /**
   * Clear all user-uploaded tax returns (reverting the user cleanly to Demo Mode).
   */
  async clearAllTaxReturns(uid: string, existingYears: number[]): Promise<void> {
    if (!uid) return;
    try {
      if (db && existingYears.length > 0) {
        const batch = writeBatch(db);
        existingYears.forEach((year) => {
          batch.delete(doc(db, 'users', uid, 'taxReturns', String(year)));
        });
        await batch.commit();
      }
    } catch (err) {
      // Offline fallback
    }

    if (hasLocalStorage()) {
      try {
        localStorage.removeItem(getLocalCacheKey(uid));
      } catch {}
    }
  },
};
