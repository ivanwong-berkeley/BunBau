import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCitiBalancesWorkbook } from '../../../src/lib/ingestion/adapters/citiXlsxAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('Citi XLSX Balances Summary Adapter with Real Files', () => {
  const brokerageFile = path.resolve(__dirname, '../../fixtures/real_uploads/Citi/CSV/CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx');
  const iraFile = path.resolve(__dirname, '../../fixtures/real_uploads/Citi/CSV/Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx');

  it('parses Citi Brokerage CZ5009836 .xlsx accurately', () => {
    if (!fs.existsSync(brokerageFile)) {
      console.warn('File not found, skipping:', brokerageFile);
      return;
    }

    const buffer = fs.readFileSync(brokerageFile);
    const meta = parseFilenameMetadata('CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx');
    const result = parseCitiBalancesWorkbook(buffer.buffer, meta);

    expect(result.institution).toBe('Citi');
    expect(result.accountNumber).toBe('9836');
    expect(result.accountType).toBe('Brokerage');
    expect(result.asOfDate).toBe('2026-10-07');
    expect(result.totalBalance).toBeCloseTo(101185.96, 2);
    expect(result.cashBalance).toBeCloseTo(12.67, 2);

    const equityPos = result.positions.find(p => p.symbol === 'CITI_HOLDINGS');
    expect(equityPos).toBeDefined();
    expect(equityPos?.marketValue).toBeCloseTo(101173.29, 2);

    // Checksum: cash + equity === total
    expect(result.cashBalance + (equityPos?.marketValue || 0)).toBeCloseTo(result.totalBalance, 2);
  });

  it('parses Citi IRA CZ5009834 .xlsx accurately', () => {
    if (!fs.existsSync(iraFile)) {
      console.warn('File not found, skipping:', iraFile);
      return;
    }

    const buffer = fs.readFileSync(iraFile);
    const meta = parseFilenameMetadata('Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx');
    const result = parseCitiBalancesWorkbook(buffer.buffer, meta);

    expect(result.institution).toBe('Citi');
    expect(result.accountNumber).toBe('9834');
    expect(result.accountType).toBe('Traditional IRA');
    expect(result.asOfDate).toBe('2026-10-07');
    expect(result.totalBalance).toBeCloseTo(200069.68, 2);

    const equityPos = result.positions.find(p => p.symbol === 'CITI_HOLDINGS');
    expect(equityPos).toBeDefined();
    expect(equityPos?.marketValue).toBeCloseTo(199533.42, 2);
  });

  it('parses text-formatted Citi balances table with checksum equality', () => {
    const rawText = `
Balances as of 10/07/2026
Account Number: CZ5009836    in USD
Account Value, 101185.96
Available to Trade, 12.67
Long Market Value, 101173.29
`;
    const result = parseCitiBalancesWorkbook(rawText);
    expect(result.accountNumber).toBe('9836');
    expect(result.asOfDate).toBe('2026-10-07');
    expect(result.totalBalance).toBe(101185.96);
    expect(result.cashBalance).toBe(12.67);
  });
});
