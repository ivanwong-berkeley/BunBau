import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { PortfolioStore } from './commit';
import { CanonicalAccount, ImportRecord } from './types';

/** Firestore rejects `undefined` field values; drop them. */
export const stripUndefined = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const firestoreStore: PortfolioStore = {
  async listAccounts(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'accounts'));
    return snap.docs.map((d) => d.data() as CanonicalAccount);
  },

  async commitAccountAndImport(uid, account: CanonicalAccount, record: ImportRecord) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'accounts', account.id), stripUndefined(account));
    batch.set(doc(db, 'users', uid, 'imports', record.id), stripUndefined(record));
    await batch.commit();
  },

  async deleteAccounts(uid, accountIds) {
    const batch = writeBatch(db);
    accountIds.forEach((id) => batch.delete(doc(db, 'users', uid, 'accounts', id)));
    await batch.commit();
  },

  async uploadImage(uid, importId, index, file) {
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `users/${uid}/imports/${importId}/${index + 1}.${ext}`;
    await uploadBytes(ref(storage, path), file);
    return path;
  },

  async createSnapshot(uid, snapshot) {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', uid, 'snapshots', snapshot.id), stripUndefined(snapshot));
  },

  async listSnapshots(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'snapshots'));
    const list = snap.docs.map((d) => d.data() as import('./types').PortfolioSnapshot);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async deleteSnapshots(uid, snapshotIds) {
    const batch = writeBatch(db);
    snapshotIds.forEach((id) => batch.delete(doc(db, 'users', uid, 'snapshots', id)));
    await batch.commit();
  },

  async listImports(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'imports'));
    const list = snap.docs.map((d) => d.data() as ImportRecord);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async deleteImports(uid, importIds) {
    const batch = writeBatch(db);
    importIds.forEach((id) => batch.delete(doc(db, 'users', uid, 'imports', id)));
    await batch.commit();
  },

  async purgeLegacyPortfolio(uid) {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'portfolios', uid));
    } catch {
      // Non-blocking if already removed or permission restricted
    }
  },
};
