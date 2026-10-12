import { describe, it, expect } from 'vitest';
import { normalizeExtraction } from '../../src/lib/extraction/normalize';

const base = { institution: 'Fidelity', account: '***-6238' };

describe('option strike recovery (NaN regression)', () => {
  it.each([
    ['AAPL 310 Put', 310],
    ['MSFT 475 Put', 475],
    ['AAPL Dec 18 2026 $310 P', 310],
    ['T 28 Call', 28],
    ['SLV 68.5 C', 68.5],
  ])('derives strike from "%s" when the model omits strikePrice', (symbol, strike) => {
    const r = normalizeExtraction({ ...base, positions: [{ symbol, category: symbol.match(/call|C$/i) ? 'Covered Call' : 'CSP', value: -100, quantity: -1 }] });
    expect(r.positions[0].metadata?.strikePrice).toBe(strike);
  });
  it('explicit strikePrice wins over the symbol', () => {
    const r = normalizeExtraction({ ...base, positions: [{ symbol: 'AAPL 310 Put', category: 'CSP', value: -1, strikePrice: 300 }] });
    expect(r.positions[0].metadata?.strikePrice).toBe(300);
  });
});
