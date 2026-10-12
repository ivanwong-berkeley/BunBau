import { describe, it, expect } from 'vitest';
import { calculateOptionMoneyness } from '../../src/lib/portfolio/moneyness';

describe('Options Moneyness & GYR Alerts (v2.7)', () => {
  it('TEST-GYR-01: AAPL $310 strike vs $333.63 market price returns GREEN safe OTM', () => {
    const result = calculateOptionMoneyness('CSP', 310, 333.63);
    expect(result.urgency).toBe('safe');
    expect(result.isItm).toBe(false);
    expect(result.moneynessPct).toBeCloseTo(7.62, 1);
    expect(result.badgeLabel).toContain('Safe OTM');
  });

  it('TEST-GYR-02: CSP Urgent Danger <= 2% returns RED alert', () => {
    // Strike 100, Market 101.50 -> 1.5% buffer
    const result = calculateOptionMoneyness('CSP', 100, 101.50);
    expect(result.urgency).toBe('urgent');
    expect(result.isItm).toBe(false);
    expect(result.moneynessPct).toBe(1.5);
    expect(result.badgeLabel).toContain('Urgent');
  });

  it('TEST-GYR-03: CSP In-The-Money (market <= strike) returns RED alert', () => {
    // Strike 100, Market 95 -> 5% ITM
    const result = calculateOptionMoneyness('CSP', 100, 95.0);
    expect(result.urgency).toBe('urgent');
    expect(result.isItm).toBe(true);
    expect(result.moneynessPct).toBe(5.0);
    expect(result.badgeLabel).toContain('ITM');
  });

  it('TEST-GYR-04: CSP Approaching Strike between 2% and 5% returns YELLOW alert', () => {
    // Strike 100, Market 103.50 -> 3.5% buffer
    const result = calculateOptionMoneyness('CSP', 100, 103.50);
    expect(result.urgency).toBe('soon');
    expect(result.isItm).toBe(false);
    expect(result.moneynessPct).toBe(3.5);
    expect(result.badgeLabel).toContain('Approaching');
  });

  it('TEST-GYR-05: Covered Call Safe OTM > 5% returns GREEN safe buffer', () => {
    // Strike 150, Market 135 -> 10% buffer
    const result = calculateOptionMoneyness('CoveredCall', 150, 135.0);
    expect(result.urgency).toBe('safe');
    expect(result.isItm).toBe(false);
    expect(result.moneynessPct).toBe(10.0);
    expect(result.badgeLabel).toContain('Safe OTM');
  });

  it('TEST-GYR-06: Covered Call Urgent <= 2% returns RED alert', () => {
    // Strike 500, Market 492 -> 1.6% buffer
    const result = calculateOptionMoneyness('CoveredCall', 500, 492.0);
    expect(result.urgency).toBe('urgent');
    expect(result.isItm).toBe(false);
    expect(result.moneynessPct).toBe(1.6);
    expect(result.badgeLabel).toContain('Urgent');
  });

  it('TEST-GYR-07: Covered Call In-The-Money (market >= strike) returns RED alert', () => {
    // Strike 500, Market 510 -> 2% ITM
    const result = calculateOptionMoneyness('CoveredCall', 500, 510.0);
    expect(result.urgency).toBe('urgent');
    expect(result.isItm).toBe(true);
    expect(result.badgeLabel).toContain('ITM');
  });

  it('TEST-GYR-08: Quote Pending when market price is 0 or missing', () => {
    const result = calculateOptionMoneyness('CSP', 310, 0);
    expect(result.urgency).toBe('pending');
    expect(result.badgeLabel).toBe('Quote Pending');
  });
});
