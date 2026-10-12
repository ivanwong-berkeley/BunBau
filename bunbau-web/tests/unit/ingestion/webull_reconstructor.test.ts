import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WebullOrdersAdapter } from '../../../src/lib/ingestion/adapters/webullReconstructor';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('WeBull Order Records Reconstructor with Real Files', () => {
  const cashEquitiesFile = path.resolve(__dirname, '../../fixtures/real_uploads/Webull/CSV/Individual-Cash_CUX5XLW4/Webull_Individual-Cash_CUX5XLW4_Orders_Records_20261007.csv');
  const cashOptionsFile = path.resolve(__dirname, '../../fixtures/real_uploads/Webull/CSV/Individual-Cash_CUX5XLW4/Webull_Individual-Cash_CUX5XLW4_Orders_Records_Options_20261007.csv');

  it('reconstructs open equity positions from Individual Cash order history', () => {
    const rawText = fs.readFileSync(cashEquitiesFile, 'utf-8');
    const meta = parseFilenameMetadata('Webull_Individual-Cash_CUX5XLW4_Orders_Records_20261007.csv');
    const adapter = new WebullOrdersAdapter();
    const result = adapter.parse(rawText, 'demo-user', meta);

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('WeBull');
    expect(account.accountMaskedNumber).toBe('***-XLW4');
    expect(account.extractedAt).toBe('2026-10-07');

    // SOFI buys reconstructed
    const sofiPos = account.positions.find(p => p.symbol === 'SOFI');
    expect(sofiPos).toBeDefined();
    expect(sofiPos?.quantity).toBeGreaterThan(0);
    expect(sofiPos?.costBasis).toBeGreaterThan(0);

    // NVDA buy reconstructed (accumulated filled quantity across all orders)
    const nvdaPos = account.positions.find(p => p.symbol === 'NVDA');
    expect(nvdaPos).toBeDefined();
    expect(nvdaPos?.quantity).toBeCloseTo(0.58678, 4);

    // GOOG buy reconstructed
    const googPos = account.positions.find(p => p.symbol === 'GOOG');
    expect(googPos).toBeDefined();
    expect(googPos?.quantity).toBeGreaterThan(0.08);
  });

  it('reconstructs option positions from Individual Cash options orders history', () => {
    const rawText = fs.readFileSync(cashOptionsFile, 'utf-8');
    const meta = parseFilenameMetadata('Webull_Individual-Cash_CUX5XLW4_Orders_Records_Options_20261007.csv');
    const adapter = new WebullOrdersAdapter();
    const result = adapter.parse(rawText, 'demo-user', meta);

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('WeBull');

    // Filled short call SOFI261009C00021500
    const sofiOpt = account.positions.find(p => p.symbol === 'SOFI261009C00021500');
    expect(sofiOpt).toBeDefined();
    expect(sofiOpt?.assetCategory).toBe('Option');
    expect(sofiOpt?.optionDetails?.underlying).toBe('SOFI');
    expect(sofiOpt?.optionDetails?.strike).toBe(21.5);
    expect(sofiOpt?.optionDetails?.expirationDate).toBe('2026-10-09');
    expect(sofiOpt?.optionDetails?.type).toBe('CALL');
  });
});
