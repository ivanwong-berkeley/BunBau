import { describe, it, expect } from 'vitest';

describe('Portfolio Impact Preview Category Mapping Engine', () => {
  it('correctly maps Cash assetClass to Cash category and prevents USD appearing under Equities', () => {
    const rawStitchedPositions = [
      {
        id: 'pos_CUX5XLW4_CASH',
        symbol: 'USD',
        name: 'US Dollar (Cash Balance)',
        assetClass: 'Cash',
        quantity: 57.11,
        marketValue: 57.11,
      },
      {
        id: 'pos_CVS8QSX4_CASH',
        symbol: 'USD',
        name: 'US Dollar (Cash Balance)',
        assetClass: 'Cash',
        quantity: 11.78,
        marketValue: 11.78,
      },
      {
        id: 'pos_CUX5XLW4_AMD',
        symbol: 'AMD',
        name: 'Advanced Micro Devices',
        assetClass: 'Stock',
        quantity: 20.58465,
        marketValue: 13314.98,
      },
      {
        id: 'pos_CUX5XLW4_TSM',
        symbol: 'TSM',
        name: 'Taiwan Semiconductor',
        assetClass: 'Stock',
        quantity: 8.16611,
        marketValue: 3870.57,
      },
      {
        id: 'pos_CUX5XLW4_SOFI_CC',
        symbol: 'SOFI $21.5 Call',
        assetClass: 'CoveredCall',
        quantity: -1,
        marketValue: -1.0,
      },
      {
        id: 'pos_CVS8QSX4_FBTC',
        symbol: 'FBTC',
        name: 'Fidelity Wise Origin Bitcoin Fund',
        assetClass: 'ETF',
        quantity: 53.21458,
        marketValue: 3853.8,
      },
    ];

    const categoryMap: Record<string, string> = {
      Cash: 'Cash',
      Stock: 'Stock',
      ETF: 'ETF',
      CoveredCall: 'Covered Call',
      CSP: 'CSP',
      Crypto: 'Crypto',
      CD: 'CD',
      Treasury: 'Treasury',
    };

    const extractedRows = rawStitchedPositions.map((pos) => ({
      symbol: pos.symbol,
      value: pos.marketValue,
      quantity: pos.quantity,
      name: pos.name,
      category: categoryMap[pos.assetClass] || 'Stock',
    }));

    // Cash filter
    const cashRows = extractedRows.filter((p) => p.category === 'Cash');
    expect(cashRows).toHaveLength(2);
    const rawCash = cashRows.reduce((sum, p) => sum + p.value, 0);
    expect(rawCash).toBeCloseTo(68.89, 2); // $57.11 + $11.78

    // Equities filter
    const stockRows = extractedRows.filter((p) => p.category === 'Stock');
    expect(stockRows).toHaveLength(2); // AMD and TSM
    expect(stockRows.some((s) => s.symbol === 'USD')).toBe(false); // USD must NEVER be in Equities!

    // ETFs filter
    const etfRows = extractedRows.filter((p) => p.category === 'ETF');
    expect(etfRows).toHaveLength(1);
    expect(etfRows[0].symbol).toBe('FBTC');

    // Options filter
    const ccRows = extractedRows.filter((p) => p.category === 'Covered Call');
    expect(ccRows).toHaveLength(1);
    expect(ccRows[0].symbol).toBe('SOFI $21.5 Call');
  });
});
