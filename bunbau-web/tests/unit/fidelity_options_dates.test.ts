import { describe, it, expect } from 'vitest';
import { normalizeExtraction } from '../../src/lib/extraction/normalize';
import { extractionToPositions } from '../../src/lib/portfolio/adapter';
import { calendarTimelineEvents, extractEventDate } from '../../src/lib/portfolio/selectors';
import { DEFAULT_ALERT_SETTINGS } from '../../src/lib/models';

describe('Fidelity Options Sub-line Date Extraction & Calendar Integration', () => {
  // Ground truth exactly matching user's uploaded Fidelity screenshot media_1791270726349.png
  const FIDELITY_SCREENSHOT_RAW = {
    institution: 'Fidelity',
    account: 'X24336238',
    accountTotal: 674397.90,
    positions: [
      {
        symbol: 'AAPL 310 Put',
        category: 'CSP',
        value: -103,
        quantity: -1,
        // Model extracts sub-line "Oct-23-2026"
        expiry: 'Oct-23-2026',
        strikePrice: 310,
        underlyingSymbol: 'AAPL',
      },
      {
        symbol: 'MSFT 475 Put',
        category: 'CSP',
        value: -125,
        quantity: -1,
        expiry: 'Oct-23-2026',
        strikePrice: 475,
        underlyingSymbol: 'MSFT',
      },
      {
        symbol: 'NVDA 200 Put',
        category: 'CSP',
        value: -89,
        quantity: -1,
        expiry: 'Nov-06-2026',
        strikePrice: 200,
        underlyingSymbol: 'NVDA',
      },
      {
        symbol: 'SLV 68 Call',
        category: 'Covered Call',
        value: -8,
        quantity: -2,
        expiry: 'Oct-16-2026',
        strikePrice: 68,
        underlyingSymbol: 'SLV',
      },
      {
        symbol: 'T 28 Call',
        category: 'Covered Call',
        value: -8,
        quantity: -1,
        expiry: 'Nov-20-2026',
        strikePrice: 28,
        underlyingSymbol: 'T',
      },
    ],
  };

  it('normalizes Fidelity sub-line dates (e.g. Oct-23-2026, Nov-06-2026) to standard ISO dates', () => {
    const ex = normalizeExtraction(FIDELITY_SCREENSHOT_RAW);
    expect(ex.positions).toHaveLength(5);

    const aapl = ex.positions.find(p => p.symbol === 'AAPL 310 Put');
    expect(aapl?.metadata?.expiry).toBe('2026-10-23');
    expect(aapl?.metadata?.strikePrice).toBe(310);
    expect(aapl?.metadata?.underlyingSymbol).toBe('AAPL');

    const slv = ex.positions.find(p => p.symbol === 'SLV 68 Call');
    expect(slv?.metadata?.expiry).toBe('2026-10-16');
    expect(slv?.metadata?.strikePrice).toBe(68);

    const nvda = ex.positions.find(p => p.symbol === 'NVDA 200 Put');
    expect(nvda?.metadata?.expiry).toBe('2026-11-06');

    const t = ex.positions.find(p => p.symbol === 'T 28 Call');
    expect(t?.metadata?.expiry).toBe('2026-11-20');
  });

  it('recovers expiration dates even if model left expiry blank but placed it in text', () => {
    const textFallbackRaw = {
      institution: 'Fidelity',
      account: 'X24336238',
      positions: [
        {
          symbol: 'AAPL 310 Put Oct-23-2026',
          category: 'CSP',
          value: -103,
          quantity: -1,
        },
      ],
    };

    const ex = normalizeExtraction(textFallbackRaw);
    expect(ex.positions[0].metadata?.expiry).toBe('2026-10-23');
    expect(ex.positions[0].metadata?.strikePrice).toBe(310);
  });

  it('populates calendarTimelineEvents with all 5 option contracts in correct chronological order', () => {
    const ex = normalizeExtraction(FIDELITY_SCREENSHOT_RAW);
    const positions = extractionToPositions(ex, 'acct-fidelity');

    // Reference date: Oct 6, 2026 (matching conversation timeline)
    const fixedNow = new Date('2026-10-06T00:00:00Z');
    const events = calendarTimelineEvents(positions, fixedNow, DEFAULT_ALERT_SETTINGS);

    expect(events).toHaveLength(5);

    // Chronological order:
    // 1. SLV 68 Call -> 2026-10-16 (10d left)
    // 2. AAPL 310 Put -> 2026-10-23 (17d left)
    // 3. MSFT 475 Put -> 2026-10-23 (17d left)
    // 4. NVDA 200 Put -> 2026-11-06 (31d left)
    // 5. T 28 Call -> 2026-11-20 (45d left)
    expect(events[0].symbol).toBe('SLV 68 Call');
    expect(events[0].date).toBe('2026-10-16');
    expect(events[0].eventType).toBe('CoveredCall');
    expect(events[0].contracts).toBe(2);

    expect(events[1].symbol).toBe('AAPL 310 Put');
    expect(events[1].date).toBe('2026-10-23');
    expect(events[1].collateralLocked).toBe(31000); // 310 * 100 * 1

    expect(events[2].symbol).toBe('MSFT 475 Put');
    expect(events[2].date).toBe('2026-10-23');
    expect(events[2].collateralLocked).toBe(47500); // 475 * 100 * 1

    expect(events[3].symbol).toBe('NVDA 200 Put');
    expect(events[3].date).toBe('2026-11-06');
    expect(events[3].collateralLocked).toBe(20000); // 200 * 100 * 1

    expect(events[4].symbol).toBe('T 28 Call');
    expect(events[4].date).toBe('2026-11-20');
    expect(events[4].eventType).toBe('CoveredCall');
  });

  it('extractEventDate recognizes hyphenated dates directly on CanonicalPosition', () => {
    const pos = {
      id: 'p1',
      accountId: 'a1',
      symbol: 'AAPL 310 Put',
      name: 'AAPL Oct-23-2026 $310 Put',
      assetClass: 'CSP' as const,
      marketValue: -103,
      quantity: -1,
      institution: 'Fidelity',
    };
    expect(extractEventDate(pos)).toBe('2026-10-23');
  });
});
