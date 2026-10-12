import { CanonicalAccount, ImportRecord } from '../../src/lib/portfolio/types';
import { PortfolioStore } from '../../src/lib/portfolio/commit';

/** In-memory PortfolioStore fake used by unit tests. */
export function makeMemoryStore(opts: { failUploads?: boolean } = {}) {
  const accounts = new Map<string, CanonicalAccount>(); // key: uid/accountId
  const imports: ImportRecord[] = [];
  const uploaded: string[] = [];
  const snapshots = new Map<string, import('../../src/lib/portfolio/types').PortfolioSnapshot>(); // key: uid/snapId
  const store: PortfolioStore = {
    async listAccounts(uid) {
      return [...accounts.entries()].filter(([k]) => k.startsWith(uid + '/')).map(([, v]) => v);
    },
    async commitAccountAndImport(uid, account, record) {
      accounts.set(`${uid}/${account.id}`, account);
      imports.push(record);
    },
    async deleteAccounts(uid, ids) {
      ids.forEach((id) => accounts.delete(`${uid}/${id}`));
    },
    async uploadImage(uid, importId, index) {
      if (opts.failUploads) throw Object.assign(new Error('nope'), { code: 'storage/unauthorized' });
      const p = `users/${uid}/imports/${importId}/${index + 1}.png`;
      uploaded.push(p);
      return p;
    },
    async createSnapshot(uid, snapshot) {
      snapshots.set(`${uid}/${snapshot.id}`, snapshot);
    },
    async listSnapshots(uid) {
      return [...snapshots.entries()]
        .filter(([k]) => k.startsWith(uid + '/'))
        .map(([, v]) => v)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
  };
  return { store, accounts, imports, uploaded, snapshots };

}
