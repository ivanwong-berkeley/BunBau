import { ExtractionResult, ExtractedRow } from '../portfolio/types';
import { BOND_ETF_SYMBOLS } from '../portfolio/selectors';
import { extractAccountSuffix } from '../portfolio/accountId';

/** Categories the rest of the app understands (see portfolio/adapter.ts CATEGORY_MAP). */
export const ALLOWED_CATEGORIES = [
  'Cash', 'CD', 'Treasury', 'BondETF', 'Stock', 'ETF', 'CSP', 'Covered Call', 'Crypto',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  cash: 'Cash', 'money market': 'Cash', sweep: 'Cash', savings: 'Cash', checking: 'Cash', 'high yield savings': 'Cash', hysa: 'Cash', deposit: 'Cash',
  cd: 'CD', 'certificate of deposit': 'CD', 'cert of deposit': 'CD', 'time deposit': 'CD', 'term deposit': 'CD', 'bank cd': 'CD',
  treasury: 'Treasury', 'treasury bill': 'Treasury', 'treasury note': 'Treasury', 'treasury bond': 'Treasury', 't-bill': 'Treasury', tbill: 'Treasury', 't-note': 'Treasury', 'bond/sgov': 'Treasury', 'fixed income': 'Treasury', 'fixed_income': 'Treasury', bond: 'Treasury', bonds: 'Treasury',
  bondetf: 'BondETF', 'bond etf': 'BondETF',
  stock: 'Stock', equity: 'Stock', equities: 'Stock',
  etf: 'ETF', 'mutual fund': 'ETF', fund: 'ETF',
  csp: 'CSP', 'cash secured put': 'CSP', 'cash-secured put': 'CSP', put: 'CSP',
  'covered call': 'Covered Call', coveredcall: 'Covered Call', cc: 'Covered Call', call: 'Covered Call',
  crypto: 'Crypto',
};

export class ExtractionError extends Error {}

export interface ExtractionHints {
  institution?: string;
  account?: string;
  accountType?: string;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const neg = /^\(.*\)$/.test(v.trim());
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    if (Number.isFinite(n)) return neg ? -Math.abs(n) : n;
  }
  return undefined;
}

