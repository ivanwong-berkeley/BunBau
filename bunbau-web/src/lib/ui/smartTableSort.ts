/**
 * SmartTable sorting core — BunBau Standard UX (v5.1)
 *
 * Rules (see docs/STANDARD_UX.md):
 *  S1  Default sort = first column ascending (or an explicit default).
 *  S2  Click a new header -> ascending; click again -> descending <-> ascending.
 *      There is NO "unsorted" state, so a table always has a defined order.
 *  S3  Reset returns to the default sort.
 *  S5  Currency / percent / date strings sort by their real value; empties go last.
 *  S6  Ties are broken by the remaining columns left-to-right, then original index.
 */

export type SortDir = 'asc' | 'desc';

export interface SmartSortState {
  key: string;
  dir: SortDir;
}

export type SortGetter<T> = (row: T) => unknown;

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}([T ].*)?$/, // 2026-10-16
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // 11/20/2026
  new RegExp(`^(${MONTHS})[a-z]*[ -]\\d{1,2}[, -]+\\d{4}`, 'i'), // Oct-16-2026 / Oct 16, 2026
];

/**
 * Converts a cell value into something comparable: number | string | null.
 * Handles "$4,170.20", "($78.00)", "-$580.00", "$-1.00", "+$10.00", "0.44%", dates.
 */
export function toSortable(value: unknown): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'string') return null; // React nodes etc. must supply a sort value
  const s = value.trim();
  if (s === '' || s === '—' || s === '-' || s.toLowerCase() === 'n/a') return null;

  if (DATE_PATTERNS.some((re) => re.test(s))) {
    const t = Date.parse(s.replace(/-(?=[A-Za-z]{3}|\d{1,2}-\d{4})/g, ' '));
    if (!Number.isNaN(t)) return t;
  }

  const isParenNeg = /^\(.*\)$/.test(s);
  const stripped = s.replace(/[()$,%+\s]/g, '');
  if (/^-?\d*\.?\d+$/.test(stripped)) {
    const n = parseFloat(stripped);
    return isParenNeg ? -Math.abs(n) : n;
  }
  return s;
}

/** Compares two raw cell values. Empty values always sort last, in both directions. */
export function compareSmart(a: unknown, b: unknown, dir: SortDir): number {
  const va = toSortable(a);
  const vb = toSortable(b);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;

  let c: number;
  if (typeof va === 'number' && typeof vb === 'number') {
    c = va - vb;
  } else {
    c = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
  }
  return dir === 'desc' ? -c : c;
}

/** S2: new header -> asc (or its preferred direction); same header toggles asc <-> desc. */
export function nextSort(
  current: SmartSortState,
  key: string,
  preferred: SortDir = 'asc'
): SmartSortState {
  if (current.key !== key) return { key, dir: preferred };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

export function isDefaultSort(current: SmartSortState, def: SmartSortState): boolean {
  return current.key === def.key && current.dir === def.dir;
}

/**
 * Stable multi-key sort: primary by `state`, ties by remaining getters in declared order,
 * then by original index.
 */
export function sortRows<T>(
  rows: readonly T[],
  getters: Record<string, SortGetter<T>>,
  state: SmartSortState
): T[] {
  const primary = getters[state.key];
  const order = Object.keys(getters).filter((k) => k !== state.key);
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((x, y) => {
    if (primary) {
      const c = compareSmart(primary(x.row), primary(y.row), state.dir);
      if (c !== 0) return c;
    }
    for (const k of order) {
      const g = getters[k];
      const c = compareSmart(g(x.row), g(y.row), 'asc');
      if (c !== 0) return c;
    }
    return x.index - y.index;
  });
  return indexed.map((i) => i.row);
}

export interface SortRulesText {
  defaultLabel: string;
}

/** Human-readable sort rules shown in the (i) information popover. */
export function buildSortRules(defaultLabel: string): { action: string; description: string }[] {
  return [
    { action: 'Default order', description: `${defaultLabel}. Applied whenever the table opens.` },
    { action: 'Click a header', description: 'Sorts ascending; click again to switch to descending.' },
    { action: 'Reset sort', description: `Returns the table to its default order (${defaultLabel}).` },
    { action: 'Empty values', description: 'Always listed last, in either direction.' },
    { action: 'Totals & subtotals', description: 'Pinned in place; only data rows are re-ordered.' },
    { action: 'Copy / CSV', description: 'Exports follow the current sort and filters.' },
  ];
}
