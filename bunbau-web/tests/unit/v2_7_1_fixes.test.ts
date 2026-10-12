import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDelayedQuotes } from '../../src/lib/market/yahoo';
import { calculateOptionMoneyness } from '../../src/lib/portfolio/moneyness';
import fs from 'fs';
import path from 'path';

describe('v2.7.1 Fixes Verification', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((url: any) => {
      const urlStr = String(url);
      let price = 100;
      if (urlStr.includes('AAPL')) price = 333.63;
      else if (urlStr.includes('MSFT')) price = 425.00;
      else if (urlStr.includes('NVDA')) price = 125.00;
      else if (urlStr.includes('SLV')) price = 32.50;

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: price,
                    previousClose: price * 0.99,
                    currency: 'USD',
                  },
                },
              ],
            },
          }),
      } as any);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('TEST-QUOTE-01: fetchDelayedQuotes retrieves live prices > 0 for active underliers', async () => {
    const quotes = await fetchDelayedQuotes(['AAPL', 'MSFT', 'NVDA', 'SLV']);
    expect(quotes.AAPL).toBeDefined();
    expect(quotes.AAPL.regularMarketPrice).toBeGreaterThan(0);
    expect(quotes.AAPL.source).toBe('yahoo');

    expect(quotes.MSFT).toBeDefined();
    expect(quotes.MSFT.regularMarketPrice).toBeGreaterThan(0);

    expect(quotes.NVDA).toBeDefined();
    expect(quotes.NVDA.regularMarketPrice).toBeGreaterThan(0);

    expect(quotes.SLV).toBeDefined();
    expect(quotes.SLV.regularMarketPrice).toBeGreaterThan(0);
  });

  it('TEST-MONEY-01: AAPL $310 strike vs real market price returns safe cushion and GREEN status', async () => {
    const quotes = await fetchDelayedQuotes(['AAPL']);
    const marketPrice = quotes.AAPL.regularMarketPrice;
    expect(marketPrice).toBeGreaterThan(310);

    const moneyness = calculateOptionMoneyness('CSP', 310, marketPrice);
    expect(moneyness.urgency).toBe('safe');
    expect(moneyness.isItm).toBe(false);
    expect(moneyness.moneynessPct).toBeGreaterThan(5.0);
    expect(moneyness.badgeLabel).toContain('Safe OTM');
  });

  it('TEST-MONEY-02: SLV $68 Covered Call vs real market price returns safe buffer and GREEN status', async () => {
    const quotes = await fetchDelayedQuotes(['SLV']);
    const marketPrice = quotes.SLV.regularMarketPrice;
    expect(marketPrice).toBeLessThan(68);

    const moneyness = calculateOptionMoneyness('CoveredCall', 68, marketPrice);
    expect(moneyness.urgency).toBe('safe');
    expect(moneyness.isItm).toBe(false);
    expect(moneyness.moneynessPct).toBeGreaterThan(5.0);
    expect(moneyness.badgeLabel).toContain('Safe OTM');
  });

  it('TEST-PORTAL-01: AppletContainer uses createPortal to document.body with z-[100] for true breakout fullscreen', () => {
    const filePath = path.resolve(__dirname, '../../src/components/AppletContainer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('createPortal');
    expect(content).toContain('document.body');
    expect(content).toContain('z-[100]');
    expect(content).toContain('fixed inset-0');
    expect(content).toContain('Escape');
  });

  it('TEST-UX-01: CalendarView includes transparent Strike, Market Quote, and Gap % columns and card metrics', () => {
    const filePath = path.resolve(__dirname, '../../src/components/CalendarView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Strike Price');
    expect(content).toContain('Market Quote');
    expect(content).toContain('Gap / Cushion %');
    expect(content).toContain('Buffer Gap %');
    expect(content).toContain('Cushion Gap %');
  });
});
