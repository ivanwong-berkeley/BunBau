import { describe, it, expect } from 'vitest';
import {
  expectedTaxDeletePhrase,
  matchesTaxDeletePhrase,
  TaxDeleteScope,
} from '../../../src/lib/tax/taxDeletePhrase';

describe('Tax History Deletion Safety Confirmation Phrases (Milestone v6.5)', () => {
  it('1. Generates and matches "Delete all tax history"', () => {
    const phrase = expectedTaxDeletePhrase('all');
    expect(phrase).toBe('Delete all tax history');
    expect(matchesTaxDeletePhrase('Delete all tax history', 'all')).toBe(true);
    expect(matchesTaxDeletePhrase('delete all tax history', 'all')).toBe(false); // Case sensitive
    expect(matchesTaxDeletePhrase('Delete all tax history ', 'all')).toBe(false); // No trailing space
  });

  it('2. Generates and matches "Delete <Year> tax history"', () => {
    const phrase2024 = expectedTaxDeletePhrase('single', 2024);
    expect(phrase2024).toBe('Delete 2024 tax history');
    expect(matchesTaxDeletePhrase('Delete 2024 tax history', 'single', 2024)).toBe(true);
    expect(matchesTaxDeletePhrase('Delete 2025 tax history', 'single', 2024)).toBe(false);
  });

  it('3. Generates and matches "Delete from <FromYear> to <ToYear> history"', () => {
    const phraseRange = expectedTaxDeletePhrase('range', undefined, 2020, 2023);
    expect(phraseRange).toBe('Delete from 2020 to 2023 history');
    expect(matchesTaxDeletePhrase('Delete from 2020 to 2023 history', 'range', undefined, 2020, 2023)).toBe(true);
    expect(matchesTaxDeletePhrase('Delete from 2020 to 2024 history', 'range', undefined, 2020, 2023)).toBe(false);
  });

  it('4. Rejects empty, null, or partial inputs', () => {
    expect(matchesTaxDeletePhrase('', 'all')).toBe(false);
    expect(matchesTaxDeletePhrase('Delete', 'all')).toBe(false);
    expect(matchesTaxDeletePhrase('Delete all', 'all')).toBe(false);
  });
});
