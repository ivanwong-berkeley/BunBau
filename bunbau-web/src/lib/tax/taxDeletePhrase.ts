/**
 * BunBau Tax History Deletion Safety Confirmation Phrase Module (v2.9 / Milestone v6.5)
 * Enforces strict case-sensitive user typing to authorize deletion of tax return history.
 */

export type TaxDeleteScope = 'all' | 'single' | 'range';

/**
 * Exact phrase the user must type before tax history deletion is enabled:
 * - 'all'    -> "Delete all tax history"
 * - 'single' -> "Delete <Year> tax history"
 * - 'range'  -> "Delete from <FromYear> to <ToYear> history"
 */
export function expectedTaxDeletePhrase(
  scope: TaxDeleteScope,
  year?: number,
  fromYear?: number,
  toYear?: number
): string {
  if (scope === 'all') {
    return 'Delete all tax history';
  }
  if (scope === 'single') {
    return `Delete ${year ?? ''} tax history`;
  }
  return `Delete from ${fromYear ?? ''} to ${toYear ?? ''} history`;
}

/**
 * Strict case-sensitive match with no trimming.
 */
export function matchesTaxDeletePhrase(
  input: string,
  scope: TaxDeleteScope,
  year?: number,
  fromYear?: number,
  toYear?: number
): boolean {
  if (!input) return false;
  return input === expectedTaxDeletePhrase(scope, year, fromYear, toYear);
}
