import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCSV } from '../../../src/lib/ingestion/adapters/csvParser';
import { extractRowsFromCsvString } from '../../../src/lib/ingestion/adapters/citiXlsxAdapter';

describe('Raw Grid Column Expansion & Horizontal Scroll Verification', () => {
  const sampleCitiCsv = `,,,,,,,,,,,,,,,,,,,,,,
,Holdings,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Account Number: CZ5009836,,,,,,,,,,,,,,,,,,,,,
,IBD: C01,,,,,,,,,,,,,,,,,,,,,
,"Total Market Value: $101,226.25",,,,,,,,,,,,,,,,,,,,,
,"Investment Funds: $101,213.57",,,,,,,,,,,,,,,,,,,,,
,"Cash, Money Funds and Bank Deposits: $12.68",,,,,,,,,,,,,,,,,,,,,
,Holdings as of : 10/11/2026,,,,,,,,,,,,,,,,,,,,,
,All Values are in : USD,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Security ID,CUSIP,Account Number,Account Nickname/Title,Description,Asset Classification,Quantity,Custodian,Price,Price as of Date,Timezone,Change Price Amount,Change Price %,Market Value,Market Value Change,Gain/Loss $,Gain/Loss %,Activity Date,Accrued Interest,Dividend Reinvestment,Market,Sub-Asset Classification
,SGOV,46436E718,CZ5009836,,ISHARES TR ISHARES 0-3 MNTH TREAS BD ETF,Investment Funds,1007,Pershing LLC,100.51,2026-10-09 00:00:00,ET,0,0,101213.57,0,-184.65,-0.0018,2026-10-07,0,Cash,NYSE,Exchange-Traded Funds
,WAGA,PER981443,CZ5009836,,WESTERN ASSET GOVT MONEY MARKET CLASS A,"Cash, Money Funds and Bank Deposits",12.68,Pershing LLC,1,2026-10-09 00:00:00,ET,0,0,12.68,0,0,0,2026-10-09,0,,OTC,Money Market Funds
`;

  it('TEST-GRID-EXP-01: parseCSV identifies the 23-column table header despite 11 preceding metadata rows', () => {
    const parsed = parseCSV(sampleCitiCsv);

    // Verify all 23 columns are preserved
    expect(parsed.headers.length).toBe(23);
    expect(parsed.headers[1]).toBe('Security ID');
    expect(parsed.headers[2]).toBe('CUSIP');
    expect(parsed.headers[3]).toBe('Account Number');
    expect(parsed.headers[5]).toBe('Description');
    expect(parsed.headers[6]).toBe('Asset Classification');
    expect(parsed.headers[7]).toBe('Quantity');
    expect(parsed.headers[9]).toBe('Price');
    expect(parsed.headers[14]).toBe('Market Value');
    expect(parsed.headers[22]).toBe('Sub-Asset Classification');
  });

  it('TEST-GRID-EXP-02: data rows are padded up to maxCols (23 columns) so no data to the right is lost', () => {
    const parsed = parseCSV(sampleCitiCsv);
    expect(parsed.rows.length).toBe(2);

    for (const row of parsed.rows) {
      expect(row.length).toBe(23);
    }

    const sgovRow = parsed.rows[0];
    expect(sgovRow[1]).toBe('SGOV');
    expect(sgovRow[2]).toBe('46436E718');
    expect(sgovRow[5]).toBe('ISHARES TR ISHARES 0-3 MNTH TREAS BD ETF');
    expect(sgovRow[7]).toBe('1007');
    expect(sgovRow[9]).toBe('100.51');
    expect(sgovRow[14]).toBe('101213.57');
  });

  it('TEST-GRID-EXP-03: Excel SheetJS rawJson expands to maxCols and identifies best candidate header row', () => {
    const sheetData = extractRowsFromCsvString(sampleCitiCsv);
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const rawJson: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const maxCols = Math.max(1, ...rawJson.map((r: any[]) => (Array.isArray(r) ? r.length : 0)));
    expect(maxCols).toBe(23);

    // Header detection scoring
    let bestHeaderRow: any[] | null = null;
    let bestScore = -1;

    for (let r = 0; r < Math.min(rawJson.length, 30); r++) {
      const rCells = rawJson[r] || [];
      const joined = rCells.map((c: any) => String(c ?? '').toLowerCase()).join(' ');
      let score = 0;
      if (joined.includes('security id') || joined.includes('symbol')) score += 3;
      if (joined.includes('description')) score += 2;
      if (joined.includes('market value')) score += 3;
      if (joined.includes('price')) score += 2;
      if (joined.includes('quantity')) score += 2;
      if (joined.includes('account number')) score += 1;
      if (joined.includes('cusip')) score += 2;
      const nonEmptyCount = rCells.filter((c: any) => String(c ?? '').trim().length > 0).length;
      if (nonEmptyCount >= 3) score += nonEmptyCount;

      if (score > bestScore) {
        bestScore = score;
        bestHeaderRow = rCells;
      }
    }

    expect(bestHeaderRow).toBeDefined();
    expect(bestHeaderRow![1]).toBe('Security ID');

    // Build rawGridHeaders
    const rawGridHeaders: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const hVal = bestHeaderRow && bestHeaderRow[c] !== undefined ? String(bestHeaderRow[c]).trim() : '';
      rawGridHeaders.push(hVal || `Col ${c + 1}`);
    }

    expect(rawGridHeaders.length).toBe(23);
    expect(rawGridHeaders[1]).toBe('Security ID');
    expect(rawGridHeaders[14]).toBe('Market Value');
  });
});
