import { describe, it, expect } from 'vitest';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { resolveAsOfDate } from '../../../src/lib/ingestion/dateResolver';

describe('Filename Metadata Parser', () => {
  it('parses Fidelity Brokerage Oct 7 filename', () => {
    const meta = parseFilenameMetadata('Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv');
    expect(meta.institution).toBe('Fidelity');
    expect(meta.accountType).toBe('Brokerage');
    expect(meta.accountRaw).toBe('X24336238');
    expect(meta.accountSuffix).toBe('6238');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Fidelity Brokerage Oct 6 filename (without institution prefix)', () => {
    const meta = parseFilenameMetadata('Brokerage_X24336238_Portfolio_Positions_Oct-06-2026.csv');
    expect(meta.accountType).toBe('Brokerage');
    expect(meta.accountRaw).toBe('X24336238');
    expect(meta.accountSuffix).toBe('6238');
    expect(meta.asOfDate).toBe('2026-10-06');
  });

  it('parses Fidelity Crypto filename', () => {
    const meta = parseFilenameMetadata('Fidelity_Crypto_7536801059_Portfolio_Positions_Oct-07-2026.csv');
    expect(meta.institution).toBe('Fidelity');
    expect(meta.accountType).toBe('Crypto');
    expect(meta.accountRaw).toBe('7536801059');
    expect(meta.accountSuffix).toBe('1059');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Fidelity Oracle 401(k) filename', () => {
    const meta = parseFilenameMetadata('Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv');
    expect(meta.institution).toBe('Fidelity');
    expect(meta.accountType).toBe('401(k)');
    expect(meta.accountRaw).toBe('35004');
    expect(meta.accountSuffix).toBe('5004');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Fidelity Oracle BrokerageLink sub-account filename', () => {
    const meta = parseFilenameMetadata('Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv');
    expect(meta.institution).toBe('Fidelity');
    expect(meta.accountType).toBe('BrokerageLink');
    expect(meta.accountRaw).toBe('652716847');
    expect(meta.accountSuffix).toBe('6847');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Fidelity Viapath 401(k) filename', () => {
    const meta = parseFilenameMetadata('Fidelity_VIAPATH-401K_32480_Portfolio_Positions_Oct-07-2026.csv');
    expect(meta.institution).toBe('Fidelity');
    expect(meta.accountType).toBe('401(k)');
    expect(meta.accountRaw).toBe('32480');
    expect(meta.accountSuffix).toBe('2480');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Schwab Living Trust filename with dots', () => {
    const meta = parseFilenameMetadata('Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv');
    expect(meta.institution).toBe('Charles Schwab');
    expect(meta.accountType).toBe('Living Trust');
    expect(meta.accountSuffix).toBe('0281');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Schwab Rollover IRA filename with dots', () => {
    const meta = parseFilenameMetadata('Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv');
    expect(meta.institution).toBe('Charles Schwab');
    expect(meta.accountType).toBe('Rollover IRA');
    expect(meta.accountSuffix).toBe('0673');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Citi Brokerage XLSX filename', () => {
    const meta = parseFilenameMetadata('CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx');
    expect(meta.institution).toBe('Citi');
    expect(meta.accountType).toBe('Brokerage');
    expect(meta.accountRaw).toBe('CZ5009836');
    expect(meta.accountSuffix).toBe('9836');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Citi IRA XLSX filename', () => {
    const meta = parseFilenameMetadata('Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx');
    expect(meta.institution).toBe('Citi');
    expect(meta.accountType).toBe('Traditional IRA');
    expect(meta.accountRaw).toBe('CZ5009834');
    expect(meta.accountSuffix).toBe('9834');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses WeBull Individual Cash Orders Records filename', () => {
    const meta = parseFilenameMetadata('Webull_Individual-Cash_CUX5XLW4_Orders_Records_20261007.csv');
    expect(meta.institution).toBe('WeBull');
    expect(meta.accountType).toBe('Individual Cash');
    expect(meta.accountRaw).toBe('CUX5XLW4');
    expect(meta.accountSuffix).toBe('XLW4');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses WeBull Rollover IRA Orders Records Options filename', () => {
    const meta = parseFilenameMetadata('Webull_Rollover-IRA_CVS8QSX4_Orders_Records_Options_20261007.csv');
    expect(meta.institution).toBe('WeBull');
    expect(meta.accountType).toBe('Rollover IRA');
    expect(meta.accountRaw).toBe('CVS8QSX4');
    expect(meta.accountSuffix).toBe('QSX4');
    expect(meta.asOfDate).toBe('2026-10-07');
  });
});

describe('Date Resolver Priority Hierarchy', () => {
  it('prioritizes filename date over in-file and fallback dates', () => {
    const meta = { asOfDate: '2026-10-07' };
    const resolved = resolveAsOfDate(meta, 'Date downloaded Oct-06-2026', '2026-10-01');
    expect(resolved).toBe('2026-10-07');
  });

  it('uses in-file date when filename date is absent', () => {
    const meta = {};
    const resolved = resolveAsOfDate(meta, 'Date downloaded Oct-06-2026 09:30 AM', '2026-10-01');
    expect(resolved).toBe('2026-10-06');
  });

  it('uses in-file Citi Balances date format (MM/DD/YYYY)', () => {
    const meta = {};
    const resolved = resolveAsOfDate(meta, 'Balances as of 10/07/2026', '2026-10-01');
    expect(resolved).toBe('2026-10-07');
  });

  it('falls back to fallbackDate when neither filename nor in-file date is present', () => {
    const meta = {};
    const resolved = resolveAsOfDate(meta, null, '2026-10-05');
    expect(resolved).toBe('2026-10-05');
  });
});
