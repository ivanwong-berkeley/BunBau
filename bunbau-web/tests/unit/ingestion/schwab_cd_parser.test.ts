import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SchwabCSVAdapter } from '../../../src/lib/ingestion/adapters/schwabAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('Schwab Adapter CD Yield and Maturity Date Extraction with Real Files', () => {
  const livingTrustFile = path.resolve(__dirname, '../../fixtures/real_uploads/Schwab/CSV/Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv');
  const rolloverIraFile = path.resolve(__dirname, '../../fixtures/real_uploads/Schwab/CSV/Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv');

  it('extracts NorthPointe Bank 4.05% CD due 12/22/2026 from Living Trust account', () => {
    const rawText = fs.readFileSync(livingTrustFile, 'utf-8');
    const meta = parseFilenameMetadata('Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv');
    const adapter = new SchwabCSVAdapter();
    const result = adapter.parse(rawText, 'demo-user', meta);

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('Charles Schwab');
    expect(account.accountMaskedNumber).toBe('***-0281');
    expect(account.extractedAt).toBe('2026-10-07');
    expect(account.totalValue).toBeCloseTo(85370.14, 2);

    const cdPos = account.positions.find(p => p.symbol === '666613TM6');
    expect(cdPos).toBeDefined();
    expect(cdPos?.assetCategory).toBe('CD');
    expect(cdPos?.maturityDate).toBe('2026-12-22');
    expect(cdPos?.yieldApy).toBe(4.05);
    expect(cdPos?.marketValue).toBeCloseTo(79003.63, 2);
  });

  it('extracts Bank of China 3.85% and City Ntnl Bank 3.85% CDs from Rollover IRA account', () => {
    const rawText = fs.readFileSync(rolloverIraFile, 'utf-8');
    const meta = parseFilenameMetadata('Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv');
    const adapter = new SchwabCSVAdapter();
    const result = adapter.parse(rawText, 'demo-user', meta);

    expect(result.accounts.length).toBe(1);
    const account = result.accounts[0];
    expect(account.institution).toBe('Charles Schwab');
    expect(account.accountMaskedNumber).toBe('***-0673');
    expect(account.totalValue).toBeCloseTo(251246.65, 2);

    // CD 1: Bank of China
    const bocCd = account.positions.find(p => p.symbol === '06428PFF7');
    expect(bocCd).toBeDefined();
    expect(bocCd?.maturityDate).toBe('2026-12-15');
    expect(bocCd?.yieldApy).toBe(3.85);
    expect(bocCd?.marketValue).toBeCloseTo(74975.33, 2);

    // CD 2: City Ntnl Bank
    const cnbCd = account.positions.find(p => p.symbol === '17801DLY0');
    expect(cnbCd).toBeDefined();
    expect(cnbCd?.maturityDate).toBe('2026-12-14');
    expect(cnbCd?.yieldApy).toBe(3.85);
    expect(cnbCd?.marketValue).toBeCloseTo(79974.08, 2);
  });
});
