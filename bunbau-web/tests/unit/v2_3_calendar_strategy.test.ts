import { describe, it, expect } from 'vitest';
import { CanonicalPosition } from '../../src/lib/portfolio/types';
import { calendarTimelineEvents, extractEventDate, blendedApy } from '../../src/lib/portfolio/selectors';
import { DEFAULT_ALERT_SETTINGS, AlertSettings } from '../../src/lib/models';
import { analyzeYieldGap } from '../../src/lib/strategy';
import { fetchDelayedQuotes } from '../../src/lib/market/yahoo';

describe('v2.3 Calendar & Timeline Events', () => {
  const samplePositions: CanonicalPosition[] = [
    {
      id: 'cd-1',
      accountId: 'acc-1',
      symbol: 'CD-6M',
      name: 'ALLY BANK 6M CD 4.85%',
      assetClass: 'CD',
      marketValue: 25000,
      quantity: 25,
      costBasis: 25000,
      institution: 'Schwab',
      apy: 4.85,
      maturityDate: '2026-10-15',
    },
    {
      id: 'csp-1',
      accountId: 'acc-1',
      symbol: 'AAPL 310 Put',
      name: 'AAPL Dec 18 2026 $310 Put',
      assetClass: 'CSP',
      marketValue: -450,
      quantity: -1,
      costBasis: -450,
      institution: 'Schwab',
      option: {
        underlying: 'AAPL',
        strike: 310,
        expiry: '2026-10-10',
        right: 'PUT',
        contracts: 1,
      },
    },
    {
      id: 'cc-1',
      accountId: 'acc-2',
      symbol: 'MSFT 500 Call',
      name: 'MSFT Nov 20 2026 $500 Call',
      assetClass: 'CoveredCall',
      marketValue: -300,
      quantity: -1,
      costBasis: -300,
      institution: 'Fidelity',
      option: {
        underlying: 'MSFT',
        strike: 500,
        expiry: '2026-11-20',
        right: 'CALL',
        contracts: 1,
      },
    },
  ];

  it('extractEventDate extracts dates accurately from maturityDate, expiry, or text', () => {
    expect(extractEventDate(samplePositions[0])).toBe('2026-10-15');
    expect(extractEventDate(samplePositions[1])).toBe('2026-10-10');
    expect(extractEventDate(samplePositions[2])).toBe('2026-11-20');

    // Text fallback
    const textPos: CanonicalPosition = {
      id: 'tbill-text',
      accountId: 'acc-1',
      symbol: 'TREASURY BILL 11/15/2026',
      name: 'US TREASURY BILL',
      assetClass: 'Treasury',
      marketValue: 10000,
      quantity: 10,
      costBasis: 9900,
      institution: 'Schwab',
    };
    expect(extractEventDate(textPos)).toBe('2026-11-15');
  });

  it('computes chronological order and urgency levels based on alert settings', () => {
    const fixedNow = new Date('2026-10-06T00:00:00Z');
    const settings: AlertSettings = {
      urgentDays: 5,
      warningDays: 14,
      notifyCsp: true,
      notifyCc: true,
      notifyCdTreasury: true,
    };

    const events = calendarTimelineEvents(samplePositions, fixedNow, settings);
    expect(events.length).toBe(3);

    // Chronological order: AAPL (Oct 10: 4d left) -> CD (Oct 15: 9d left) -> MSFT (Nov 20: 45d left)
    expect(events[0].symbol).toBe('AAPL 310 Put');
    expect(events[0].daysRemaining).toBe(4);
    expect(events[0].urgency).toBe('urgent'); // <= 5d
    expect(events[0].collateralLocked).toBe(31000); // 310 * 100 * 1

    expect(events[1].symbol).toBe('CD-6M');
    expect(events[1].daysRemaining).toBe(9);
    expect(events[1].urgency).toBe('soon'); // 5d < 9d <= 14d

    expect(events[2].symbol).toBe('MSFT 500 Call');
    expect(events[2].daysRemaining).toBe(45);
    expect(events[2].urgency).toBe('safe'); // > 14d
  });

  it('honors category filter toggles in alert settings', () => {
    const fixedNow = new Date('2026-10-06T00:00:00Z');
    const settings: AlertSettings = {
      ...DEFAULT_ALERT_SETTINGS,
      notifyCsp: false, // Turn off CSPs
    };

    const events = calendarTimelineEvents(samplePositions, fixedNow, settings);
    expect(events.map(e => e.eventType)).toEqual(['CD', 'CoveredCall']);
  });
});

describe('v2.3 Strategy & Blended APY Engine', () => {
  it('calculates weighted blended APY correctly across owned assets', () => {
    const positions: CanonicalPosition[] = [
      {
        id: 'cd-1',
        accountId: 'acc-1',
        symbol: 'CD-1',
        name: '5% CD',
        assetClass: 'CD',
        marketValue: 10000,
        quantity: 1,
        costBasis: 10000,
        institution: 'Schwab',
        apy: 5.0,
      },
      {
        id: 'cash-1',
        accountId: 'acc-1',
        symbol: 'CASH',
        name: 'Core Cash',
        assetClass: 'Cash',
        marketValue: 10000,
        quantity: 10000,
        costBasis: 10000,
        institution: 'Schwab',
        apy: 1.0,
      },
    ];

    // Total = 20,000, yield = (10000 * 5%) + (10000 * 1%) = 600 => 3.0%
    expect(blendedApy(positions)).toBe(3.0);
  });

  it('generates yield gap recommendations based on risk profile and cash drag', () => {
    const strategyPositions = [
      {
        symbol: 'CASH',
        name: 'Cash',
        category: 'Cash' as const,
        quantity: 50000,
        costBasis: 50000,
        currentValue: 50000,
        apy: 1.0,
      },
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500',
        category: 'ETF' as const,
        quantity: 100,
        costBasis: 40000,
        currentValue: 50000,
        apy: 1.5,
      },
    ];

    const analysis = analyzeYieldGap(strategyPositions, 10, 'Moderate');
    expect(analysis.currentBlendedApy).toBe(1.25);
    expect(analysis.gap).toBe(8.75);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.recommendations[0].action).toContain('Deploy Excess Cash');
  });
});

describe('v2.3 Delayed Quotes & Fallback', () => {
  it('returns delayed quote format or graceful fallback when ticker requested', async () => {
    const quotes = await fetchDelayedQuotes(['AAPL', 'INVALID_TICKER_XYZ']);
    expect(quotes['AAPL']).toBeDefined();
    expect(quotes['AAPL'].isDelayed).toBe(true);
    expect(quotes['INVALID_TICKER_XYZ']).toBeDefined();
    expect(quotes['INVALID_TICKER_XYZ'].isDelayed).toBe(true);
  });
});