function isoDate(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const str = v.trim();

  // Try standard parse first (ISO, YYYY-MM-DD, MM/DD/YYYY)
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // Hyphenated month formats: Oct-23-2026, 23-Oct-2026, Oct-23-26
  const monHyphenMatch = str.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})-(\d{2,4})\b/i);
  if (monHyphenMatch) {
    const year = monHyphenMatch[3].length === 2 ? `20${monHyphenMatch[3]}` : monHyphenMatch[3];
    const parsed = new Date(`${monHyphenMatch[1]} ${monHyphenMatch[2]}, ${year}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const dayMonHyphenMatch = str.match(/\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{2,4})\b/i);
  if (dayMonHyphenMatch) {
    const year = dayMonHyphenMatch[3].length === 2 ? `20${dayMonHyphenMatch[3]}` : dayMonHyphenMatch[3];
    const parsed = new Date(`${dayMonHyphenMatch[2]} ${dayMonHyphenMatch[1]}, ${year}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

function extractDateFromText(text: string): string | undefined {
  if (!text) return undefined;
  // Match Oct-23-2026 or 23-Oct-2026
  const match1 = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})-(\d{2,4})\b/i);
  if (match1) {
    const year = match1[3].length === 2 ? `20${match1[3]}` : match1[3];
    const parsed = new Date(`${match1[1]} ${match1[2]}, ${year}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  // Match YYYY-MM-DD or MM/DD/YYYY
  const match2 = text.match(/\b(20\d\d[-/]\d{1,2}[-/]\d{1,2})\b/);
  if (match2) {
    const parsed = new Date(match2[1].replace(/\//g, '-'));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const match3 = text.match(/\b(\d{1,2}\/\d{1,2}\/(?:20)?\d\d)\b/);
  if (match3) {
    const parsed = new Date(match3[1]);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  // Match "Oct 23 2026" or "Oct 23, 2026"
  const match4 = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(20\d\d)\b/i);
  if (match4) {
    const parsed = new Date(`${match4[1]} ${match4[2]}, ${match4[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Validate + clean whatever the model returned. Throws ExtractionError when nothing usable came back,
 * so the UI can show a real error instead of importing garbage.
 */
export function normalizeExtraction(raw: any, hints?: ExtractionHints): ExtractionResult {
  if (!raw || typeof raw !== 'object') throw new ExtractionError('The AI returned no data.');
  const PLACEHOLDER = /^(unknown|n\/a|na|none|null|not (visible|found|available|shown)|unidentified|-+)$|not visible/i;

  let institution = String(raw.institution ?? '').trim();
  if (!institution || PLACEHOLDER.test(institution)) {
    if (hints?.institution) {
      institution = hints.institution;
    } else {
      throw new ExtractionError('Could not identify the institution in the screenshot. Is this a brokerage positions screen?');
    }
  }

  let account = String(raw.account ?? raw.maskedAccount ?? '').trim();
  if (!account || PLACEHOLDER.test(account)) {
    if (hints?.account) {
      account = hints.account.startsWith('***-') ? hints.account : `***-${extractAccountSuffix(hints.account)}`;
    } else if (raw.accountType || hints?.accountType) {
      const typeStr = String(raw.accountType || hints?.accountType || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();
      account = `***-${typeStr || 'MAIN'}`;
    } else {
      throw new ExtractionError('Could not find an account number in the screenshot.');
    }
  }

  if (!Array.isArray(raw.positions) || raw.positions.length === 0) {
    throw new ExtractionError('No positions were found in the screenshot.');
  }

  const positions: ExtractedRow[] = [];
  for (const p of raw.positions) {
    const symbol = String(p?.symbol ?? '').trim();
    let value = num(p?.value);
    if (!symbol || value === undefined) continue;
    let category = CATEGORY_ALIASES[String(p?.category ?? '').trim().toLowerCase()]
      ?? (ALLOWED_CATEGORIES as readonly string[]).find((c) => c.toLowerCase() === String(p?.category ?? '').trim().toLowerCase())
      ?? 'Stock';
    const combinedText = `${symbol} ${p?.name ?? ''} ${raw.accountType ?? ''}`;
    // Heuristic CD and Treasury recovery if category fell back to Stock:
    if (category === 'Stock') {
      const lowerText = combinedText.toLowerCase();
      if (
        lowerText.includes('certificate of deposit') ||
        lowerText.includes('time deposit') ||
        /\bcd\b/i.test(symbol) ||
        /\bcd\b/i.test(String(p?.name ?? '')) ||
        String(raw.accountType ?? '').toLowerCase().includes('certificate of deposit')
      ) {
        category = 'CD';
      } else if (
        lowerText.includes('treasury') ||
        lowerText.includes('t-bill') ||
        lowerText.includes('tbill') ||
        lowerText.includes('fixed income')
      ) {
        category = 'Treasury';
      }
    }

    let quantity = num(p?.quantity);
    // Short-duration bond/T-bill ETFs (SGOV, BIL...) are ETFs the user holds: list them with Equities.
    // (Allocation still buckets them as SGOV/Bonds by symbol.)
    if (BOND_ETF_SYMBOLS.has(symbol.toUpperCase()) || category === 'BondETF') category = 'ETF';
    const isOption = category === 'CSP' || category === 'Covered Call';
    if (isOption) {
      // Short options are liabilities: value and quantity are always negative.
      value = -Math.abs(value);
      quantity = quantity === undefined ? -1 : -Math.abs(quantity);
    }
    const row: ExtractedRow = { symbol, value, category };
    if (quantity !== undefined) row.quantity = quantity;
    if (p?.name) row.name = String(p.name);
    let apy = num(p?.apy);
    if (apy === undefined && (category === 'CD' || category === 'Treasury' || category === 'Cash')) {
      const apyMatch = combinedText.match(/\b(\d+(?:\.\d+)?)\s*%/);
      if (apyMatch) {
        apy = parseFloat(apyMatch[1]);
      }
    }
    if (apy !== undefined) row.apy = apy;
    const maturity = isoDate(p?.maturityDate) ?? (category === 'CD' || category === 'Treasury' ? extractDateFromText(`${symbol} ${p?.name ?? ''}`) : undefined);
    if (maturity) row.maturityDate = maturity;
    const cost = num(p?.costBasis);
    if (cost !== undefined) row.costBasis = cost;
    if (isOption) {
      // Models sometimes omit strikePrice; recover it from text like "AAPL 310 Put" / "AAPL Dec 18 2026 $310 P".
      const m = symbol.match(/\$?(\d+(?:\.\d+)?)\s*(?:put|call|p|c)\b/i);
      const strike = num(p?.strikePrice) ?? (m ? parseFloat(m[1]) : undefined);
      const expiry = isoDate(p?.expiry) ?? extractDateFromText(`${symbol} ${p?.name ?? ''}`);
      row.metadata = {
        underlyingSymbol: String(p?.underlyingSymbol ?? symbol.split(' ')[0]).trim(),
        ...(strike !== undefined ? { strikePrice: strike } : {}),
        ...(expiry ? { expiry } : {}),
      };
    }
    positions.push(row);
  }
  if (positions.length === 0) throw new ExtractionError('No valid positions could be read from the screenshot.');

  const out: ExtractionResult = {
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
    out.portfolioTotal = stated;
    (out as any).accountTotal = stated;
    out.reconciliation = { statedTotal: stated, computedTotal: computed, diff, ok: Math.abs(diff) <= Math.max(1, stated * 0.001) };
  }
  return out;
}

/** Combine results from several screenshots of the same account (de-dupe by symbol+category). */
export function mergeExtractions(parts: ExtractionResult[]): ExtractionResult {
  if (parts.length === 0) throw new ExtractionError('Nothing to merge.');
  const first = parts[0];
  const seen = new Map<string, ExtractedRow>();
  for (const part of parts) {
    for (const row of part.positions) seen.set(`${row.category}|${row.symbol}`, row);
  }
  return { ...first, positions: Array.from(seen.values()) };
}
