import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseCitiHoldingsWorkbook,
  parseCitiWorkbook,
  extractRowsFromCsvString,
} from '../../../src/lib/ingestion/adapters/citiXlsxAdapter';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';

describe('Citi Holdings Parser & Multi-Account Ingestion Tests', () => {
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
,,,,,,,,,,,,,,,,,,,,,,
,Holdings,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Account Number: CZ5009834,,,,,,,,,,,,,,,,,,,,,
,IBD: C01,,,,,,,,,,,,,,,,,,,,,
,"Total Market Value: $200,149.45",,,,,,,,,,,,,,,,,,,,,
,"Investment Funds: $199,612.86",,,,,,,,,,,,,,,,,,,,,
,"Cash, Money Funds and Bank Deposits: $536.59",,,,,,,,,,,,,,,,,,,,,
,Holdings as of : 10/11/2026,,,,,,,,,,,,,,,,,,,,,
,All Values are in : USD,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Security ID,CUSIP,Account Number,Account Nickname/Title,Description,Asset Classification,Quantity,Custodian,Price,Price as of Date,Timezone,Change Price Amount,Change Price %,Market Value,Market Value Change,Gain/Loss $,Gain/Loss %,Activity Date,Accrued Interest,Dividend Reinvestment,Market,Sub-Asset Classification
,SGOV,46436E718,CZ5009834,,ISHARES TR ISHARES 0-3 MNTH TREAS BD ETF,Investment Funds,1986,Pershing LLC,100.51,2026-10-09 00:00:00,ET,0,0,199612.86,0,147.04,0.0007000000000000001,2026-10-07,0,Cash,NYSE,Exchange-Traded Funds
,WAGI,PER981476,CZ5009834,,WESTERN ASSET INSTL GOVT MONEY MARKET,"Cash, Money Funds and Bank Deposits",536.59,Pershing LLC,1,2026-10-09 00:00:00,ET,0,0,536.59,0,0,0,2026-10-09,0,,OTC,Money Market Funds
`;

  it('TEST-CITI-01: parses both accounts from multi-account Citi Holdings export', () => {
    const accounts = parseCitiHoldingsWorkbook(sampleCitiCsv);
    expect(accounts).toHaveLength(2);

    // Account 1: Brokerage CZ5009836
    const acc1 = accounts.find((a) => a.accountMaskedNumber.includes('9836'));
    expect(acc1).toBeDefined();
    expect(acc1!.institution).toBe('Citi');
    expect(acc1!.accountType).toBe('Brokerage');
    expect(acc1!.extractedAt).toBe('2026-10-11');
    expect(acc1!.cashBalance).toBe(12.68);
    expect(acc1!.totalValue).toBe(101226.25);
    expect(acc1!.positions).toHaveLength(1);

    const sgov1 = acc1!.positions[0];
    expect(sgov1.symbol).toBe('SGOV');
    expect(sgov1.quantity).toBe(1007);
    expect(sgov1.currentPrice).toBe(100.51);
    expect(sgov1.marketValue).toBe(101213.57);
    expect(sgov1.unrealizedGainLoss).toBe(-184.65);
    expect(sgov1.assetCategory).toBe('Bond_SGOV');
    expect(sgov1.yieldApy).toBe(5.10);
    // Checksum: cash + positions = totalValue
    expect(acc1!.cashBalance + sgov1.marketValue).toBeCloseTo(acc1!.totalValue, 2);

    // Account 2: Traditional IRA CZ5009834
    const acc2 = accounts.find((a) => a.accountMaskedNumber.includes('9834'));
    expect(acc2).toBeDefined();
    expect(acc2!.institution).toBe('Citi');
    expect(acc2!.accountType).toBe('Traditional IRA');
    expect(acc2!.extractedAt).toBe('2026-10-11');
    expect(acc2!.cashBalance).toBe(536.59);
    expect(acc2!.totalValue).toBe(200149.45);
    expect(acc2!.positions).toHaveLength(1);

    const sgov2 = acc2!.positions[0];
    expect(sgov2.symbol).toBe('SGOV');
    expect(sgov2.quantity).toBe(1986);
    expect(sgov2.currentPrice).toBe(100.51);
    expect(sgov2.marketValue).toBe(199612.86);
    expect(sgov2.unrealizedGainLoss).toBe(147.04);
    expect(sgov2.assetCategory).toBe('Bond_SGOV');
    // Checksum: cash + positions = totalValue
    expect(acc2!.cashBalance + sgov2.marketValue).toBeCloseTo(acc2!.totalValue, 2);
  });

  it('TEST-CITI-02: CSVRouter routes Citi Holdings text correctly and returns both accounts', () => {
    const router = new CSVRouter();
    const result = router.routeAndParse(sampleCitiCsv, 'demo-user');

    expect(result.adapterId).toBe('citi_holdings');
    expect(result.adapterName).toBe('Citi Holdings Adapter');
    expect(result.accounts).toHaveLength(2);
    expect(result.extractedTimestamp).toBe('2026-10-11');
  });

  it('TEST-CITI-03: parses binary XLSX workbook generated from Citi Holdings data', () => {
    // Generate an in-memory XLSX workbook using RFC-compliant row parsing
    const sheetData = extractRowsFromCsvString(sampleCitiCsv);
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holdings');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseCitiWorkbook(buffer);
    expect(result.adapterId).toBe('citi_holdings');
    expect(result.accounts).toHaveLength(2);

    const acc1 = result.accounts.find((a) => a.accountMaskedNumber.includes('9836'));
    const acc2 = result.accounts.find((a) => a.accountMaskedNumber.includes('9834'));

    expect(acc1!.totalValue).toBe(101226.25);
    expect(acc1!.cashBalance).toBe(12.68);
    expect(acc1!.positions[0].marketValue).toBe(101213.57);

    expect(acc2!.totalValue).toBe(200149.45);
    expect(acc2!.cashBalance).toBe(536.59);
    expect(acc2!.positions[0].marketValue).toBe(199612.86);
  });

  it('TEST-CITI-04: respects filename metadata when parsing single-account files', () => {
    const singleAccountCsv = `,,,,,,,,,,,,,,,,,,,,,,
,Holdings,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Account Number: CZ5009834,,,,,,,,,,,,,,,,,,,,,
,IBD: C01,,,,,,,,,,,,,,,,,,,,,
,"Total Market Value: $200,149.45",,,,,,,,,,,,,,,,,,,,,
,"Investment Funds: $199,612.86",,,,,,,,,,,,,,,,,,,,,
,"Cash, Money Funds and Bank Deposits: $536.59",,,,,,,,,,,,,,,,,,,,,
,Holdings as of : 10/11/2026,,,,,,,,,,,,,,,,,,,,,
,All Values are in : USD,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,
,Security ID,CUSIP,Account Number,Account Nickname/Title,Description,Asset Classification,Quantity,Custodian,Price,Price as of Date,Timezone,Change Price Amount,Change Price %,Market Value,Market Value Change,Gain/Loss $,Gain/Loss %,Activity Date,Accrued Interest,Dividend Reinvestment,Market,Sub-Asset Classification
,SGOV,46436E718,CZ5009834,,ISHARES TR ISHARES 0-3 MNTH TREAS BD ETF,Investment Funds,1986,Pershing LLC,100.51,2026-10-09 00:00:00,ET,0,0,199612.86,0,147.04,0.0007000000000000001,2026-10-07,0,Cash,NYSE,Exchange-Traded Funds
,WAGI,PER981476,CZ5009834,,WESTERN ASSET INSTL GOVT MONEY MARKET,"Cash, Money Funds and Bank Deposits",536.59,Pershing LLC,1,2026-10-09 00:00:00,ET,0,0,536.59,0,0,0,2026-10-09,0,,OTC,Money Market Funds
`;
    const meta = parseFilenameMetadata('Citi_IRA_CZ5009834_Holdings_20261011.xlsx');
    const accounts = parseCitiHoldingsWorkbook(singleAccountCsv, meta);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountType).toBe('Traditional IRA');
    expect(accounts[0].accountMaskedNumber).toBe('***-9834');
    expect(accounts[0].cashBalance).toBe(536.59);
    expect(accounts[0].totalValue).toBe(200149.45);
  });
});
