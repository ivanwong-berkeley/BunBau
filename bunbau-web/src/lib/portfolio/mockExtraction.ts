import { ExtractionResult } from './types';

/**
 * MOCK extraction (Fidelity sample). The real vision pipeline arrives in v2.1 (WP2).
 * Until then the upload modal returns this regardless of the image uploaded, and unit tests use it as a fixture.
 */
export const MOCK_FIDELITY_EXTRACTION: ExtractionResult = {
  institution: 'Fidelity',
  account: '***-6238',
  accountType: 'Brokerage',
  positions: [
    { symbol: 'CASH', value: 100098.97, category: 'Cash', quantity: 1 },
    { symbol: 'AAPL 310 Put', value: -103.0, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'AAPL', strikePrice: 310 } },
    { symbol: 'FBTC', value: 5864.78, category: 'ETF', quantity: 79.978 },
    { symbol: 'FCNTX', value: 7397.24, category: 'ETF', quantity: 266.088 },
    { symbol: 'GLDM', value: 1711.31, category: 'ETF', quantity: 20.857 },
    { symbol: 'MSFT 475 Put', value: -125.0, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'MSFT', strikePrice: 475 } },
    { symbol: 'NVDA', value: 4382.81, category: 'Stock', quantity: 18.734 },
    { symbol: 'NVDA 200 Put', value: -89.0, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'NVDA', strikePrice: 200 } },
    { symbol: 'ORCL', value: 426919.63, category: 'Stock', quantity: 3000.138 },
    { symbol: 'SGOV', value: 77788.16, category: 'ETF', quantity: 774.474 },
    { symbol: 'SLV', value: 10948.0, category: 'ETF', quantity: 200 },
    { symbol: 'SLV 68 Call', value: -8.0, category: 'Covered Call', quantity: -2, metadata: { underlyingSymbol: 'SLV', strikePrice: 68 } },
    { symbol: 'T', value: 2430.0, category: 'Stock', quantity: 100 },
    { symbol: 'T 28 Call', value: -8.0, category: 'Covered Call', quantity: -1, metadata: { underlyingSymbol: 'T', strikePrice: 28 } },
    { symbol: 'UNH', value: 37190.0, category: 'Stock', quantity: 100 },
  ],
};

/** A second institution used to prove imports never overwrite each other. */
export const MOCK_SCHWAB_EXTRACTION: ExtractionResult = {
  institution: 'Schwab',
  account: '***-1111',
  accountType: 'Brokerage',
  positions: [
    { symbol: 'CASH', value: 20000, category: 'Cash', quantity: 1 },
    { symbol: 'NVDA', value: 1000, category: 'Stock', quantity: 5 },
    { symbol: 'CD-1Y', value: 25000, category: 'CD', quantity: 1, apy: 4.5, maturityDate: '2027-01-03' },
  ],
};
