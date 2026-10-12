import { describe, it, expect } from 'vitest';
import { parseCSV, cleanNumeric } from '../../../src/lib/ingestion/adapters/csvParser';

describe('CSV Parser & Financial Numeric Cleanser', () => {
  it('correctly handles quoted fields with commas and newlines', () => {
    const raw = `Account,Name,Description,Value\n` +
      `"1234","Brokerage","Apple, Inc., Tech giant","$150,000.00"\n` +
      `"5678","IRA","Line 1\nLine 2","$25,500.50"`;

    const parsed = parseCSV(raw);
    expect(parsed.headers).toEqual(['Account', 'Name', 'Description', 'Value']);
    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0][2]).toBe('Apple, Inc., Tech giant');
    expect(parsed.rows[0][3]).toBe('$150,000.00');
    expect(parsed.rows[1][2]).toBe('Line 1\nLine 2');
  });

  it('correctly cleans accounting negative parentheses and dollar signs', () => {
    expect(cleanNumeric('($78.00)')).toBe(-78.0);
    expect(cleanNumeric('"($5,791.34)"')).toBe(-5791.34);
    expect(cleanNumeric('(120.50)')).toBe(-120.5);
    expect(cleanNumeric('$100,098.97')).toBe(100098.97);
    expect(cleanNumeric('"$434,329.97 "')).toBe(434329.97);
    expect(cleanNumeric('117.67%')).toBe(117.67);
    expect(cleanNumeric('--')).toBe(0);
    expect(cleanNumeric('')).toBe(0);
    expect(cleanNumeric(undefined)).toBe(0);
  });
});
