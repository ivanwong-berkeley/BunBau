import { describe, it, expect, vi } from 'vitest';
import { commitImport } from '../../../src/lib/portfolio/commit';
import { ExtractionResult } from '../../../src/lib/portfolio/types';

describe('Storage Isolation & Vision Queue Unit Tests', () => {
  it('strictly filters out non-image files (.csv, .xlsx) from Storage upload during commitImport', async () => {
    const mockStore: any = {
      uploadImage: vi.fn().mockResolvedValue('gs://bucket/test.png'),
      commitAccountAndImport: vi.fn().mockResolvedValue(undefined),
      listAccounts: vi.fn().mockResolvedValue([]),
    };

    const extraction: ExtractionResult = {
      institution: 'Fidelity',
      account: 'X24336238',
      asOfDate: '2026-10-07',
      positions: [
        {
          symbol: 'NVDA',
          description: 'NVIDIA CORP',
          category: 'Stock',
          assetClass: 'Stock',
          quantity: 10,
          costBasis: 100,
          currentPrice: 120,
          marketValue: 1200,
        },
      ],
    };

    // Create fake CSV and Excel File objects
    const csvFile = new File(['symbol,qty\nNVDA,10'], 'Fidelity_Positions.csv', { type: 'text/csv' });
    const xlsxFile = new File([new ArrayBuffer(100)], 'Citi_Summary.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await commitImport(
      mockStore,
      'user_123',
      extraction,
      { files: [csvFile, xlsxFile] }
    );

    // mockStore.uploadImage must NOT have been called for non-image files
    expect(mockStore.uploadImage).not.toHaveBeenCalled();
    expect(result.record.storagePaths).toEqual([]);
    expect(result.record.storageErrors).toBeUndefined();
  });

  it('allows image files (screenshots) to upload to Storage during commitImport', async () => {
    const mockStore: any = {
      uploadImage: vi.fn().mockResolvedValue('gs://bucket/screenshot.png'),
      commitAccountAndImport: vi.fn().mockResolvedValue(undefined),
      listAccounts: vi.fn().mockResolvedValue([]),
    };

    const extraction: ExtractionResult = {
      institution: 'WeBull',
      account: 'CUX5XLW4',
      asOfDate: '2026-10-07',
      positions: [
        {
          symbol: 'AAPL',
          description: 'APPLE INC',
          category: 'Stock',
          assetClass: 'Stock',
          quantity: 5,
          currentPrice: 200,
          marketValue: 1000,
        },
      ],
    };

    const imageFile = new File([new ArrayBuffer(500)], 'webull_screenshot.png', { type: 'image/png' });
    const csvFile = new File(['dummy'], 'data.csv', { type: 'text/csv' });

    const result = await commitImport(
      mockStore,
      'user_123',
      extraction,
      { files: [imageFile, csvFile] }
    );

    // Only imageFile should be uploaded
    expect(mockStore.uploadImage).toHaveBeenCalledTimes(1);
    expect(mockStore.uploadImage).toHaveBeenCalledWith('user_123', expect.any(String), 0, imageFile);
    expect(result.record.storagePaths).toEqual(['gs://bucket/screenshot.png']);
  });

  it('validates multi-screenshot staging queue logic: supports multiple items, deduplication, and removal', () => {
    const file1 = new File(['image1'], 'screenshot1.png', { type: 'image/png' });
    const file2 = new File(['image2'], 'screenshot2.png', { type: 'image/png' });
    const file1Duplicate = new File(['image1'], 'screenshot1.png', { type: 'image/png' });

    let stagedFiles: File[] = [];

    // Helper imitating addScreenshotsToStage
    const addScreenshots = (incoming: File[]) => {
      const imagesOnly = incoming.filter((f) => f.type.startsWith('image/'));
      const unique = imagesOnly.filter(
        (newF) => !stagedFiles.some((ex) => ex.name === newF.name && ex.size === newF.size)
      );
      stagedFiles = [...stagedFiles, ...unique];
    };

    // Add first batch
    addScreenshots([file1, file2]);
    expect(stagedFiles.length).toBe(2);
    expect(stagedFiles[0].name).toBe('screenshot1.png');
    expect(stagedFiles[1].name).toBe('screenshot2.png');

    // Add duplicate
    addScreenshots([file1Duplicate]);
    expect(stagedFiles.length).toBe(2);

    // Remove file at index 0
    stagedFiles = stagedFiles.filter((_, idx) => idx !== 0);
    expect(stagedFiles.length).toBe(1);
    expect(stagedFiles[0].name).toBe('screenshot2.png');

    // Clear all
    stagedFiles = [];
    expect(stagedFiles.length).toBe(0);
  });
});
