import { accountIdFor, extractAccountSuffix, normaliseInstitution } from './accountId';
import { extractionToPositions } from './adapter';
import { CanonicalAccount, ExtractionResult, ImportRecord } from './types';

/** Persistence boundary. Firestore implementation lives in firestoreStore.ts; tests use an in-memory fake. */
export interface PortfolioStore {
  listAccounts(uid: string): Promise<CanonicalAccount[]>;
  /** Atomically write one account doc and its import record. */
  commitAccountAndImport(uid: string, account: CanonicalAccount, record: ImportRecord): Promise<void>;
  deleteAccounts(uid: string, accountIds: string[]): Promise<void>;
  /** Optional: upload a screenshot, return its storage path. */
  uploadImage?(uid: string, importId: string, index: number, file: Blob & { name?: string }): Promise<string>;
  createSnapshot?(uid: string, snapshot: import('./types').PortfolioSnapshot): Promise<void>;
  listSnapshots?(uid: string): Promise<import('./types').PortfolioSnapshot[]>;
  deleteSnapshots?(uid: string, snapshotIds: string[]): Promise<void>;
  listImports?(uid: string): Promise<ImportRecord[]>;
  deleteImports?(uid: string, importIds: string[]): Promise<void>;
}

export interface CommitOptions {
  files?: (Blob & { name?: string })[];
  now?: Date;
  newId?: () => string;
}

export interface CommitResult {
  accountId: string;
  importId: string;
  account: CanonicalAccount;
  record: ImportRecord;
}

const defaultId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Safe per-account import: replaces ONLY the account identified by md5(uid+institution+mask).
 * Other institutions/accounts are never touched. Screenshot upload failures do not block the import
 * but are recorded on the import record.
 */
export async function commitImport(
  store: PortfolioStore,
  uid: string,
  extraction: ExtractionResult,
  opts: CommitOptions = {}
): Promise<CommitResult> {
  if (!extraction.institution?.trim()) throw new Error('Import blocked: institution is missing.');
  if (!extraction.account?.trim()) throw new Error('Import blocked: masked account is missing.');
  if (!extraction.positions?.length) throw new Error('Import blocked: no positions to import.');

  const now = opts.now ?? new Date();
  const importId = (opts.newId ?? defaultId)();
  const accountId = accountIdFor(uid, extraction.institution, extraction.account);

  // Check for any legacy duplicate account records (e.g. created prior to suffix normalization)
  // that belong to the same institution and suffix but have a different accountId.
  try {
    const existingAccounts = await store.listAccounts(uid);
    const targetSuffix = extractAccountSuffix(extraction.account);
    const targetInst = normaliseInstitution(extraction.institution);
    const staleDuplicateIds = existingAccounts
      .filter((acc) => {
        if (acc.id === accountId) return false;
        return (
          normaliseInstitution(acc.institution) === targetInst &&
          extractAccountSuffix(acc.maskedAccount) === targetSuffix
        );
      })
      .map((acc) => acc.id);
    if (staleDuplicateIds.length > 0) {
      await store.deleteAccounts(uid, staleDuplicateIds);
    }
  } catch (err) {
    console.warn('Non-blocking cleanup of stale duplicate accounts:', err);
  }

  const storagePaths: string[] = [];
  const storageErrors: string[] = [];
  const isImageFile = (f: Blob & { name?: string }) => {
    if (!f) return false;
    const name = f.name?.toLowerCase() || '';
    if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.tsv')) {
      return false;
    }
    if (f.type && !f.type.startsWith('image/')) {
      return false;
    }
    return f.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name) || !f.type;
  };

  const imageFiles = (opts.files || []).filter(isImageFile);
  if (store.uploadImage && imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        storagePaths.push(await store.uploadImage(uid, importId, i, imageFiles[i]));
      } catch (e: any) {
        storageErrors.push(`screenshot ${i + 1}: ${e?.code || e?.message || 'upload failed'}`);
      }
    }
  }

  const account: CanonicalAccount = {
    id: accountId,
    institution: extraction.institution.trim(),
    maskedAccount: extraction.account.trim(),
    accountType: extraction.accountType ?? 'Brokerage',
    positions: extractionToPositions({ ...extraction, institution: extraction.institution.trim() }, accountId),
    lastImportId: importId,
    updatedAt: now.toISOString(),
  };

  const record: ImportRecord = {
    id: importId,
    institution: account.institution,
    accountId,
    maskedAccount: account.maskedAccount,
    createdAt: now.toISOString(),
    status: 'committed',
    positionCount: account.positions.length,
    storagePaths,
    ...(storageErrors.length ? { storageErrors } : {}),
    approvedExtraction: extraction,
  };

  await store.commitAccountAndImport(uid, account, record);
  return { accountId, importId, account, record };
}

export type DeleteMode = 'entire' | 'institution';

/**
 * Danger Zone delete. Removes accounts only; imports/snapshots history is untouched.
 * 'institution' removes only accounts whose institution matches (case-insensitive).
 */
export async function deleteAccounts(
  store: PortfolioStore,
  uid: string,
  mode: DeleteMode,
  institution?: string
): Promise<number> {
  const accounts = await store.listAccounts(uid);
  const targets =
    mode === 'entire'
      ? accounts
      : accounts.filter((a) => a.institution.trim().toLowerCase() === (institution ?? '').trim().toLowerCase());
  if (mode === 'institution' && !institution) throw new Error('Institution is required.');
  if (targets.length) await store.deleteAccounts(uid, targets.map((a) => a.id));
  return targets.length;
}

export async function deleteSnapshotsHistory(
  store: PortfolioStore,
  uid: string,
  scope: import('./deletePhrase').HistoryDeleteScope,
  fromDate?: string,
  toDate?: string
): Promise<number> {
  if (!store.listSnapshots || !store.deleteSnapshots) return 0;
  const list = await store.listSnapshots(uid);
  let targets = list;
  if (scope === 'range') {
    const fromTime = fromDate ? new Date(fromDate).getTime() : 0;
    const toTime = toDate ? new Date(toDate).getTime() + 86400000 : Infinity;
    targets = list.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });
  }
  if (targets.length) {
    await store.deleteSnapshots(uid, targets.map((s) => s.id));
  }
  return targets.length;
}

export async function deleteUploadsHistory(
  store: PortfolioStore,
  uid: string,
  scope: import('./deletePhrase').HistoryDeleteScope,
  fromDate?: string,
  toDate?: string
): Promise<number> {
  if (!store.listImports || !store.deleteImports) return 0;
  const list = await store.listImports(uid);
  let targets = list;
  if (scope === 'range') {
    const fromTime = fromDate ? new Date(fromDate).getTime() : 0;
    const toTime = toDate ? new Date(toDate).getTime() + 86400000 : Infinity;
    targets = list.filter((imp) => {
      const t = new Date(imp.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });
  }
  if (targets.length) {
    await store.deleteImports(uid, targets.map((imp) => imp.id));
  }
  return targets.length;
}
