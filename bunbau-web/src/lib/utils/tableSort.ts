/**
 * Table Sorting Utilities & Hooks for BunBau (資本寶)
 * 
 * Provides type-safe tri-state sorting ('asc' | 'desc' | null)
 * with robust comparison for strings, numbers, and dates.
 */

import { useState, useMemo } from 'react';
import { compareSmart } from '../ui/smartTableSort';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<K extends string = string> {
  key: K | null;
  direction: SortDirection;
}

export type Extractor<T> = (item: T) => string | number | Date | null | undefined;

export interface ColumnSortDefinition<T, K extends string = string> {
  key: K;
  extractor?: Extractor<T>;
  defaultDirection?: 'asc' | 'desc';
}

/**
 * Safely compares two values for table sorting.
 * Handles strings (case-insensitive), numbers, and dates.
 * Automatically sorts null / undefined / NaN to the bottom.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  direction: 'asc' | 'desc'
): number {
  // Delegates to the shared smart comparator (currency / percent / date aware, empties last)
  return compareSmart(a, b, direction);
}

/**
 * @deprecated Legacy tri-state cycle (asc -> desc -> null). The Standard UX is two-state with
 * an explicit Reset (see src/lib/ui/smartTableSort.ts `nextSort`). Kept for backward compatibility.
 */
export function getNextSortDirection(
  currentKey: string | null,
  newKey: string,
  currentDirection: SortDirection,
  preferredDefault: 'asc' | 'desc' = 'asc'
): SortDirection {
  if (currentKey !== newKey || currentDirection === null) {
    return preferredDefault;
  }
  if (currentDirection === preferredDefault) {
    return preferredDefault === 'asc' ? 'desc' : 'asc';
  }
  // Third click resets to null
  return null;
}

/**
 * Custom React hook for managing smart table sorting (BunBau Standard UX, v5.1).
 *
 * - Default sort = `initialKey`/`initialDirection` if provided, otherwise the FIRST extractor (column 1) ASC.
 * - Two-state toggle (asc <-> desc); there is no unsorted state.
 * - `reset()` returns to the default; `isDefault` tells the toolbar whether Reset is needed.
 */
export function useTableSort<T, K extends string = string>(
  items: T[],
  extractors: Record<K, Extractor<T>>,
  initialKey: K | null = null,
  initialDirection: SortDirection = null,
  defaultDirections: Partial<Record<K, 'asc' | 'desc'>> = {}
) {
  const keys = Object.keys(extractors) as K[];
  const defaultKey = (initialKey ?? keys[0] ?? null) as K | null;
  const defaultDir: 'asc' | 'desc' = initialDirection ?? 'asc';

  const [sortState, setSortState] = useState<SortState<K>>({
    key: defaultKey,
    direction: defaultKey ? defaultDir : null,
  });

  const toggleSort = (key: K) => {
    setSortState((cur) => {
      if (cur.key !== key) return { key, direction: defaultDirections[key] || 'asc' };
      return { key, direction: cur.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const reset = () => setSortState({ key: defaultKey, direction: defaultKey ? defaultDir : null });

  const isDefault = sortState.key === defaultKey && sortState.direction === (defaultKey ? defaultDir : null);

  const sortedItems = useMemo(() => {
    if (!sortState.key || !sortState.direction) {
      return items;
    }
    const primary = extractors[sortState.key];
    if (!primary) {
      return items;
    }
    const direction = sortState.direction;
    const indexed = items.map((item, index) => ({ item, index }));
    indexed.sort((x, y) => {
      const c = compareValues(primary(x.item), primary(y.item), direction);
      if (c !== 0) return c;
      // Stable tie-break by the remaining columns left-to-right (rule S6), then original order
      for (const k of keys) {
        if (k === sortState.key) continue;
        const cc = compareValues(extractors[k](x.item), extractors[k](y.item), 'asc');
        if (cc !== 0) return cc;
      }
      return x.index - y.index;
    });
    return indexed.map((i) => i.item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortState, extractors]);

  return {
    sortedItems,
    sortState,
    toggleSort,
    setSortState,
    reset,
    isDefault,
    defaultState: { key: defaultKey, dir: defaultDir } as { key: K | null; dir: 'asc' | 'desc' },
  };
}
