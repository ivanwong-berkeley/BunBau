import { describe, it, expect } from 'vitest';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('Screenshot Filename Metadata Parser Unit Tests', () => {
  it('parses Webull Individual Cash with primary underscore date delimiter', () => {
    const meta = parseFilenameMetadata('Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png');
    expect(meta.institution).toBe('WeBull');
    expect(meta.accountType).toBe('Individual Cash');
    expect(meta.accountRaw).toBe('CUX5XLW4');
    expect(meta.accountSuffix).toBe('XLW4');
    expect(meta.asOfDate).toBe('2026-10-07');
    expect(meta.imageSeq).toBe('IMG_6696');
  });

  it('parses Webull Individual Cash with fault-tolerant dot date delimiter', () => {
    const meta = parseFilenameMetadata('Webull_Individual-Cash_CUX5XLW4_IMG_6696.20261007.png');
    expect(meta.institution).toBe('WeBull');
    expect(meta.accountType).toBe('Individual Cash');
    expect(meta.accountRaw).toBe('CUX5XLW4');
    expect(meta.accountSuffix).toBe('XLW4');
    expect(meta.asOfDate).toBe('2026-10-07');
    expect(meta.imageSeq).toBe('IMG_6696');
  });

  it('parses Webull Rollover IRA with IMG_6700 and IMG_6703 sequence IDs', () => {
    const meta1 = parseFilenameMetadata('Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png');
    expect(meta1.institution).toBe('WeBull');
    expect(meta1.accountType).toBe('Rollover IRA');
    expect(meta1.accountRaw).toBe('CVS8QSX4');
    expect(meta1.accountSuffix).toBe('QSX4');
    expect(meta1.asOfDate).toBe('2026-10-07');
    expect(meta1.imageSeq).toBe('IMG_6700');

    const meta2 = parseFilenameMetadata('Webull_Rollover-IRA_CVS8QSX4_IMG_6703_20261007.png');
    expect(meta2.institution).toBe('WeBull');
    expect(meta2.accountType).toBe('Rollover IRA');
    expect(meta2.accountRaw).toBe('CVS8QSX4');
    expect(meta2.accountSuffix).toBe('QSX4');
    expect(meta2.asOfDate).toBe('2026-10-07');
    expect(meta2.imageSeq).toBe('IMG_6703');
  });

  it('infers WeBull institution even if prefix is omitted (backwards compatibility)', () => {
    const meta = parseFilenameMetadata('Individual-Cash_CUX5XLW4_IMG_6696_20261007.png');
    expect(meta.institution).toBe('WeBull');
    expect(meta.accountType).toBe('Individual Cash');
    expect(meta.accountRaw).toBe('CUX5XLW4');
    expect(meta.accountSuffix).toBe('XLW4');
    expect(meta.asOfDate).toBe('2026-10-07');
    expect(meta.imageSeq).toBe('IMG_6696');
  });

  it('parses Citi CD screenshot filename with 4-digit account suffix and Certificate of Deposit type', () => {
    const meta = parseFilenameMetadata('Citi_CD_3703_Image_20261007.png');
    expect(meta.institution).toBe('Citi');
    expect(meta.accountType).toBe('Certificate of Deposit');
    expect(meta.accountRaw).toBe('3703');
    expect(meta.accountSuffix).toBe('3703');
    expect(meta.asOfDate).toBe('2026-10-07');
  });

  it('parses Citibank full name and banking accounts (Checking & Savings)', () => {
    const cdMeta = parseFilenameMetadata('Citibank_Certificate-of-Deposit_3703_20261007.png');
    expect(cdMeta.institution).toBe('Citi');
    expect(cdMeta.accountType).toBe('Certificate of Deposit');
    expect(cdMeta.accountSuffix).toBe('3703');
    expect(cdMeta.asOfDate).toBe('2026-10-07');

    const chkMeta = parseFilenameMetadata('Citi_Checking_5850_20261007.png');
    expect(chkMeta.institution).toBe('Citi');
    expect(chkMeta.accountType).toBe('Checking');
    expect(chkMeta.accountSuffix).toBe('5850');

    const savMeta = parseFilenameMetadata('Citi_Savings_6957_20261007.png');
    expect(savMeta.institution).toBe('Citi');
    expect(savMeta.accountType).toBe('Savings');
    expect(savMeta.accountSuffix).toBe('6957');
  });
});

