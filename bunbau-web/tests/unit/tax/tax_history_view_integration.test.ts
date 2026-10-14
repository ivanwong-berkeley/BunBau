import { describe, it, expect, vi } from 'vitest';
import {
  expectedTaxDeletePhrase,
  matchesTaxDeletePhrase,
  TaxDeleteScope,
} from '../../../src/lib/tax/taxDeletePhrase';
import {
  expectedHistoryDeletePhrase,
  matchesHistoryDeletePhrase,
  HistoryDeleteScope,
} from '../../../src/lib/portfolio/deletePhrase';

describe('Tax vs Portfolio Deletion Phrase Isolation', () => {
  it('strictly validates all 3 required tax delete phrases', () => {
    // 1. All tax history
    const allPhrase = expectedTaxDeletePhrase('all');
    expect(allPhrase).toBe('Delete all tax history');
    expect(matchesTaxDeletePhrase('Delete all tax history', 'all')).toBe(true);
    expect(matchesTaxDeletePhrase('delete all tax history', 'all')).toBe(false); // Case sensitive
    expect(matchesTaxDeletePhrase('Delete all history', 'all')).toBe(false);

    // 2. Single year tax history
    const singlePhrase = expectedTaxDeletePhrase('single', 2024);
    expect(singlePhrase).toBe('Delete 2024 tax history');
    expect(matchesTaxDeletePhrase('Delete 2024 tax history', 'single', 2024)).toBe(true);
    expect(matchesTaxDeletePhrase('Delete 2025 tax history', 'single', 2024)).toBe(false);

    // 3. Multi-year range tax history
    const rangePhrase = expectedTaxDeletePhrase('range', undefined, 2020, 2023);
    expect(rangePhrase).toBe('Delete from 2020 to 2023 history');
    expect(matchesTaxDeletePhrase('Delete from 2020 to 2023 history', 'range', undefined, 2020, 2023)).toBe(true);
    expect(matchesTaxDeletePhrase('Delete from 2020 to 2024 history', 'range', undefined, 2020, 2023)).toBe(false);
  });

  it('guarantees portfolio history delete phrases remain independent and unregressed', () => {
    // Portfolio delete phrases use different format and tokens
    const portAllPhrase = expectedHistoryDeletePhrase('all');
    expect(portAllPhrase).toBe('Delete all the history');
    expect(matchesHistoryDeletePhrase('Delete all the history', 'all')).toBe(true);

    const portRangePhrase = expectedHistoryDeletePhrase('range', '2024-01-01', '2024-12-31');
    expect(portRangePhrase).toBe('Delete the selected history from 2024-01-01 to 2024-12-31');
    expect(matchesHistoryDeletePhrase('Delete the selected history from 2024-01-01 to 2024-12-31', 'range', '2024-01-01', '2024-12-31')).toBe(true);

    // Cross-contamination test: Tax phrase must fail portfolio validation
    expect(matchesHistoryDeletePhrase('Delete all tax history', 'all')).toBe(false);
    expect(matchesHistoryDeletePhrase('Delete 2024 tax history', 'all')).toBe(false);

    // Portfolio phrase must fail tax validation
    expect(matchesTaxDeletePhrase('Delete all the history', 'all')).toBe(false);
    expect(matchesTaxDeletePhrase('Delete the selected history from 2024-01-01 to 2024-12-31', 'all')).toBe(false);
  });
});
