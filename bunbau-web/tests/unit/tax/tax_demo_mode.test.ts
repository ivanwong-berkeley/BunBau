import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompleteTaxYearReturn } from '../../../src/lib/tax/models';
import { DEMO_TAX_RETURNS, DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

// Mock in-memory storage for localStorage
const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
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
});

// Mock firebase
vi.mock('../../../src/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockRejectedValue(new Error('Unit test offline')),
  getDocs: vi.fn().mockRejectedValue(new Error('Unit test offline')),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { taxStore } from '../../../src/lib/tax/taxStore';

describe('Tax Expert: Dynamic Demo vs. Live Mode & Ingestion State Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Activates Demo Mode by default when zero tax returns are uploaded', async () => {
    const uid = 'test_user_demo';
    const list = await taxStore.listTaxReturns(uid);

    expect(list.length).toBe(0);
    // When list is empty, activeTaxReturns defaults to DEMO_TAX_RETURNS
    const isTaxDemo = list.length === 0;
    const activeReturns = isTaxDemo ? DEMO_TAX_RETURNS : list;

    expect(isTaxDemo).toBe(true);
    expect(activeReturns.length).toBe(6);
    expect(activeReturns[0].profile.primaryTaxpayer.name).toBe('Alex Taylor');
    expect(activeReturns[1].profile.spouseTaxpayer?.name).toBe('Jordan Taylor');
  });

  it('2. Transitions from Demo Mode to Live Tax Mode upon uploading a tax return', async () => {
    const uid = 'test_user_live';

    // Mock user-uploaded 2025 return
    const customUserReturn: CompleteTaxYearReturn = {
      ...DEMO_TAX_RETURN_2025,
      profile: {
        ...DEMO_TAX_RETURN_2025.profile,
        primaryTaxpayer: {
          ...DEMO_TAX_RETURN_2025.profile.primaryTaxpayer,
          name: 'Jane Doe',
        },
      },
      federal: {
        ...DEMO_TAX_RETURN_2025.federal,
        w2Wages: 250000,
        agi: 275000,
      },
      pdfDocumentMetadata: {
        fileName: '2025_Jane_Doe_Return.pdf',
        totalPages: 32,
        fileSizeBytes: 1845000,
        sha256Hash: 'sha256_custom_test_hash_123',
        uploadedAt: new Date().toISOString(),
        pageBookmarks: {},
      },
    };

    // Save uploaded return
    await taxStore.saveTaxReturn(uid, customUserReturn);

    // List user returns
    const userReturns = await taxStore.listTaxReturns(uid);
    expect(userReturns.length).toBe(1);

    const isTaxDemo = userReturns.length === 0;
    const activeReturns = isTaxDemo ? DEMO_TAX_RETURNS : userReturns;

    expect(isTaxDemo).toBe(false);
    expect(activeReturns.length).toBe(1);
    expect(activeReturns[0].profile.primaryTaxpayer.name).toBe('Jane Doe');
    expect(activeReturns[0].federal.w2Wages).toBe(250000);
    expect(activeReturns[0].pdfDocumentMetadata.fileName).toBe('2025_Jane_Doe_Return.pdf');
  });

  it('3. Reverts cleanly to Demo Mode when user resets or clears tax returns', async () => {
    const uid = 'test_user_reset';

    // 1. Initially upload 2 returns
    await taxStore.saveTaxReturn(uid, DEMO_TAX_RETURN_2024);
    await taxStore.saveTaxReturn(uid, DEMO_TAX_RETURN_2025);

    let returns = await taxStore.listTaxReturns(uid);
    expect(returns.length).toBe(2);

    // 2. User clicks "Reset to Demo" -> clearAllTaxReturns
    await taxStore.clearAllTaxReturns(uid, [2024, 2025]);

    returns = await taxStore.listTaxReturns(uid);
    expect(returns.length).toBe(0);

    const isTaxDemo = returns.length === 0;
    const activeReturns = isTaxDemo ? DEMO_TAX_RETURNS : returns;

    expect(isTaxDemo).toBe(true);
    expect(activeReturns.length).toBe(6);
    expect(activeReturns[0].profile.primaryTaxpayer.name).toBe('Alex Taylor');
  });

  it('4. Guarantees runtime uploaded data does not mutate synthetic demo seed fixtures', () => {
    expect(DEMO_TAX_RETURN_2024.profile.primaryTaxpayer.name).toBe('Alex Taylor');
    expect(DEMO_TAX_RETURN_2025.profile.spouseTaxpayer?.name).toBe('Jordan Taylor');
    expect(DEMO_TAX_RETURN_2025.profile.cpaPreparer?.name).toBe('Pacific Bay Tax Advisors');
    expect(DEMO_TAX_RETURN_2025.federal.rentalProperties[0].address).toContain('3343 Los Prados');
  });
});
