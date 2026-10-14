import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';

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

describe('Multi-Year PDF Tax Ingestion & Incremental Retention (Milestone v6.5)', () => {
  const TEST_UID = 'test-multi-year-user-v65';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Generates valid CompleteTaxYearReturn models for arbitrary years with multi-page metadata', () => {
    const return2021 = generateSyntheticTaxReturnForYear(2021, 'Filing_2021_Alex_Taylor.pdf', 3200000);
    expect(return2021.taxYear).toBe(2021);
    expect(return2021.pdfDocumentMetadata.fileName).toBe('Filing_2021_Alex_Taylor.pdf');
    expect(return2021.pdfDocumentMetadata.totalPages).toBeGreaterThanOrEqual(50);
    expect(return2021.federal.w2Wages).toBeGreaterThan(0);
    expect(return2021.totalCombinedTax).toBeGreaterThan(0);
  });

  it('2. Ingests and incrementally persists multi-year returns without overwriting prior history', async () => {
    // Ingest past 3 years (2022, 2023, 2024)
    const return2022 = generateSyntheticTaxReturnForYear(2022);
    const return2023 = generateSyntheticTaxReturnForYear(2023);
    const return2024 = generateSyntheticTaxReturnForYear(2024);

    await taxStore.saveTaxReturnsIncremental(TEST_UID, [return2022, return2023, return2024]);
    let stored = await taxStore.listTaxReturns(TEST_UID);
    expect(stored.length).toBe(3);
    expect(stored.map((r) => r.taxYear)).toEqual([2022, 2023, 2024]);

    // Next year: only upload 2025 return
    const return2025 = generateSyntheticTaxReturnForYear(2025);
    await taxStore.saveTaxReturnsIncremental(TEST_UID, [return2025]);

    stored = await taxStore.listTaxReturns(TEST_UID);
    // Preserves 2022, 2023, 2024 AND includes new 2025!
    expect(stored.length).toBe(4);
    expect(stored.map((r) => r.taxYear)).toEqual([2022, 2023, 2024, 2025]);
  });

  it('3. Deletes a specific range of years while preserving remaining history', async () => {
    const returns = [2020, 2021, 2022, 2023, 2024, 2025].map((y) => generateSyntheticTaxReturnForYear(y));
    await taxStore.saveTaxReturnsIncremental(TEST_UID, returns);

    let stored = await taxStore.listTaxReturns(TEST_UID);
    expect(stored.length).toBe(6);

    // Delete range: 2020 to 2022
    await taxStore.deleteTaxReturnYears(TEST_UID, [2020, 2021, 2022]);

    stored = await taxStore.listTaxReturns(TEST_UID);
    expect(stored.length).toBe(3);
    expect(stored.map((r) => r.taxYear)).toEqual([2023, 2024, 2025]);
  });

  it('4. Clears all tax history cleanly when requested', async () => {
    const returns = [2024, 2025].map((y) => generateSyntheticTaxReturnForYear(y));
    await taxStore.saveTaxReturnsIncremental(TEST_UID, returns);

    await taxStore.clearAllTaxReturns(TEST_UID, [2024, 2025]);
    const stored = await taxStore.listTaxReturns(TEST_UID);
    expect(stored.length).toBe(0);
  });
});
