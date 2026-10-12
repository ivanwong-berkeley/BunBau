import { CanonicalAccount, CanonicalPosition } from './types';
import { toCanonicalPosition } from './adapter';
import { ExtractedRow } from './types';

const DEMO_INSTITUTION = 'Schwab';
const DEMO_MASK = '***-DEMO';
export const DEMO_ACCOUNT_ID = 'demo-schwab';

const addDays = (now: Date, days: number) =>
  new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);

/**
 * Demo-mode sample (a full Schwab account). NEVER persisted, shown only when the user has no accounts.
 * Built from `now` so maturity/expiry dates are always in the future and every tab looks populated.
 * Totals: CSP reserve = $98,500, net free cash = $1,508.97 (covered flags on SLV and T only).
 */
export function buildSeedAccounts(now: Date = new Date()): CanonicalAccount[] {
  const rows: ExtractedRow[] = [
    { symbol: 'CASH', name: 'Cash & Sweep', value: 100008.97, category: 'Cash', quantity: 1, apy: 3.5 },
    { symbol: 'CD-6M', name: 'Schwab 6-Month CD', value: 50000, category: 'CD', quantity: 1, apy: 5.1, maturityDate: addDays(now, 10) },
    { symbol: 'CD-1Y', name: 'Citi 1-Year CD', value: 25000, category: 'CD', quantity: 1, apy: 4.5, maturityDate: addDays(now, 90) },
    { symbol: 'TBILL', name: 'US Treasury Bill', value: 100000, category: 'Treasury', quantity: 1, apy: 4.8, maturityDate: addDays(now, 25) },
    { symbol: 'AAPL 310 Put', value: -103, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'AAPL', strikePrice: 310, expiry: addDays(now, 12) } },
    { symbol: 'MSFT 475 Put', value: -125, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'MSFT', strikePrice: 475, expiry: addDays(now, 26) } },
    { symbol: 'NVDA 200 Put', value: -89, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'NVDA', strikePrice: 200, expiry: addDays(now, 40) } },
    { symbol: 'SLV 68 Call', value: -8, category: 'Covered Call', quantity: -2, metadata: { underlyingSymbol: 'SLV', strikePrice: 68, expiry: addDays(now, 18) } },
    { symbol: 'T 28 Call', value: -8, category: 'Covered Call', quantity: -1, metadata: { underlyingSymbol: 'T', strikePrice: 28, expiry: addDays(now, 33) } },
    { symbol: 'FBTC', value: 5864.78, category: 'ETF', quantity: 79.978 },
    { symbol: 'FCNTX', value: 7397.24, category: 'ETF', quantity: 266.088 },
    { symbol: 'GLDM', value: 1711.31, category: 'ETF', quantity: 20.857 },
    { symbol: 'SGOV', value: 77788.16, category: 'ETF', quantity: 774.474, apy: 4.3 },
    { symbol: 'SLV', value: 10948, category: 'ETF', quantity: 200 },
    { symbol: 'NVDA', value: 4382.81, category: 'Stock', quantity: 18.734 },
    { symbol: 'ORCL', value: 426919.63, category: 'Stock', quantity: 3000.138 },
    { symbol: 'T', value: 2430, category: 'Stock', quantity: 100 },
    { symbol: 'UNH', value: 37190, category: 'Stock', quantity: 100 },
  ];
  const positions: CanonicalPosition[] = rows.map((r, i) =>
    toCanonicalPosition(r, DEMO_INSTITUTION, DEMO_ACCOUNT_ID, i)
  );
  return [
    {
      id: DEMO_ACCOUNT_ID,
      institution: DEMO_INSTITUTION,
      maskedAccount: DEMO_MASK,
      accountType: 'Brokerage (Demo)',
      positions,
      updatedAt: now.toISOString(),
    },
  ];
}
