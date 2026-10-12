'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  SmartSortState,
  SortDir,
  SortGetter,
  isDefaultSort,
  nextSort,
  sortRows,
} from './smartTableSort';

export interface UseSmartSortOptions {
  /** Defaults to the first getter (column 1). */
  defaultKey?: string;
  /** Defaults to 'asc'. */
  defaultDir?: SortDir;
  /** Preferred first-click direction per column (e.g. amounts desc). Default 'asc'. */
  preferred?: Record<string, SortDir>;
}

/**
 * Standard sort state for every table in BunBau:
 * default = first column ASC, two-state toggle, one-call reset.
 */
export function useSmartSort<T>(
  rows: readonly T[],
  getters: Record<string, SortGetter<T>>,
  options: UseSmartSortOptions = {}
) {
  const firstKey = Object.keys(getters)[0] ?? '';
  const defaultState: SmartSortState = useMemo(
    () => ({ key: options.defaultKey ?? firstKey, dir: options.defaultDir ?? 'asc' }),
    [options.defaultKey, options.defaultDir, firstKey]
  );

  const [sort, setSort] = useState<SmartSortState>(defaultState);

  const toggle = useCallback(
    (key: string) => setSort((cur) => nextSort(cur, key, options.preferred?.[key] ?? 'asc')),
    [options.preferred]
  );
  const reset = useCallback(() => setSort(defaultState), [defaultState]);

  const sortedRows = useMemo(() => sortRows(rows, getters, sort), [rows, getters, sort]);

  return {
    sortedRows,
    sort,
    defaultState,
    isDefault: isDefaultSort(sort, defaultState),
    toggle,
    reset,
    setSort,
  };
}
