import { describe, it, expect } from 'vitest';
import { accountIdFor } from '../../src/lib/portfolio/accountId';
import { commitImport, deleteAccounts } from '../../src/lib/portfolio/commit';
import { expectedDeletePhrase, matchesDeletePhrase } from '../../src/lib/portfolio/deletePhrase';
import { MOCK_FIDELITY_EXTRACTION, MOCK_SCHWAB_EXTRACTION } from '../../src/lib/portfolio/mockExtraction';
import { makeMemoryStore } from './memoryStore';

const UID = 'user-A';

describe('account id', () => {
  it('U-06 @R-32 md5(uid+inst+mask) is deterministic and mask/case/space-normalised', () => {
    const a = accountIdFor(UID, 'Fidelity', '***-6238');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(accountIdFor(UID, ' fidelity ', '***-6238')).toBe(a);
    expect(accountIdFor(UID, 'Fidelity', 'XXX-6238')).toBe(a);
    expect(accountIdFor(UID, 'Fidelity', '***-9999')).not.toBe(a);
    expect(accountIdFor('user-B', 'Fidelity', '***-6238')).not.toBe(a);
  });
});

describe('safe per-account import', () => {
  it('I-01 @R-32 Fidelity then Schwab keep BOTH; re-import Fidelity replaces only Fidelity', async () => {
    const { store, accounts, imports } = makeMemoryStore();
    await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION);
    await commitImport(store, UID, MOCK_SCHWAB_EXTRACTION);
    expect(accounts.size).toBe(2);

    const changed = { ...MOCK_FIDELITY_EXTRACTION, positions: MOCK_FIDELITY_EXTRACTION.positions.slice(0, 3) };
    await commitImport(store, UID, changed);
    expect(accounts.size).toBe(2); // no duplicate doc, nothing destroyed
    const list = await store.listAccounts(UID);
    expect(list.find((a) => a.institution === 'Fidelity')!.positions).toHaveLength(3);
    expect(list.find((a) => a.institution === 'Schwab')!.positions).toHaveLength(3);
    expect(imports).toHaveLength(3); // audit record per import
  });

  it('writes the import audit record with counts and mask', async () => {
    const { store, imports } = makeMemoryStore();
    const r = await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION, { newId: () => 'imp-1' });
    expect(r.importId).toBe('imp-1');
    expect(imports[0]).toMatchObject({ id: 'imp-1', institution: 'Fidelity', positionCount: 15, status: 'committed' });
    expect((await store.listAccounts(UID))[0].lastImportId).toBe('imp-1');
  });

  it('uploads screenshots and records storage paths', async () => {
    const { store, uploaded } = makeMemoryStore();
    const r = await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION, {
      files: [new Blob(['a']), new Blob(['b'])],
      newId: () => 'imp-2',
    });
    expect(uploaded).toHaveLength(2);
    expect(r.record.storagePaths).toEqual(['users/user-A/imports/imp-2/1.png', 'users/user-A/imports/imp-2/2.png']);
  });

  it('storage failure does not block the import but is recorded', async () => {
    const { store, accounts } = makeMemoryStore({ failUploads: true });
    const r = await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION, { files: [new Blob(['a'])] });
    expect(accounts.size).toBe(1);
    expect(r.record.storagePaths).toEqual([]);
    expect(r.record.storageErrors?.[0]).toContain('storage/unauthorized');
  });

  it('blocks import when institution, mask or positions are missing', async () => {
    const { store, accounts } = makeMemoryStore();
    await expect(commitImport(store, UID, { ...MOCK_FIDELITY_EXTRACTION, institution: ' ' })).rejects.toThrow(/institution/);
    await expect(commitImport(store, UID, { ...MOCK_FIDELITY_EXTRACTION, account: '' })).rejects.toThrow(/account/);
    await expect(commitImport(store, UID, { ...MOCK_FIDELITY_EXTRACTION, positions: [] })).rejects.toThrow(/positions/);
    expect(accounts.size).toBe(0);
  });

  it("other users' accounts are never touched", async () => {
    const { store } = makeMemoryStore();
    await commitImport(store, 'user-A', MOCK_FIDELITY_EXTRACTION);
    await commitImport(store, 'user-B', MOCK_FIDELITY_EXTRACTION);
    await deleteAccounts(store, 'user-A', 'entire');
    expect(await store.listAccounts('user-A')).toHaveLength(0);
    expect(await store.listAccounts('user-B')).toHaveLength(1);
  });
});

describe('Danger Zone delete', () => {
  it('I-08 @R-35 institution delete removes only that institution', async () => {
    const { store } = makeMemoryStore();
    await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION);
    await commitImport(store, UID, MOCK_SCHWAB_EXTRACTION);
    const n = await deleteAccounts(store, UID, 'institution', 'fidelity');
    expect(n).toBe(1);
    const left = await store.listAccounts(UID);
    expect(left.map((a) => a.institution)).toEqual(['Schwab']);
  });

  it('I-08 @R-35 entire delete wipes accounts but leaves import history', async () => {
    const { store, imports } = makeMemoryStore();
    await commitImport(store, UID, MOCK_FIDELITY_EXTRACTION);
    await commitImport(store, UID, MOCK_SCHWAB_EXTRACTION);
    expect(await deleteAccounts(store, UID, 'entire')).toBe(2);
    expect(await store.listAccounts(UID)).toHaveLength(0);
    expect(imports).toHaveLength(2);
  });

  it('institution mode requires an institution', async () => {
    const { store } = makeMemoryStore();
    await expect(deleteAccounts(store, UID, 'institution')).rejects.toThrow(/Institution/);
  });

  it('U-11 @R-35 delete phrase is exact (case/space strict)', () => {
    expect(expectedDeletePhrase('entire')).toBe('Delete the entire portfolio');
    expect(expectedDeletePhrase('institution', 'Schwab')).toBe('Delete all Schwab accounts');
    expect(matchesDeletePhrase('Delete the entire portfolio', 'entire')).toBe(true);
    expect(matchesDeletePhrase('delete the entire portfolio', 'entire')).toBe(false);
    expect(matchesDeletePhrase('Delete the entire portfolio ', 'entire')).toBe(false);
    expect(matchesDeletePhrase('Delete all Schwab accounts', 'institution', 'Schwab')).toBe(true);
    expect(matchesDeletePhrase('Delete all Schwab accounts', 'institution', 'Fidelity')).toBe(false);
  });
});
