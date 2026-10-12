/**
 * Dual-layer persistence for the strategist:
 * 1. Cloud Firestore: persistent, multi-device under users/{uid}/... protected by firestore.rules
 * 2. LocalStorage Cache: immediate offline mirror so the user never loses messages/reports
 *    even during network disruption or if Firestore rules are pending publication.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { StrategistMemory, EMPTY_MEMORY, capMemory } from './memory';
import { StrategyReport } from './reportSchema';
import { chunk } from './historyOps';

export interface StoredMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  modelTag?: string;
}

export interface StoredReport {
  id: string;
  version: number;
  createdAt: string;
  targetApy: number;
  currentApy: number;
  risk: string;
  modelTag?: string;
  report: StrategyReport;
  summary: string;
}

export interface LoadAllResult {
  messages: StoredMessage[];
  reports: StoredReport[];
  memory: StrategistMemory;
  fromCloud: boolean;
  cloudError?: string;
}

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const messagesCol = (uid: string) => collection(db, 'users', uid, 'strategyMessages');
const reportsCol = (uid: string) => collection(db, 'users', uid, 'strategyReports');
const memoryDoc = (uid: string) => doc(db, 'users', uid, 'strategyMemory', 'current');

// Local storage key helpers
const LS_MESSAGES = (uid: string) => `bunbau_strategy_messages_${uid}`;
const LS_REPORTS = (uid: string) => `bunbau_strategy_reports_${uid}`;
const LS_MEMORY = (uid: string) => `bunbau_strategy_memory_${uid}`;

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
};

function readLocal<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
}


export const strategyStore = {
  // Local storage accessors for testability & offline support
  getLocalMessages(uid: string): StoredMessage[] {
    return readLocal<StoredMessage[]>(LS_MESSAGES(uid), []);
  },
  getLocalReports(uid: string): StoredReport[] {
    return readLocal<StoredReport[]>(LS_REPORTS(uid), []);
  },
  getLocalMemory(uid: string): StrategistMemory {
    return readLocal<StrategistMemory>(LS_MEMORY(uid), EMPTY_MEMORY);
  },

  async saveMessage(uid: string, m: StoredMessage): Promise<void> {
    // 1. Write to local cache first
    const existing = readLocal<StoredMessage[]>(LS_MESSAGES(uid), []);
    const updated = [...existing.filter((x) => x.id !== m.id), m].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    writeLocal(LS_MESSAGES(uid), updated);

    // 2. Sync to Firestore
    await setDoc(doc(messagesCol(uid), m.id), clean(m));
  },

  async listMessages(uid: string): Promise<StoredMessage[]> {
    const local = readLocal<StoredMessage[]>(LS_MESSAGES(uid), []);
    try {
      const s = await getDocs(messagesCol(uid));
      const cloud = s.docs
        .map((d) => d.data() as StoredMessage)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      // Union by ID so local is NEVER wiped out by an empty or partial cloud collection
      const map = new Map<string, StoredMessage>();
      local.forEach((m) => map.set(m.id, m));
      cloud.forEach((m) => map.set(m.id, m));
      const merged = [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      // Auto-upload any local items that don't yet exist in the cloud
      const cloudIds = new Set(cloud.map((c) => c.id));
      const missingInCloud = local.filter((l) => !cloudIds.has(l.id));
      for (const m of missingInCloud) {
        setDoc(doc(messagesCol(uid), m.id), clean(m)).catch(() => {});
      }

      writeLocal(LS_MESSAGES(uid), merged);
      return merged;
    } catch (err: any) {
      console.warn('Firestore listMessages failed, falling back to local cache:', err?.message || err);
      if (local.length > 0) return local;
      throw err;
    }
  },

  async saveReport(uid: string, r: StoredReport): Promise<void> {
    const existing = readLocal<StoredReport[]>(LS_REPORTS(uid), []);
    const updated = [...existing.filter((x) => x.id !== r.id), r].sort((a, b) => a.version - b.version);
    writeLocal(LS_REPORTS(uid), updated);

    await setDoc(doc(reportsCol(uid), r.id), clean(r));
  },

  async updateReport(uid: string, r: StoredReport): Promise<void> {
    return this.saveReport(uid, r);
  },

  async listReports(uid: string): Promise<StoredReport[]> {
    const local = readLocal<StoredReport[]>(LS_REPORTS(uid), []);
    try {
      const s = await getDocs(reportsCol(uid));
      const cloud = s.docs
        .map((d) => d.data() as StoredReport)
        .sort((a, b) => a.version - b.version);

      const map = new Map<string, StoredReport>();
      local.forEach((r) => map.set(r.id, r));
      cloud.forEach((r) => map.set(r.id, r));
      const merged = [...map.values()].sort((a, b) => a.version - b.version);

      const cloudIds = new Set(cloud.map((c) => c.id));
      const missingInCloud = local.filter((l) => !cloudIds.has(l.id));
      for (const r of missingInCloud) {
        setDoc(doc(reportsCol(uid), r.id), clean(r)).catch(() => {});
      }

      writeLocal(LS_REPORTS(uid), merged);
      return merged;
    } catch (err: any) {
      console.warn('Firestore listReports failed, falling back to local cache:', err?.message || err);
      if (local.length > 0) return local;
      throw err;
    }
  },

  async loadMemory(uid: string): Promise<StrategistMemory> {
    const local = readLocal<StrategistMemory>(LS_MEMORY(uid), EMPTY_MEMORY);
    try {
      const s = await getDoc(memoryDoc(uid));
      let mem: StrategistMemory;
      if (s.exists()) {
        mem = capMemory(s.data() as StrategistMemory);
      } else {
        mem = local;
        if (local.goals.length > 0 || local.decisions.length > 0) {
          setDoc(memoryDoc(uid), clean(capMemory(local))).catch(() => {});
        }
      }
      writeLocal(LS_MEMORY(uid), mem);
      return mem;
    } catch (err: any) {
      console.warn('Firestore loadMemory failed, falling back to local cache:', err?.message || err);
      return local;
    }
  },

  async saveMemory(uid: string, m: StrategistMemory): Promise<void> {
    const capped = clean(capMemory(m));
    writeLocal(LS_MEMORY(uid), capped);
    await setDoc(memoryDoc(uid), capped);
  },

  async deleteMemory(uid: string): Promise<void> {
    writeLocal(LS_MEMORY(uid), { ...EMPTY_MEMORY });
    try {
      await deleteDoc(memoryDoc(uid));
    } catch (err) {
      console.warn('Firestore deleteMemory warning:', err);
    }
  },

  async deleteIds(
    uid: string,
    kind: 'messages' | 'reports',
    ids: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<number> {
    // 1. Remove from local cache
    const idSet = new Set(ids);
    if (kind === 'messages') {
      const current = readLocal<StoredMessage[]>(LS_MESSAGES(uid), []);
      writeLocal(LS_MESSAGES(uid), current.filter((m) => !idSet.has(m.id)));
    } else {
      const current = readLocal<StoredReport[]>(LS_REPORTS(uid), []);
      writeLocal(LS_REPORTS(uid), current.filter((r) => !idSet.has(r.id)));
    }

    // 2. Remove from Firestore
    const col = kind === 'messages' ? messagesCol(uid) : reportsCol(uid);
    let done = 0;
    for (const part of chunk(ids)) {
      const batch = writeBatch(db);
      part.forEach((id) => batch.delete(doc(col, id)));
      await batch.commit();
      done += part.length;
      onProgress?.(done, ids.length);
    }
    return done;
  },

  /**
   * Dual-layer loader that tries Firestore first, and gracefully falls back to local cache
   * if permissions are pending or offline.
   */
  async loadAll(uid: string): Promise<LoadAllResult> {
    try {
      const [messages, reports, memory] = await Promise.all([
        this.listMessages(uid),
        this.listReports(uid),
        this.loadMemory(uid),
      ]);
      return { messages, reports, memory, fromCloud: true };
    } catch (err: any) {
      const localMsgs = this.getLocalMessages(uid);
      const localReps = this.getLocalReports(uid);
      const localMem = this.getLocalMemory(uid);
      return {
        messages: localMsgs,
        reports: localReps,
        memory: localMem,
        fromCloud: false,
        cloudError: err?.message || String(err),
      };
    }
  },

  /**
   * Flushes any locally stored items to Firestore (useful when reconnecting or after rules update).
   */
  async syncLocalToCloud(uid: string): Promise<{ syncedMessages: number; syncedReports: number }> {
    const localMsgs = this.getLocalMessages(uid);
    const localReps = this.getLocalReports(uid);
    let syncedMessages = 0;
    let syncedReports = 0;

    for (const m of localMsgs) {
      try {
        await setDoc(doc(messagesCol(uid), m.id), clean(m));
        syncedMessages++;
      } catch {}
    }
    for (const r of localReps) {
      try {
        await setDoc(doc(reportsCol(uid), r.id), clean(r));
        syncedReports++;
      } catch {}
    }
    return { syncedMessages, syncedReports };
  },
};
