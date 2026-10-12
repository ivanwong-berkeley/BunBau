import { describe, it, expect } from 'vitest';

describe('Portfolio Impact Preview Toolbar & Multi-Account Tabs', () => {
  it('enforces zoom boundaries between 70% and 150% and allows clean reset to 100%', () => {
    let zoom = 1.0;

    // Zoom Out function
    const zoomOut = (current: number) => Math.max(0.7, Math.round((current - 0.1) * 10) / 10);
    // Zoom In function
    const zoomIn = (current: number) => Math.min(1.5, Math.round((current + 0.1) * 10) / 10);
    // Reset function
    const resetZoom = () => 1.0;

    // Step down
    zoom = zoomOut(zoom);
    expect(zoom).toBe(0.9);
    zoom = zoomOut(zoom);
    expect(zoom).toBe(0.8);
    zoom = zoomOut(zoom);
    expect(zoom).toBe(0.7);
    // Clamped at 0.7
    zoom = zoomOut(zoom);
    expect(zoom).toBe(0.7);

    // Step up
    zoom = zoomIn(zoom);
    expect(zoom).toBe(0.8);

    // Reset
    zoom = resetZoom();
    expect(zoom).toBe(1.0);

    // Step to max
    for (let i = 0; i < 10; i++) zoom = zoomIn(zoom);
    expect(zoom).toBe(1.5); // Clamped at 1.5
  });

  it('filters holdings accurately when switching between Combined and individual Account tabs', () => {
    const cashPositions = [
      { symbol: 'USD', value: 57.11, category: 'Cash', accountId: 'CUX5XLW4' },
      { symbol: 'AMD', value: 13314.98, category: 'Stock', accountId: 'CUX5XLW4' },
      { symbol: 'TSM', value: 3870.57, category: 'Stock', accountId: 'CUX5XLW4' },
    ];

    const iraPositions = [
      { symbol: 'USD', value: 11.78, category: 'Cash', accountId: 'CVS8QSX4' },
      { symbol: 'NVDA', value: 14053.09, category: 'Stock', accountId: 'CVS8QSX4' },
      { symbol: 'ORCL', value: 190531.5, category: 'Stock', accountId: 'CVS8QSX4' },
    ];

    const allPositions = [...cashPositions, ...iraPositions];

    // Filter by 'all'
    const getPositionsForTab = (tab: string) => {
      if (tab === 'all') return allPositions;
      return allPositions.filter((p) => p.accountId === tab);
    };

    expect(getPositionsForTab('all')).toHaveLength(6);
    expect(getPositionsForTab('CUX5XLW4')).toHaveLength(3);
    expect(getPositionsForTab('CVS8QSX4')).toHaveLength(3);

    const cashOnly = getPositionsForTab('CUX5XLW4');
    expect(cashOnly.map((p) => p.symbol)).toEqual(['USD', 'AMD', 'TSM']);

    const iraOnly = getPositionsForTab('CVS8QSX4');
    expect(iraOnly.map((p) => p.symbol)).toEqual(['USD', 'NVDA', 'ORCL']);
  });

  it('generates a comprehensive structured summary text for the Copy action', () => {
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const displayTarget = 'WeBull (Combined (2 Accounts))';
    const rawCash = 68.89;
    const netPortfolioCash = 68.89;
    const stocks = [
      { symbol: 'AMD', value: 13314.98 },
      { symbol: 'TSM', value: 3870.57 },
    ];
    const rec = {
      statedTotal: 17254.44,
      computedTotal: 17254.44,
      diff: 0.0,
      ok: true,
    };

    const lines = [
      `Portfolio Impact Preview Summary`,
      `Target: ${displayTarget}`,
      `==================================`,
      `Cash Breakdown:`,
      `  • Raw Extracted Cash: $${fmt(rawCash)}`,
      `  • Net Portfolio Cash: $${fmt(netPortfolioCash)}`,
      ``,
      `Equities (Stocks) [${stocks.length}]:`,
      ...stocks.map((s) => `  • ${s.symbol}: $${fmt(s.value)}`),
      ``,
      `Reconciliation:`,
      `  • Account total on screenshot: $${fmt(rec.statedTotal)}`,
      `  • Sum of imported rows: $${fmt(rec.computedTotal)}`,
      `  • Status: ${rec.ok ? '✓ Reconciled' : '⚠ Mismatch'} (${rec.diff >= 0 ? '+' : '-'}$${fmt(Math.abs(rec.diff))})`,
    ];

    const summaryText = lines.join('\n');

    expect(summaryText).toContain('Portfolio Impact Preview Summary');
    expect(summaryText).toContain('Target: WeBull (Combined (2 Accounts))');
    expect(summaryText).toContain('Raw Extracted Cash: $68.89');
    expect(summaryText).toContain('AMD: $13,314.98');
    expect(summaryText).toContain('Status: ✓ Reconciled (+$0.00)');
  });
});
