import { describe, it, expect } from 'vitest';
import { normalizeExtraction, ExtractionError } from '../../../src/lib/extraction/normalize';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('WeBull Account Detection & Fallback Resolution', () => {
  const samplePositions = [
    { symbol: 'SOFI', value: 1567.0, quantity: 100, category: 'Stock' },
    { symbol: 'MCD', value: 1800.0, quantity: 6.02179, category: 'Stock' },
  ];

  it('successfully resolves account from filename metadata when model returns "Not visible"', () => {
    const rawFromGemini = {
      institution: 'WeBull',
      account: 'Not visible', // Gemini couldn't find printed digits on mobile UI
      accountType: 'Individual Cash',
      positions: samplePositions,
    };

    const fileName = 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png';
    const meta = parseFilenameMetadata(fileName);

    const result = normalizeExtraction(rawFromGemini, {
      institution: meta.institution,
      account: meta.accountRaw,
      accountType: meta.accountType,
    });

    expect(result.institution).toBe('WeBull');
    expect(result.account).toBe('***-XLW4');
    expect(result.positions).toHaveLength(2);
  });

  it('successfully resolves account for Rollover IRA when model returns "unknown"', () => {
    const rawFromGemini = {
      institution: 'UNKNOWN',
      account: 'unknown',
      positions: samplePositions,
    };

    const fileName = 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png';
    const meta = parseFilenameMetadata(fileName);

    const result = normalizeExtraction(rawFromGemini, {
      institution: meta.institution,
      account: meta.accountRaw,
      accountType: meta.accountType,
    });

    expect(result.institution).toBe('WeBull');
    expect(result.account).toBe('***-QSX4');
    expect(result.positions).toHaveLength(2);
  });

  it('falls back to sanitized accountType when neither digits nor filename metadata are available', () => {
    const rawFromGemini = {
      institution: 'WeBull',
      account: 'N/A',
      accountType: 'Rollover IRA',
      positions: samplePositions,
    };

    const result = normalizeExtraction(rawFromGemini);

    expect(result.institution).toBe('WeBull');
    expect(result.account).toBe('***-ROLL');
    expect(result.positions).toHaveLength(2);
  });

  it('throws an error only if both model and hints fail to identify account or positions', () => {
    const rawEmpty = {
      institution: 'WeBull',
      account: 'unknown',
      positions: [],
    };

    expect(() => normalizeExtraction(rawEmpty)).toThrowError(ExtractionError);
  });
});
