import { describe, it, expect } from 'vitest';
import { compareValues, getNextSortDirection } from '../../src/lib/utils/tableSort';

describe('Table Sorting Engine (tableSort)', () => {
  describe('compareValues()', () => {
    it('correctly sorts strings alphabetically (asc and desc)', () => {
      expect(compareValues('AAPL', 'BILI', 'asc')).toBeLessThan(0);
      expect(compareValues('BILI', 'AAPL', 'asc')).toBeGreaterThan(0);
      expect(compareValues('AAPL', 'AAPL', 'asc')).toBe(0);

      expect(compareValues('AAPL', 'BILI', 'desc')).toBeGreaterThan(0);
      expect(compareValues('BILI', 'AAPL', 'desc')).toBeLessThan(0);
    });

    it('correctly handles case-insensitivity for tickers', () => {
      expect(compareValues('aapl', 'AAPL', 'asc')).toBe(0);
      expect(compareValues('sgov', 'AAPL', 'asc')).toBeGreaterThan(0);
    });

    it('correctly sorts numeric monetary values and APYs', () => {
      expect(compareValues(100.5, 500, 'asc')).toBeLessThan(0);
      expect(compareValues(500, 100.5, 'asc')).toBeGreaterThan(0);
      expect(compareValues(500, 100.5, 'desc')).toBeLessThan(0);
      expect(compareValues(0, 0, 'asc')).toBe(0);
      expect(compareValues(-50, 10, 'asc')).toBeLessThan(0);
    });

    it('correctly sorts ISO date strings chronologically', () => {
      expect(compareValues('2026-10-17', '2026-11-20', 'asc')).toBeLessThan(0);
      expect(compareValues('2026-11-20', '2026-10-17', 'asc')).toBeGreaterThan(0);
      expect(compareValues('2026-10-17', '2026-11-20', 'desc')).toBeGreaterThan(0);
    });

    it('pushes null, undefined, and NaN values to the bottom regardless of direction', () => {
      expect(compareValues(null, 100, 'asc')).toBe(1);
      expect(compareValues(null, 100, 'desc')).toBe(1);
      expect(compareValues(undefined, 'AAPL', 'asc')).toBe(1);
      expect(compareValues(undefined, 'AAPL', 'desc')).toBe(1);
      expect(compareValues(NaN, 50, 'asc')).toBe(1);
      expect(compareValues(NaN, 50, 'desc')).toBe(1);
      expect(compareValues(null, undefined, 'asc')).toBe(0);
    });
  });

  describe('getNextSortDirection() Tri-State Logic', () => {
    it('progresses from default asc -> desc -> null', () => {
      let dir = getNextSortDirection(null, 'symbol', null, 'asc');
      expect(dir).toBe('asc');

      dir = getNextSortDirection('symbol', 'symbol', 'asc', 'asc');
      expect(dir).toBe('desc');

      dir = getNextSortDirection('symbol', 'symbol', 'desc', 'asc');
      expect(dir).toBeNull();
    });

    it('progresses from default desc -> asc -> null for monetary fields', () => {
      let dir = getNextSortDirection(null, 'value', null, 'desc');
      expect(dir).toBe('desc');

      dir = getNextSortDirection('value', 'value', 'desc', 'desc');
      expect(dir).toBe('asc');

      dir = getNextSortDirection('value', 'value', 'asc', 'desc');
      expect(dir).toBeNull();
    });

    it('switches directly to preferred default when changing active column', () => {
      const dir = getNextSortDirection('symbol', 'value', 'desc', 'desc');
      expect(dir).toBe('desc');
    });
  });
});
