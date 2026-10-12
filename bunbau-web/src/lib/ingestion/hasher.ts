/**
 * Binary & Content Hash Utilities (SHA-256)
 * Location: src/lib/ingestion/hasher.ts
 */

import { createHash } from 'crypto';

/**
 * Computes SHA-256 hex digest of a string or Buffer.
 */
export function computeSha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Computes MD5 hex digest for composite keys.
 */
export function computeMd5(content: string): string {
  return createHash('md5').update(content).digest('hex');
}
