import { describe, it, expect } from 'vitest';
import {
  toSortable,
  compareSmart,
  nextSort,
  isDefaultSort,
  sortRows,
} from '../../src/lib/ui/smartTableSort';

describe('SmartTable sort engine', () => {
  it('parses currency, parentheses negatives, percent', () => {
    expect(toSortable('$4,170.20')).toBe(4170.2);
    expect(toSortable('($78.00)')).toBe(-78);
    expect(toSortable('-$580.00')).toBe(-580);
    expect(toSortable('0.44%')).toBe(0.44);
    expect(toSortable('')).toBeNull();
  });

  it('puts empties last in both directions', () => {
    expect(compareSmart('', 'A', 'asc')).toBeGreaterThan(0);
    expect(compareSmart('', 'A', 'desc')).toBeGreaterThan(0);
  });

  it('two-state toggle and no unsorted state', () => {
    const def = { key: 'symbol', dir: 'asc' as const };
    const s1 = nextSort(def, 'symbol');
    expect(s1).toEqual({ key: 'symbol', dir: 'desc' });
    expect(nextSort(s1, 'symbol')).toEqual({ key: 'symbol', dir: 'asc' });
    expect(nextSort(def, 'value')).toEqual({ key: 'value', dir: 'asc' });
    expect(isDefaultSort(def, def)).toBe(true);
    expect(isDefaultSort(s1, def)).toBe(false);
  });

  it('default first column ASC, numeric sort, stable ties', () => {
    const rows = [
      { s: 'T', v: '$10' },
      { s: 'AAPL', v: '$100' },
      { s: 'MSFT', v: '$10' },
    ];
    const g = { s: (r: any) => r.s, v: (r: any) => r.v };
    expect(sortRows(rows, g, { key: 's', dir: 'asc' }).map((r) => r.s)).toEqual(['AAPL', 'MSFT', 'T']);
    expect(sortRows(rows, g, { key: 'v', dir: 'desc' }).map((r) => r.s)).toEqual(['AAPL', 'MSFT', 'T']);
    expect(sortRows(rows, g, { key: 'v', dir: 'asc' }).map((r) => r.s)).toEqual(['MSFT', 'T', 'AAPL']);
  });
});
