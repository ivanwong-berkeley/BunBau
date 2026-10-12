import { describe, it, expect } from 'vitest';
import { CanonicalPosition } from '../../src/lib/portfolio/types';
import {
  optionsTimelineEvents,
  fixedIncomeTimelineEvents,
  calendarTimelineEvents,
} from '../../src/lib/portfolio/selectors';
import { DEFAULT_ALERT_SETTINGS, AlertSettings } from '../../src/lib/models';

describe('Dual Calendar Split & Moneyness Verification (v2.7)', () => {
  const samplePositions: CanonicalPosition[] = [
    {
      id: 'cd-1',
      accountId: 'acc-1',
      symbol: 'ALLY BANK 6M CD',
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
      id: 'csp-aapl',
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
        expiry: '2026-10-22', // 16 days out from 2026-10-06
        right: 'PUT',
        contracts: 1,
      },
    },
    {
      id: 'cc-msft',
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
    {
      id: 'stock-nvda',
      accountId: 'acc-1',
      symbol: 'NVDA',
      name: 'NVIDIA CORP',
      assetClass: 'Stock',
      marketValue: 15000,
      quantity: 100,
      costBasis: 12000,
      institution: 'Schwab',
    },
  ];

  const fixedNow = new Date('2026-10-06T00:00:00Z');

  it('TEST-SPLIT-01: Options calendar strictly filters CSP and CoveredCall and evaluates Moneyness GYR', () => {
    // AAPL market price $333.63 vs Strike $310 -> +7.62% cushion -> GREEN (safe)
    // MSFT market price $492.00 vs Strike $500 -> 1.6% buffer -> RED (urgent)
    const mockQuotes = {
      AAPL: { regularMarketPrice: 333.63 },
      MSFT: { regularMarketPrice: 492.00 },
    };

    const optionsEvents = optionsTimelineEvents(samplePositions, fixedNow, DEFAULT_ALERT_SETTINGS, mockQuotes);
    expect(optionsEvents.length).toBe(2);

    const aaplEvent = optionsEvents.find((e) => e.symbol.includes('AAPL'));
    expect(aaplEvent).toBeDefined();
    // User requirement: AAPL $310 vs $333.63 must be GREEN ('safe'), not DTE-based YELLOW!
    expect(aaplEvent?.urgency).toBe('safe');
    expect(aaplEvent?.moneynessPct).toBeCloseTo(7.62, 1);
    expect(aaplEvent?.optionBadgeLabel).toContain('Safe OTM');

    const msftEvent = optionsEvents.find((e) => e.symbol.includes('MSFT'));
    expect(msftEvent).toBeDefined();
    // MSFT is within 1.6% of strike -> RED ('urgent')
    expect(msftEvent?.urgency).toBe('urgent');
    expect(msftEvent?.moneynessPct).toBeCloseTo(1.6, 1);
  });

  it('TEST-SPLIT-02: Fixed Income calendar strictly filters CD and Treasury and uses DTE', () => {
    const fixedIncomeEvents = fixedIncomeTimelineEvents(samplePositions, fixedNow, DEFAULT_ALERT_SETTINGS);
    expect(fixedIncomeEvents.length).toBe(1);

    const cdEvent = fixedIncomeEvents[0];
    expect(cdEvent.symbol).toBe('ALLY BANK 6M CD');
    expect(cdEvent.daysRemaining).toBe(9); // Oct 6 to Oct 15
    expect(cdEvent.urgency).toBe('soon'); // 9d is within default warningDays (21d)
    expect(cdEvent.apy).toBe(4.85);
  });

  it('TEST-SPLIT-03: Empty Fixed Income state returns empty array gracefully when no CDs or Treasuries exist', () => {
    const optionsOnly = samplePositions.filter((p) => p.assetClass !== 'CD' && p.assetClass !== 'Treasury');
    const fixedIncomeEvents = fixedIncomeTimelineEvents(optionsOnly, fixedNow, DEFAULT_ALERT_SETTINGS);
    expect(fixedIncomeEvents).toEqual([]);
    expect(fixedIncomeEvents.length).toBe(0);
  });

  it('TEST-SPLIT-04: Dual banner count logic differentiates Options Moneyness urgency from Fixed Income DTE urgency', () => {
    const mockQuotes = {
      AAPL: { regularMarketPrice: 333.63 }, // Safe (+7.62%)
      MSFT: { regularMarketPrice: 492.00 }, // Urgent (1.6% buffer)
    };

    const optionsEvents = optionsTimelineEvents(samplePositions, fixedNow, DEFAULT_ALERT_SETTINGS, mockQuotes);
    const fixedIncomeEvents = fixedIncomeTimelineEvents(samplePositions, fixedNow, {
      ...DEFAULT_ALERT_SETTINGS,
      urgentDays: 10, // 9d CD will now trigger urgent
    });

    const optionsUrgentCount = optionsEvents.filter((e) => e.urgency === 'urgent').length;
    const fixedIncomeUrgentCount = fixedIncomeEvents.filter((e) => e.urgency === 'urgent').length;

    // Only MSFT is urgent by moneyness
    expect(optionsUrgentCount).toBe(1);
    // CD (9d) is urgent under 10-day DTE rule
    expect(fixedIncomeUrgentCount).toBe(1);
  });
});
