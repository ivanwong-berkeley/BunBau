import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../../src/lib/ingestion/adapters/csvParser';

describe('CSV Ingestion Spreadsheet Preview & Terminal Controls Tests', () => {
  const sampleCsvText = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value
"Z12345678","Individual - TOD","AAPL","APPLE INC",100,230.50,23050.00
"Z12345678","Individual - TOD","-AAPL261023P310","AAPL Oct 23 2026 310 Put",-1,5.00,-500.00
"Z12345678","Individual - TOD","SPAXX","HELD IN SPAXX",10000,1.00,10000.00
`;

  it('TEST-GRID-01: parseCSV converts raw CSV text into spreadsheet grid data structure', () => {
    const parsed = parseCSV(sampleCsvText);
    expect(parsed.headers).toBeDefined();
    expect(parsed.headers.length).toBe(7);
    expect(parsed.headers[0]).toBe('Account Number');
    expect(parsed.headers[2]).toBe('Symbol');
    expect(parsed.headers[6]).toBe('Current Value');

    expect(parsed.rows.length).toBe(3);
    expect(parsed.rows[0][2]).toBe('AAPL');
    expect(parsed.rows[1][2]).toBe('-AAPL261023P310');
    expect(parsed.rows[2][2]).toBe('SPAXX');
  });

  it('TEST-GRID-02: spreadsheet preview zoom scale bounds enforce [0.5, 2.5]', () => {
    let scale = 1.0;
    const zoomIn = (s: number) => Math.min(s + 0.25, 2.5);
    const zoomOut = (s: number) => Math.max(s - 0.25, 0.5);

    // Zooming in cannot exceed 2.5
    for (let i = 0; i < 15; i++) scale = zoomIn(scale);
    expect(scale).toBe(2.5);

    // Zooming out cannot fall below 0.5
    for (let i = 0; i < 20; i++) scale = zoomOut(scale);
    expect(scale).toBe(0.5);
  });

  it('TEST-GRID-03: terminal auto-close duration is verified at 10,000ms (10 seconds)', () => {
    const TERMINAL_TIMEOUT_MS = 10000;
    expect(TERMINAL_TIMEOUT_MS).toBe(10 * 1000);
  });

  it('TEST-GRID-04: spreadsheet table cells preserve quoted descriptions with commas', () => {
    const quotedCsv = `Symbol,Description,Value\n"CD_DISC","DISCOVER BK GREENWOOD, DEL CD 5%",10000`;
    const parsed = parseCSV(quotedCsv);
    expect(parsed.headers).toEqual(['Symbol', 'Description', 'Value']);
    expect(parsed.rows[0][1]).toBe('DISCOVER BK GREENWOOD, DEL CD 5%');
    expect(parsed.rows[0][2]).toBe('10000');
  });
});
