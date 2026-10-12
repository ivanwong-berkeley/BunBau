export type DeleteScope = 'entire' | 'institution';

/** Exact phrase the user must type before a delete is enabled. */
export function expectedDeletePhrase(mode: DeleteScope, institution?: string): string {
  return mode === 'entire' ? 'Delete the entire portfolio' : `Delete all ${institution ?? ''} accounts`;
}

/** Strict match: case-sensitive, no trimming. */
export function matchesDeletePhrase(input: string, mode: DeleteScope, institution?: string): boolean {
  return input === expectedDeletePhrase(mode, institution);
}

export type HistoryDeleteScope = 'all' | 'range';

export function expectedHistoryDeletePhrase(scope: HistoryDeleteScope, fromDate?: string, toDate?: string): string {
  if (scope === 'all') return 'Delete all the history';
  return `Delete the selected history from ${fromDate ?? ''} to ${toDate ?? ''}`;
}

export function matchesHistoryDeletePhrase(input: string, scope: HistoryDeleteScope, fromDate?: string, toDate?: string): boolean {
  return input === expectedHistoryDeletePhrase(scope, fromDate, toDate);
}
