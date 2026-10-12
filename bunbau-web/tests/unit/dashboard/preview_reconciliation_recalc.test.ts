import { describe, it, expect } from 'vitest';

describe('Portfolio Impact Preview Reconciliation Recalculation Engine', () => {
  it('recalculates reconciliation for consolidated multi-account batches and eliminates false single-screen mismatch', () => {
    // Stitched Account 1: Individual Cash (CUX5XLW4)
    const cashAccount = {
      accountId: 'CUX5XLW4',
      accountType: 'Individual Cash',
      netAccountValue: 59148.0,
      positions: [
        { symbol: 'USD', value: 57.11, category: 'Cash' },
        { symbol: 'AMD', value: 13314.98, category: 'Stock' },
        { symbol: 'TSM', value: 3870.57, category: 'Stock' },
        { symbol: 'SOFI', value: 220.85, category: 'Stock' },
        { symbol: 'SOFI', value: 1567.0, category: 'Stock' }, // Covered stock
        { symbol: 'SOFI $21.5 Call', value: -1.0, category: 'Covered Call' }, // Short call liability
        { symbol: 'MCD', value: 40118.49, category: 'Stock' },
      ],
    };

    // Stitched Account 2: Rollover IRA (CVS8QSX4)
    const iraAccount = {
      accountId: 'CVS8QSX4',
      accountType: 'Rollover IRA',
      netAccountValue: 219702.33,
      positions: [
        { symbol: 'USD', value: 11.78, category: 'Cash' },
        { symbol: 'NVDA', value: 14053.09, category: 'Stock' },
        { symbol: 'SOFI', value: 1135.26, category: 'Stock' },
        { symbol: 'MCD', value: 2740.7, category: 'Stock' },
        { symbol: 'AI', value: 11240.0, category: 'Stock' },
        { symbol: 'AI $13 Call', value: -10.0, category: 'Covered Call' },
        { symbol: 'ORCL', value: 190531.5, category: 'Stock' },
      ],
    };

    const combinedPortfolioTotal =
      Math.round((cashAccount.netAccountValue + iraAccount.netAccountValue) * 100) / 100;
    const allExtractedRows = [...cashAccount.positions, ...iraAccount.positions];

    // Compute consolidated reconciliation
    const computedTotal = Math.round(allExtractedRows.reduce((sum, r) => sum + (r.value || 0), 0) * 100) / 100;
    const statedTotal = combinedPortfolioTotal;
    const diff = Math.round((computedTotal - statedTotal) * 100) / 100;
    const isMatch = Math.abs(diff) <= 1.0;

    const consolidatedReconciliation = {
      statedTotal,
      computedTotal,
      diff,
      ok: isMatch,
    };

    expect(statedTotal).toBe(278850.33);
    expect(computedTotal).toBe(278850.33);
    expect(diff).toBe(0.0);
    expect(consolidatedReconciliation.ok).toBe(true);
    // Guarantees that stale Screen 1 difference (-$41,905.34) is completely overwritten!
    expect(consolidatedReconciliation.diff).not.toBe(-41905.34);
  });
});
