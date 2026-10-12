import { CanonicalAccount, CanonicalPosition, CalendarTimelineEvent, CalendarEventType } from './types';
import { AlertSettings, DEFAULT_ALERT_SETTINGS } from '../models';

/** Short-duration Treasury/bond ETFs bucketed with "SGOV/Bonds" for allocation. */
export const BOND_ETF_SYMBOLS = new Set(['SGOV', 'BIL', 'SHV', 'USFR', 'TFLO', 'SHY', 'VGSH']);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function flattenPositions(accounts: CanonicalAccount[]): CanonicalPosition[] {
  return accounts.flatMap((a) => a.positions);
}

const isOption = (p: CanonicalPosition) =>
  p.assetClass === 'CSP' ||
  p.assetClass === 'CoveredCall' ||
  (p.assetClass as string) === 'Option' ||
  !!p.option;

/** Net worth excludes option premiums (they are not owned assets). */
export function netWorth(positions: CanonicalPosition[]): number {
  return round2(positions.filter((p) => !isOption(p)).reduce((s, p) => s + p.marketValue, 0));
}

/** CSP reserve = sum(strike x 100 x contracts) over cash-secured puts. Premiums ignored. */
export function cspReserve(positions: CanonicalPosition[]): number {
  return round2(
    positions
      .filter((p) => p.assetClass === 'CSP')
      .reduce((s, p) => s + (p.option?.strike ?? 0) * 100 * (p.option?.contracts ?? Math.abs(p.quantity || 1)), 0)
  );
}

export interface CashSummary {
  rows: { institution: string; value: number }[];
  rawCash: number;
  cspReserve: number;
  netFreeCash: number;
}

export function cashSummary(positions: CanonicalPosition[]): CashSummary {
  const byInst = new Map<string, number>();
  for (const p of positions.filter((p) => p.assetClass === 'Cash')) {
    byInst.set(p.institution, (byInst.get(p.institution) ?? 0) + p.marketValue);
  }
  const rawCash = round2([...byInst.values()].reduce((s, v) => s + v, 0));
  const reserve = cspReserve(positions);
  return {
    rows: [...byInst.entries()].map(([institution, value]) => ({ institution, value: round2(value) })),
    rawCash,
    cspReserve: reserve,
    netFreeCash: round2(rawCash - reserve),
  };
}

/** Underlying symbols that are locked by an active Covered Call. */
export function coveredSymbols(positions: CanonicalPosition[]): Set<string> {
  return new Set(
    positions
      .filter(
        (p) =>
          p.assetClass === 'CoveredCall' ||
          (isOption(p) && (p.option?.right === 'CALL' || (p as any).optionType === 'Call'))
      )
      .map((p) => (p.option?.underlying ?? (p as any).underlying ?? p.symbol.split(' ')[0]).toUpperCase())
  );
}

export interface EquityRow {
  symbol: string;
  assetClass: 'Stock' | 'ETF';
  value: number;
  quantity: number;
  institutions: string[];
  covered: boolean;
  isPartialCovered?: boolean;
  coveredShares?: number;
  availableShares?: number;
}

/** Stocks & ETFs aggregated by symbol across institutions. */
export function equitiesBySymbol(positions: CanonicalPosition[]): EquityRow[] {
  // Tally covered shares per underlying symbol (contracts * 100 shares locked)
  const coveredSharesBySymbol = new Map<string, number>();
  for (const p of positions) {
    if (
      p.assetClass === 'CoveredCall' ||
      (isOption(p) && (p.option?.right === 'CALL' || (p as any).optionType === 'Call'))
    ) {
      const sym = (p.option?.underlying ?? (p as any).underlying ?? p.symbol.split(' ')[0]).toUpperCase();
      const contracts = Math.abs(p.quantity || p.option?.contracts || 1);
      coveredSharesBySymbol.set(sym, (coveredSharesBySymbol.get(sym) || 0) + contracts * 100);
    }
  }

  const map = new Map<string, EquityRow>();
  for (const p of positions.filter((p) => p.assetClass === 'Stock' || p.assetClass === 'ETF' || p.assetClass === 'BondETF')) {
    const row = map.get(p.symbol) ?? {
      symbol: p.symbol,
      assetClass: (p.assetClass === 'Stock' ? 'Stock' : 'ETF') as 'Stock' | 'ETF',
      value: 0,
      quantity: 0,
      institutions: [],
      covered: false,
    };
    row.value = round2(row.value + p.marketValue);
    row.quantity += p.quantity;
    if (!row.institutions.includes(p.institution)) row.institutions.push(p.institution);
    map.set(p.symbol, row);
  }

  for (const row of map.values()) {
    const locked = coveredSharesBySymbol.get(row.symbol.toUpperCase()) || 0;
    row.coveredShares = locked;
    row.availableShares = Math.max(0, row.quantity - locked);
    row.covered = locked >= row.quantity && row.quantity > 0;
    row.isPartialCovered = locked > 0 && locked < row.quantity;
  }

  return [...map.values()].sort((a, b) => b.value - a.value);
}

