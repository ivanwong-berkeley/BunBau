/**
 * Deterministic Composite Key Generation for Accounts and Positions
 * Location: src/lib/ingestion/keys.ts
 */

import { computeMd5 } from './hasher';

/**
 * Generates deterministic accountKey = MD5(userId + institutionNormalized + accountMaskedNumber)
 */
export function generateAccountKey(
  userId: string,
  institution: string,
  accountMaskedNumber: string
): string {
  const normUid = (userId || 'default_user').trim().toLowerCase();
  const normInst = (institution || 'Unknown').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const digits = (accountMaskedNumber || '0000').replace(/[^a-zA-Z0-9]/g, '');
  const maskedSuffix = digits.slice(-4) || '0000';

  const rawKey = `${normUid}_${normInst}_${maskedSuffix}`;
  return `acc_${computeMd5(rawKey).slice(0, 16)}`;
}

/**
 * Generates deterministic positionKey = MD5(accountKey + symbolNormalized + assetCategory + (expiryOrMaturity || "NA"))
 */
export function generatePositionKey(
  accountKey: string,
  symbol: string,
  assetCategory: string,
  maturityOrExpiryDate?: string
): string {
  const normSymbol = (symbol || 'UNKNOWN').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normCat = (assetCategory || 'Stock').trim();
  const dateKey = maturityOrExpiryDate ? maturityOrExpiryDate.trim() : 'NA';

  const rawKey = `${accountKey}_${normSymbol}_${normCat}_${dateKey}`;
  return `pos_${computeMd5(rawKey).slice(0, 16)}`;
}
