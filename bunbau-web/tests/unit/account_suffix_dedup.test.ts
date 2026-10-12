import { describe, it, expect } from 'vitest';
import { extractAccountSuffix, normaliseMask, accountIdFor } from '../../src/lib/portfolio/accountId';
import { commitImport } from '../../src/lib/portfolio/commit';
import { makeMemoryStore } from './memoryStore';
import { ExtractionResult } from '../../src/lib/portfolio/types';

describe('Account Suffix Dedup & Zero-Doubling Identity Engine', () => {
  it('extracts trailing 4 digits consistently across diverse brokerage account masks', () => {
    // CSV format: full account number
    expect(extractAccountSuffix('Z12346238')).toBe('6238');
    // UI screenshot format: truncated masked string
    expect(extractAccountSuffix('Individual - TOD ...6238')).toBe('6238');
    expect(extractAccountSuffix('***-6238')).toBe('6238');
    expect(extractAccountSuffix('6238')).toBe('6238');
    expect(extractAccountSuffix('Fidelity 6238')).toBe('6238');
    expect(extractAccountSuffix('Schwab ...9812')).toBe('9812');
  });

  it('guarantees identical deterministic accountId for CSV and Screenshot of the same account', () => {
    const uid = 'user_abc123';
    const csvAccountId = accountIdFor(uid, 'Fidelity Investments', 'Z12346238');
    const screenshotAccountId = accountIdFor(uid, 'Fidelity', 'Individual - TOD ...6238');
    const maskedAccountId = accountIdFor(uid, 'FIDELITY', '***-6238');

    // All must generate the exact same MD5 document ID
    expect(csvAccountId).toBe(screenshotAccountId);
    expect(csvAccountId).toBe(maskedAccountId);
  });

  it('cleans up legacy duplicate account records in commitImport when migrating to suffix identity', () => {
    const { store } = makeMemoryStore();
    const uid = 'user_legacy_test';

    // Simulate an old duplicate document created before suffix normalization (e.g. key based on full string)
    const legacyAccountId = 'legacy_fake_id_from_raw_string';
    store.commitAccountAndImport(
      uid,
      {
        id: legacyAccountId,
        institution: 'Fidelity',
        maskedAccount: 'Z12346238',
        accountType: 'Brokerage',
        positions: [
          {
            id: 'pos_1',
            symbol: 'AAPL',
            name: 'Apple Inc',
            assetClass: 'Stock',
            quantity: 100,
            marketValue: 24000,
            institution: 'Fidelity',
            accountId: legacyAccountId,
          },
        ],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'imp_1',
        institution: 'Fidelity',
        accountId: legacyAccountId,
        maskedAccount: 'Z12346238',
        createdAt: new Date().toISOString(),
        status: 'committed',
        positionCount: 1,
        approvedExtraction: {} as any,
      }
    );

    // Verify 1 legacy account exists
    return store.listAccounts(uid).then(async (accountsBefore) => {
      expect(accountsBefore).toHaveLength(1);
      expect(accountsBefore[0].id).toBe(legacyAccountId);

      // Now commit a new extraction with screenshot mask "...6238"
      const newExtraction: ExtractionResult = {
        institution: 'Fidelity',
        account: 'Individual - TOD ...6238',
        portfolioTotal: 25000,
        unsettledCash: 1000,
        positions: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc',
            category: 'Stock',
            value: 25000,
            quantity: 100,
            price: 250,
          },
        ],
      };

      const result = await commitImport(store, uid, newExtraction);

      // Verify the canonical accountId is used
      expect(result.accountId).toBe(accountIdFor(uid, 'Fidelity', '6238'));

      // Verify store now has ONLY ONE account (the stale legacy account was purged!)
      const accountsAfter = await store.listAccounts(uid);
      expect(accountsAfter).toHaveLength(1);
      expect(accountsAfter[0].id).toBe(result.accountId);
      expect(accountsAfter[0].positions[0].marketValue).toBe(25000);
    });
  });
});
