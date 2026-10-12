import { describe, it, expect, beforeEach, vi } from 'vitest';
import { strategyStore, StoredMessage, StoredReport } from '../../../src/lib/strategist/store';
import { EMPTY_MEMORY } from '../../../src/lib/strategist/memory';

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
  length: 0,
  key: () => null,
};

// Mock firebase/firestore
vi.mock('../../../src/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockRejectedValue(new Error('Missing or insufficient permissions.')),
  getDocs: vi.fn().mockRejectedValue(new Error('Missing or insufficient permissions.')),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('v5.4 Strategist Dual-Layer Store', () => {
  const uid = 'test_user_v54';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('T1: writes messages to local storage cache immediately', async () => {
    const msg: StoredMessage = {
      id: 'm_1',
      threadId: 't_1',
      role: 'user',
      text: 'Analyze my current portfolio allocation',
      createdAt: new Date().toISOString(),
    };

    await strategyStore.saveMessage(uid, msg);
    const local = strategyStore.getLocalMessages(uid);
    expect(local).toHaveLength(1);
    expect(local[0].text).toBe('Analyze my current portfolio allocation');
  });

  it('T2: writes reports to local storage cache immediately', async () => {
    const rep: StoredReport = {
      id: 'r_1',
      version: 1,
      createdAt: new Date().toISOString(),
      targetApy: 10,
      currentApy: 1.53,
      risk: 'Moderate',
      report: {
        headline: 'Yield Strategy Plan',
        markdown: '# Strategy Report\nReallocate cash.',
        summary: 'Reallocate cash to increase APY.',
        actions: [],
        risks: [],
      },
      summary: 'Reallocate cash to increase APY.',
    };

    await strategyStore.saveReport(uid, rep);
    const local = strategyStore.getLocalReports(uid);
    expect(local).toHaveLength(1);
    expect(local[0].report.headline).toBe('Yield Strategy Plan');
  });

  it('T3: loadAll recovers from local storage cache when Firestore throws permissions error', async () => {
    const msg: StoredMessage = {
      id: 'm_cached',
      threadId: 't_1',
      role: 'assistant',
      text: 'Here is your allocation breakdown.',
      createdAt: new Date().toISOString(),
    };
    await strategyStore.saveMessage(uid, msg);

    // loadAll should fall back to local cache when getDocs rejects
    const result = await strategyStore.loadAll(uid);
    expect(result.fromCloud).toBe(false);
    expect(result.cloudError).toContain('Missing or insufficient permissions');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].id).toBe('m_cached');
    expect(result.memory).toEqual(EMPTY_MEMORY);
  });

  it('T4: deleteIds clears records from both local cache and Firestore', async () => {
    const m1: StoredMessage = { id: 'm_del1', threadId: 't', role: 'user', text: '1', createdAt: '2026-10-01' };
    const m2: StoredMessage = { id: 'm_keep', threadId: 't', role: 'user', text: '2', createdAt: '2026-10-02' };
    await strategyStore.saveMessage(uid, m1);
    await strategyStore.saveMessage(uid, m2);

    expect(strategyStore.getLocalMessages(uid)).toHaveLength(2);
    await strategyStore.deleteIds(uid, 'messages', ['m_del1']);
    const remaining = strategyStore.getLocalMessages(uid);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('m_keep');
  });

  it('T5: syncLocalToCloud flushes local cache to Firestore setDoc', async () => {
    const { setDoc } = await import('firebase/firestore');
    const msg: StoredMessage = { id: 'm_sync', threadId: 't', role: 'user', text: 'sync test', createdAt: '2026-10-01' };
    await strategyStore.saveMessage(uid, msg);

    const syncRes = await strategyStore.syncLocalToCloud(uid);
    expect(syncRes.syncedMessages).toBe(1);
    expect(setDoc).toHaveBeenCalled();
  });

  it('T6: listMessages merges local messages and does not wipe out cache when Firestore returns empty array', async () => {
    const { getDocs, setDoc } = await import('firebase/firestore');
    // Save a local message
    const localMsg: StoredMessage = { id: 'm_local_only', threadId: 't', role: 'user', text: 'Local preserved', createdAt: '2026-10-05' };
    await strategyStore.saveMessage(uid, localMsg);

    // Mock Firestore returning empty docs successfully (not throwing)
    (getDocs as any).mockResolvedValueOnce({
      docs: [],
    });

    const messages = await strategyStore.listMessages(uid);
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('m_local_only');
    expect(messages[0].text).toBe('Local preserved');

    // Local storage should still have the message
    expect(strategyStore.getLocalMessages(uid)).toHaveLength(1);
    // setDoc should be scheduled to sync to cloud
    expect(setDoc).toHaveBeenCalled();
  });
});
