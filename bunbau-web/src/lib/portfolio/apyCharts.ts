/**
 * Pure chart-data builders for the Blended APY drill-downs.
 * They consume the same rows as the SmartTable (rawValues), so charts always match the table
 * and respect the institution tab / search filter applied by the modal.
 */

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

export interface DrillDownChart {
  id: string;
  title: string;
  slices: PieSlice[];
  /** Big text in the doughnut hole. */
  centerLabel?: string;
  centerSub?: string;
  /** One-line explanation shown under the chart. */
  caption?: string;
}

export interface ApyChartRow {
  rawValues?: Record<string, string | number>;
}

export const INCOME_COLOR = '#14b8a6'; // teal: income-generating
export const NON_INCOME_COLOR = '#94a3b8'; // slate: non-income
export const PALETTE = [
  '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#ec4899',
  '#22c55e', '#ef4444', '#06b6d4', '#a855f7', '#eab308',
];

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);
const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)}%`; // same rounding as round2() so it matches the card

/** Keeps the largest slices and groups the rest (or any slice below minPct) into "Other". */
export function groupSmallSlices(slices: PieSlice[], maxSlices = 8, minPct = 2): PieSlice[] {
  const positive = slices.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return [];
  const kept: PieSlice[] = [];
  let other = 0;
  positive.forEach((s, i) => {
    if (i < maxSlices && (s.value / total) * 100 >= minPct) kept.push(s);
    else other += s.value;
  });
  if (other > 0) kept.push({ label: 'Other', value: other, color: NON_INCOME_COLOR });
  return kept.map((s, i) => ({ ...s, color: s.color ?? PALETTE[i % PALETTE.length] }));
}

/** Yield-bearing drill-down (4.19% base): each asset's share of the estimated annual income. */
export function buildYieldContributionCharts(rows: ApyChartRow[]): DrillDownChart[] {
  const items = rows.map((r) => ({
    symbol: String(r.rawValues?.symbol ?? '—'),
    value: num(r.rawValues?.annualIncome),
    mv: num(r.rawValues?.marketValue),
  }));
  const income = items.reduce((s, x) => s + x.value, 0);
  const mv = items.reduce((s, x) => s + x.mv, 0);
  const apy = mv > 0 ? (income / mv) * 100 : 0;
  return [
    {
      id: 'income-by-asset',
      title: 'Contribution to estimated annual income',
      slices: groupSmallSlices(items.map((x) => ({ label: x.symbol, value: x.value }))),
      centerLabel: pct(apy),
      centerSub: 'yield-bearing APY',
      caption: `${money(income)} per year earned on ${money(mv)} of yield-bearing assets. Slice size = share of income.`,
    },
  ];
}

/** Portfolio drill-down (1.53% base): income-generating vs non-income assets, then income by asset. */
export function buildPortfolioApyCharts(rows: ApyChartRow[]): DrillDownChart[] {
  let incomeValue = 0;
  let nonIncomeValue = 0;
  let income = 0;
  const bySymbol: PieSlice[] = [];
  for (const r of rows) {
    const mv = num(r.rawValues?.marketValue);
    const inc = num(r.rawValues?.annualIncome);
    if (num(r.rawValues?.generatesIncome) > 0) incomeValue += mv;
    else nonIncomeValue += mv;
    income += inc;
    if (inc > 0) bySymbol.push({ label: String(r.rawValues?.symbol ?? '—'), value: inc });
  }
  const total = incomeValue + nonIncomeValue;
  const apy = total > 0 ? (income / total) * 100 : 0;
  const yieldApy = incomeValue > 0 ? (income / incomeValue) * 100 : 0;
  const share = total > 0 ? (incomeValue / total) * 100 : 0;
  return [
    {
      id: 'income-vs-non-income',
      title: 'Where the portfolio sits: income vs non-income assets',
      slices: [
        { label: 'Income-generating assets', value: incomeValue, color: INCOME_COLOR },
        { label: 'Non-income assets (0% APY)', value: nonIncomeValue, color: NON_INCOME_COLOR },
      ].filter((s) => s.value > 0),
      centerLabel: pct(apy),
      centerSub: 'portfolio APY',
      caption: `${pct(yieldApy)} earned on ${pct(share)} of the portfolio = ${pct(apy)} blended. The other ${pct(100 - share)} earns nothing, which pulls the average down.`,
    },
    {
      id: 'income-by-asset',
      title: 'Which assets produce the income',
      slices: groupSmallSlices(bySymbol),
      centerLabel: money(income),
      centerSub: 'per year',
      caption: 'Slice size = share of estimated annual income. Open the yield-bearing drill-down for the full table.',
    },
  ];
}
