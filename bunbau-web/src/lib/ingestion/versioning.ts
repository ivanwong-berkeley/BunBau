/**
 * Account Versioning & 1-Click Rollback Engine
 * Location: src/lib/ingestion/versioning.ts
 */

import type {
  CanonicalAccountPayload,
  AccountVersionRecord,
} from '../types/ingestion';

/**
 * Creates an immutable version archive snapshot before applying an update.
 */
export function createVersionSnapshot(
  account: CanonicalAccountPayload,
  ingestionId: string = 'ingest_manual'
): AccountVersionRecord {
  const version = account.version || 1;
  const versionId = `v_${version}_${Date.now()}`;

  return {
    versionId,
    accountKey: account.accountKey,
    version,
    payload: JSON.parse(JSON.stringify(account)),
    ingestionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Rolls back an active account payload to a previous historical version record.
 */
export function rollbackAccountToVersion(
  currentAccount: CanonicalAccountPayload,
  targetVersionRecord: AccountVersionRecord
): CanonicalAccountPayload {
  const restoredPayload = JSON.parse(JSON.stringify(targetVersionRecord.payload)) as CanonicalAccountPayload;

  // The new version of the restored account becomes N + 1
  const nextVersion = (currentAccount.version || 1) + 1;

  return {
    ...restoredPayload,
    version: nextVersion,
    extractedAt: new Date().toISOString(),
    sourceType: 'DUAL',
  };
}