export interface CryptoRow {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  institutions: string[];
  accounts: string[];
  percentOfCrypto: number;
  percentOfPortfolio: number;
}

export const round8 = (n: number) => Math.round((n + Number.EPSILON) * 100000000) / 100000000;

/** Aggregates direct Crypto holdings by symbol with high precision quantity, cost basis and P&L. */
export function cryptoBySymbol(positions: CanonicalPosition[], totalPortfolioValue?: number): CryptoRow[] {
  const cryptoPositions = positions.filter((p) => p.assetClass === 'Crypto');
  const totalCryptoValue = cryptoPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalNet = totalPortfolioValue && totalPortfolioValue > 0
    ? totalPortfolioValue
    : positions.filter((p) => !isOption(p)).reduce((s, p) => s + p.marketValue, 0);

  const map = new Map<string, CryptoRow>();
  for (const p of cryptoPositions) {
    const sym = p.symbol.toUpperCase();
    const existing: CryptoRow = map.get(sym) ?? {
      symbol: p.symbol,
      name: p.name || (p as any).description || p.symbol,
      quantity: 0,
      currentPrice: 0,
      marketValue: 0,
      costBasis: 0,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      institutions: [] as string[],
      accounts: [] as string[],
      percentOfCrypto: 0,
      percentOfPortfolio: 0,
    };

    existing.quantity = round8(existing.quantity + p.quantity);
    existing.marketValue = round2(existing.marketValue + p.marketValue);
    existing.costBasis = round2(existing.costBasis + (p.costBasis || 0));
    if (!existing.institutions.includes(p.institution)) existing.institutions.push(p.institution);
    if (p.accountId && !existing.accounts.includes(p.accountId)) existing.accounts.push(p.accountId);
    map.set(sym, existing);
  }

  for (const row of map.values()) {
    row.currentPrice = row.quantity > 0 ? round2(row.marketValue / row.quantity) : 0;
    row.unrealizedPnl = round2(row.marketValue - row.costBasis);
    row.unrealizedPnlPct = row.costBasis > 0 ? round2(((row.marketValue - row.costBasis) / row.costBasis) * 100) : 0;
    row.percentOfCrypto = totalCryptoValue > 0 ? round2((row.marketValue / totalCryptoValue) * 100) : 0;
    row.percentOfPortfolio = totalNet > 0 ? round2((row.marketValue / totalNet) * 100) : 0;
  }

  return [...map.values()].sort((a, b) => b.marketValue - a.marketValue);
}

export function optionsList(positions: CanonicalPosition[]): CanonicalPosition[] {
  return positions.filter(isOption);
}

export interface MaturityRow {
  position: CanonicalPosition;
  maturityDate: string;
}

/** CDs / Treasuries with a maturity date, soonest first. */
export function maturities(positions: CanonicalPosition[]): MaturityRow[] {
  return positions
    .filter((p) => (p.assetClass === 'CD' || p.assetClass === 'Treasury') && p.maturityDate)
    .map((p) => ({ position: p, maturityDate: p.maturityDate as string }))
    .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime());
}

