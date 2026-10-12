import { describe, it, expect, vi } from 'vitest';
import { isByteStringSafeApiKey, maskApiKey } from '../../../src/lib/utils/cryptoVault';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { SchwabCSVAdapter } from '../../../src/lib/ingestion/adapters/schwabAdapter';
import { toExtractionResult } from '../../../src/lib/types/ingestion';
import { blendedApy } from '../../../src/lib/portfolio/selectors';
import type { CanonicalPosition } from '../../../src/lib/portfolio/types';

describe('ByteString Header & Masked Key Safety Tests', () => {
  it('TEST-BYTE-01: verifies maskApiKey generates char code 8226 bullet at index 6', () => {
    const rawKey = 'AIzaSy1234567890abcdef';
    const masked = maskApiKey(rawKey);
    // Index 6 should be the Unicode bullet •
    expect(masked.charCodeAt(6)).toBe(8226);
    expect(masked).toContain('•');
  });

  it('TEST-BYTE-02: isByteStringSafeApiKey rejects masked keys with bullet or asterisks', () => {
    const rawKey = 'AIzaSy1234567890abcdef';
    const masked = maskApiKey(rawKey);
    expect(isByteStringSafeApiKey(masked)).toBe(false);
    expect(isByteStringSafeApiKey('AIzaSy********1234')).toBe(false);
    expect(isByteStringSafeApiKey('AIzaSy●●●●●●●●1234')).toBe(false);
    expect(isByteStringSafeApiKey('')).toBe(false);
    expect(isByteStringSafeApiKey(null)).toBe(false);
    expect(isByteStringSafeApiKey(undefined)).toBe(false);
  });

  it('TEST-BYTE-03: isByteStringSafeApiKey approves genuine ASCII ByteString keys', () => {
    expect(isByteStringSafeApiKey('AIzaSyAbcDef1234567890_XyZ-99')).toBe(true);
    expect(isByteStringSafeApiKey('sk-ant-api03-abcdef1234567890')).toBe(true);
  });
});

describe('Strategy Page & CSV Enrichment Tests', () => {
  it('TEST-STRAT-01: Fidelity CSV Adapter extracts CD APY and maturity date', () => {
    const csvContent = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis,Cost Basis Per Share,Type
"Z12345678","Individual","CD_DISC","DISCOVER BK GREENWOOD DEL CD 05.00000% 11/20/2026",10,100,0,1000,0,0,0,0,10%,1000,100,"Cash"
"Z12345678","Individual","SPAXX","HELD IN SPAXX",5000,1,0,5000,0,0,0,0,50%,5000,1,"Cash"
`;
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');

    expect(result.accounts).toHaveLength(1);
    const account = result.accounts[0];
    expect(account.positions).toHaveLength(1);

    const cdPos = account.positions[0];
    expect(cdPos.assetCategory).toBe('CD');
    expect(cdPos.yieldApy).toBe(5.0);
    expect(cdPos.maturityDate).toBe('2026-11-20');
    expect(account.cashBalance).toBe(5000);
  });

  it('TEST-STRAT-02: Fidelity CSV Adapter calculates annualized yield on options', () => {
    // 2026-10-23 expiry, $310 Put, $5.00 premium
    const csvContent = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis,Cost Basis Per Share,Type
"Z12345678","Individual","-AAPL261023P310","AAPL Oct 23 2026 310 Put",-1,5.00,0,-500,0,0,0,0,5%,-500,5.00,"Margin"
`;
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');

    const optPos = result.accounts[0].positions[0];
    expect(optPos.assetCategory).toBe('Option');
    expect(optPos.optionDetails).toBeDefined();
    expect(optPos.optionDetails?.type).toBe('PUT');
    expect(optPos.optionDetails?.strike).toBe(310);
    expect(optPos.optionDetails?.annualizedYield).toBeGreaterThan(0);
  });

  it('TEST-STRAT-03: toExtractionResult maps canonical payload to ExtractionResult for UI tables', () => {
    const csvContent = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis,Cost Basis Per Share,Type
"Z12345678","Individual","CD_DISC","DISCOVER BK GREENWOOD DEL CD 05.00000% 11/20/2026",10,100,0,1000,0,0,0,0,10%,1000,100,"Cash"
"Z12345678","Individual","SPAXX","HELD IN SPAXX",2000,1,0,2000,0,0,0,0,50%,2000,1,"Cash"
`;
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(csvContent, 'user-123');
    const extraction = toExtractionResult(result.accounts[0]);

    expect(extraction.institution).toBe('Fidelity');
    expect(extraction.positions).toHaveLength(2); // Cash row + CD row
    const cashRow = extraction.positions.find((p) => p.category === 'Cash');
    const cdRow = extraction.positions.find((p) => p.category === 'CD');

    expect(cashRow).toBeDefined();
    expect(cashRow?.value).toBe(2000);
    expect(cdRow).toBeDefined();
    expect(cdRow?.value).toBe(1000);
    expect(cdRow?.apy).toBe(5.0);
    expect(cdRow?.maturityDate).toBe('2026-11-20');
  });

  it('TEST-STRAT-04: blendedApy calculates weighted yield including CDs and Cash yields', () => {
    const testPositions: CanonicalPosition[] = [
      {
        id: 'pos_1',
        symbol: 'CD_DISC',
        name: 'Discover Bank CD',
        assetClass: 'CD',
        quantity: 10,
        marketValue: 10000,
        apy: 5.0, // 5%
        institution: 'Fidelity',
        accountId: 'acc_1',
      },
      {
        id: 'pos_2',
        symbol: 'SPAXX',
        name: 'Money Market',
        assetClass: 'Cash',
        quantity: 10000,
        marketValue: 10000,
        apy: 5.0, // 5%
        institution: 'Fidelity',
        accountId: 'acc_1',
      },
      {
        id: 'pos_3',
        symbol: 'AAPL',
        name: 'Apple Inc',
        assetClass: 'Stock',
        quantity: 50,
        marketValue: 10000,
        apy: 0.5, // 0.5%
        institution: 'Fidelity',
        accountId: 'acc_1',
      },
      {
        id: 'pos_opt',
        symbol: 'AAPL Put',
        name: 'CSP',
        assetClass: 'CSP',
        quantity: -1,
        marketValue: -500,
        institution: 'Fidelity',
        accountId: 'acc_1',
      },
    ];

    // Owned assets: 10k CD (5%) + 10k Cash (5%) + 10k Stock (0.5%) = 30k total owned
    // Yield dollars = 500 + 500 + 50 = 1050
    // Blended APY = 1050 / 30000 * 100 = 3.5%
    const computedApy = blendedApy(testPositions);
    expect(computedApy).toBe(3.5);
  });
});
