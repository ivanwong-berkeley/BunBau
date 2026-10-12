import fs from 'fs';
const edit = (p, pairs) => {
  let s = fs.readFileSync(p, 'utf8');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(`${p}: missing ${a.slice(0, 60)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, s);
};

edit('src/lib/portfolio/types.ts', [[
`export interface ExtractionResult {
  institution: string;
  account: string; // masked account, e.g. ***-6238
  accountType?: string;
  positions: ExtractedRow[];
}`,
`export interface Reconciliation {
  statedTotal: number; // "Account total" printed on the screenshot
  computedTotal: number; // sum of every extracted row (options are negative)
  diff: number;
  ok: boolean;
}

export interface ExtractionResult {
  institution: string;
  account: string; // masked account, e.g. ***-6238
  accountType?: string;
  positions: ExtractedRow[];
  /** Present when the screenshot shows an account total we can check the rows against. */
  reconciliation?: Reconciliation;
}`]]);

edit('src/lib/extraction/gemini.ts', [
[`    accountType: { type: 'STRING' },
    positions: {`, `    accountType: { type: 'STRING' },
    accountTotal: { type: 'NUMBER' },
    positions: {`],
[`- Skip totals/summary rows.`, `- accountTotal: the "Account total" / total value figure printed for THIS account (plain number), if visible. Do not include it as a position.
- Skip totals/summary rows.`],
]);

edit('src/lib/extraction/normalize.ts', [
[`import { ExtractionResult, ExtractedRow } from '../portfolio/types';`,
 `import { ExtractionResult, ExtractedRow } from '../portfolio/types';\nimport { BOND_ETF_SYMBOLS } from '../portfolio/selectors';`],
[`    let quantity = num(p?.quantity);`,
 `    let quantity = num(p?.quantity);
    // Short-duration bond/T-bill ETFs (SGOV, BIL...) are ETFs the user holds: list them with Equities.
    // (Allocation still buckets them as SGOV/Bonds by symbol.)
    if (BOND_ETF_SYMBOLS.has(symbol.toUpperCase()) || category === 'BondETF') category = 'ETF';`],
[`    const category = CATEGORY_ALIASES`, `    let category = CATEGORY_ALIASES`],
[`  return {
    institution,
    account,
    accountType: raw.accountType ? String(raw.accountType) : 'Brokerage',
    positions,
  };`,
`  const out: ExtractionResult = {
    institution,
    account,
    accountType: raw.accountType ? String(raw.accountType) : 'Brokerage',
    positions,
  };
  const stated = num(raw.accountTotal);
  if (stated !== undefined && stated > 0) {
    const computed = Math.round(positions.reduce((s, r) => s + r.value, 0) * 100) / 100;
    const diff = Math.round((computed - stated) * 100) / 100;
    // Allow 0.1% rounding / pricing-time noise.
    out.reconciliation = { statedTotal: stated, computedTotal: computed, diff, ok: Math.abs(diff) <= Math.max(1, stated * 0.001) };
  }
  return out;`],
]);

edit('src/lib/portfolio/selectors.ts', [[
`for (const p of positions.filter((p) => p.assetClass === 'Stock' || p.assetClass === 'ETF')) {`,
`for (const p of positions.filter((p) => p.assetClass === 'Stock' || p.assetClass === 'ETF' || p.assetClass === 'BondETF')) {`],
[`assetClass: p.assetClass as 'Stock' | 'ETF',`, `assetClass: (p.assetClass === 'Stock' ? 'Stock' : 'ETF') as 'Stock' | 'ETF',`]]);

edit('src/lib/portfolio/mockExtraction.ts', [[`value: 100008.97`, `value: 100098.97`]]);
console.log('ok');