/** Extracts an ISO date YYYY-MM-DD from position fields or symbol/name text fallback. */
export function extractEventDate(pos: CanonicalPosition): string | undefined {
  if (pos.maturityDate) return pos.maturityDate.slice(0, 10);
  if (pos.option?.expiry) return pos.option.expiry.slice(0, 10);

  const text = `${pos.symbol} ${pos.name}`;

  // Match Fidelity hyphenated format: Oct-23-2026 or Oct-23-26
  const monHyphenMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})-(\d{2,4})\b/i);
  if (monHyphenMatch) {
    const year = monHyphenMatch[3].length === 2 ? `20${monHyphenMatch[3]}` : monHyphenMatch[3];
    const d = new Date(`${monHyphenMatch[1]} ${monHyphenMatch[2]}, ${year}`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Match 23-Oct-2026
  const dayMonHyphenMatch = text.match(/\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{2,4})\b/i);
  if (dayMonHyphenMatch) {
    const year = dayMonHyphenMatch[3].length === 2 ? `20${dayMonHyphenMatch[3]}` : dayMonHyphenMatch[3];
    const d = new Date(`${dayMonHyphenMatch[2]} ${dayMonHyphenMatch[1]}, ${year}`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const isoMatch = text.match(/\b(20\d\d[-/]\d{1,2}[-/]\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1].replace(/\//g, '-'));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const slashMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/(?:20)?\d\d)\b/);
  if (slashMatch) {
    const d = new Date(slashMatch[1]);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const monthMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ]+(\d{1,2})[- ,]+(20\d\d)\b/i);
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  return undefined;
}

import { calculateOptionMoneyness } from './moneyness';

/**
 * Unified chronological timeline of upcoming options expiries (CSP / Covered Call)
 * and fixed-income maturities (CDs / Treasuries).
 * Options GYR urgency is determined by moneyness (strike vs market price) when quotes are supplied.
 */
export function calendarTimelineEvents(
  positions: CanonicalPosition[],
  now: Date = new Date(),
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS,
  quotes?: Record<string, { regularMarketPrice?: number } | number>
): CalendarTimelineEvent[] {
  const events: CalendarTimelineEvent[] = [];
  const todayMs = new Date(now.toISOString().slice(0, 10)).getTime();

  for (const pos of positions) {
    let eventType: CalendarEventType | null = null;
    if (pos.assetClass === 'CD') eventType = 'CD';
    else if (pos.assetClass === 'Treasury') eventType = 'Treasury';
    else if (pos.assetClass === 'CSP') eventType = 'CSP';
    else if (pos.assetClass === 'CoveredCall') eventType = 'CoveredCall';

    if (!eventType) continue;

    // Filter by user preference toggles
    if (eventType === 'CSP' && !settings.notifyCsp) continue;
    if (eventType === 'CoveredCall' && !settings.notifyCc) continue;
    if ((eventType === 'CD' || eventType === 'Treasury') && !settings.notifyCdTreasury) continue;

    const dateStr = extractEventDate(pos);
    if (!dateStr) continue;

    const eventTime = new Date(dateStr).getTime();
    const daysRemaining = Math.round((eventTime - todayMs) / (1000 * 3600 * 24));

    let urgency: CalendarTimelineEvent['urgency'] = 'safe';
    if (daysRemaining < 0) urgency = 'expired';
    else if (daysRemaining <= (settings.urgentDays ?? 7)) urgency = 'urgent';
    else if (daysRemaining <= (settings.warningDays ?? 21)) urgency = 'soon';

    const strike = pos.option?.strike;
    const underlying = pos.option?.underlying ?? pos.symbol.split(' ')[0].toUpperCase();

    let collateralLocked: number | undefined;
    if (eventType === 'CSP') {
      const strikeVal = strike ?? 0;
      const contracts = pos.option?.contracts ?? Math.abs(pos.quantity || 1);
      collateralLocked = strikeVal * 100 * contracts;
    }

    let marketPrice: number | undefined;
    let moneynessPct: number | undefined;
    let isItm: boolean | undefined;
    let optionBadgeLabel: string | undefined;

    if (eventType === 'CSP' || eventType === 'CoveredCall') {
      const optUrgentDays = settings.optionsUrgentDays ?? 7;
      const optWarningDays = settings.optionsWarningDays ?? 14;
      const optUrgentMoneyness = settings.optionsUrgentMoneynessPct ?? 2.0;
      const optWarningMoneyness = settings.optionsWarningMoneynessPct ?? 5.0;

      if (daysRemaining < 0) {
        urgency = 'expired';
      } else if (daysRemaining <= optUrgentDays) {
        urgency = 'urgent';
      } else if (daysRemaining <= optWarningDays) {
        urgency = 'soon';
      } else {
        urgency = 'safe';
      }

      if (quotes && strike) {
        const q = quotes[underlying] || quotes[pos.symbol.toUpperCase()];
        const price = typeof q === 'number' ? q : q?.regularMarketPrice;
        if (typeof price === 'number' && price > 0) {
          const moneyness = calculateOptionMoneyness(eventType, strike, price);
          marketPrice = price;
          moneynessPct = moneyness.moneynessPct;
          isItm = moneyness.isItm;
          optionBadgeLabel = moneyness.badgeLabel;

          if (daysRemaining < 0) {
            urgency = 'expired';
          } else if (isItm || moneynessPct <= optUrgentMoneyness || daysRemaining <= optUrgentDays) {
            urgency = 'urgent';
          } else if (moneynessPct <= optWarningMoneyness || daysRemaining <= optWarningDays) {
            urgency = 'soon';
          } else {
            urgency = 'safe';
          }
        }
      }
    }

    events.push({
      id: `event:${pos.id}`,
      symbol: pos.symbol,
      name: pos.name,
      eventType,
      date: dateStr,
      daysRemaining,
      urgency,
      institution: pos.institution,
      marketValue: pos.marketValue,
      apy: pos.apy,
      strike,
      underlying,
      contracts: pos.option?.contracts ?? Math.abs(pos.quantity || 1),
      collateralLocked,
      marketPrice,
      moneynessPct,
      isItm,
      optionBadgeLabel,
      position: pos,
    });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Filtered selector for only Options expirations (CSP & CoveredCall). Urgency strictly by Moneyness when quotes available. */
export function optionsTimelineEvents(
  positions: CanonicalPosition[],
  now: Date = new Date(),
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS,
  quotes?: Record<string, { regularMarketPrice?: number } | number>
): CalendarTimelineEvent[] {
  return calendarTimelineEvents(positions, now, settings, quotes).filter(
    (e) => e.eventType === 'CSP' || e.eventType === 'CoveredCall'
  );
}

/** Filtered selector for only Fixed Income maturities (CD & Treasury). Urgency strictly by DTE. */
export function fixedIncomeTimelineEvents(
  positions: CanonicalPosition[],
  now: Date = new Date(),
  settings: AlertSettings = DEFAULT_ALERT_SETTINGS
): CalendarTimelineEvent[] {
  return calendarTimelineEvents(positions, now, settings).filter(
    (e) => e.eventType === 'CD' || e.eventType === 'Treasury'
  );
}


export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
}

export const ALLOCATION_LABELS = ['Cash', 'CDs', 'SGOV/Bonds', 'Equities', 'Crypto'] as const;

/** Allocation of owned assets (option premiums excluded, consistent with net worth). */
export function allocation(positions: CanonicalPosition[]): AllocationSlice[] {
  const totals: Record<string, number> = { Cash: 0, CDs: 0, 'SGOV/Bonds': 0, Equities: 0, Crypto: 0 };
  for (const p of positions) {
    if (isOption(p)) continue;
    if (p.assetClass === 'Cash') totals.Cash += p.marketValue;
    else if (p.assetClass === 'CD') totals.CDs += p.marketValue;
    else if (p.assetClass === 'Treasury' || p.assetClass === 'BondETF' || BOND_ETF_SYMBOLS.has(p.symbol))
      totals['SGOV/Bonds'] += p.marketValue;
    else if (p.assetClass === 'Crypto')
      totals.Crypto += p.marketValue;
    else totals.Equities += p.marketValue;
  }
  const sum = Object.values(totals).reduce((s, v) => s + v, 0);
  return ALLOCATION_LABELS.map((label) => ({
    label,
    value: round2(totals[label]),
    pct: sum > 0 ? round2((totals[label] / sum) * 100) : 0,
  }));
}

/** Value-weighted APY (percent) across owned assets. Positions without apy contribute 0. */
export interface BlendedApyBreakdown {
  /** Total owned (non-option) market value. */
  totalValue: number;
  /** Market value of owned assets that report APY > 0. */
  yieldValue: number;
  /** Market value of owned assets with no APY (counted at 0% in the portfolio figure). */
  nonYieldValue: number;
  /** Estimated annual income, identical for both bases. */
  annualIncome: number;
  /** Income / total owned value (the "Portfolio Blended APY"). */
  apyPortfolio: number;
  /** Income / yield-bearing value (the "Yield-bearing assets APY"). */
  apyYieldBearing: number;
  /** yieldValue / totalValue in percent. */
  yieldSharePct: number;
}

/**
 * Single source of truth for blended APY. Options are always excluded.
 * Portfolio APY = income / all owned assets; yield-bearing APY = income / assets with APY > 0.
 */
export function blendedApyBreakdown(positions: CanonicalPosition[]): BlendedApyBreakdown {
  const owned = positions.filter((p) => !isOption(p));
  const totalValue = owned.reduce((s, p) => s + p.marketValue, 0);
  const yielding = owned.filter((p) => (p.apy ?? 0) > 0 && p.marketValue > 0);
  const yieldValue = yielding.reduce((s, p) => s + p.marketValue, 0);
  const annualIncome = yielding.reduce((s, p) => s + p.marketValue * ((p.apy ?? 0) / 100), 0);
  return {
    totalValue,
    yieldValue,
    nonYieldValue: totalValue - yieldValue,
    annualIncome,
    apyPortfolio: totalValue > 0 ? round2((annualIncome / totalValue) * 100) : 0,
    apyYieldBearing: yieldValue > 0 ? round2((annualIncome / yieldValue) * 100) : 0,
    yieldSharePct: totalValue > 0 ? round2((yieldValue / totalValue) * 100) : 0,
  };
}

export function blendedApy(positions: CanonicalPosition[]): number {
  return blendedApyBreakdown(positions).apyPortfolio;
}

export function institutionsOf(accounts: CanonicalAccount[]): string[] {
  return [...new Set(accounts.map((a) => a.institution))].sort();
}
