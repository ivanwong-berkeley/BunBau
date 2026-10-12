/**
 * Canonical portfolio data model ("data spine").
 * Every page (Dashboard, Calendar, Strategy, History) reads these shapes via selectors.ts.
 */

export type AssetClass =
  | 'Cash'
  | 'CD'
  | 'Treasury'
  | 'BondETF'
  | 'Stock'
  | 'ETF'
  | 'CSP'
  | 'CoveredCall'
  | 'Crypto';

export interface OptionInfo {
  underlying: string;
  strike: number;
  expiry?: string; // ISO date
  right: 'PUT' | 'CALL';
  contracts: number; // absolute number of contracts
  premium?: number;
}

export interface CanonicalPosition {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  marketValue: number;
  costBasis?: number;
  unrealizedPnl?: number;
  apy?: number; // percent, e.g. 4.5
  maturityDate?: string; // ISO date (CD / Treasury)
  option?: OptionInfo;
  institution: string;
  accountId: string;
}

export interface CanonicalAccount {
  id: string; // md5(uid + institution + maskedAccount)
  institution: string;
  maskedAccount: string;
  accountType: string;
  positions: CanonicalPosition[];
  lastImportId?: string;
  updatedAt: string; // ISO
}

/** Shape produced by the extraction step / review modal (legacy flat row). */
export interface ExtractedRow {
  symbol: string;
  value: number;
  category: string; // 'Cash' | 'CD' | 'Treasury' | 'Stock' | 'ETF' | 'CSP' | 'Covered Call' | ...
  quantity?: number;
  name?: string;
  apy?: number;
  maturityDate?: string;
  costBasis?: number;
  metadata?: {
    underlyingSymbol?: string;
    strikePrice?: number;
    expiry?: string;
    accountId?: string;
    accountType?: string;
  };
}

export interface Reconciliation {
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
  portfolioTotal?: number;
  unsettledCash?: number;
  asOfDate?: string;
}

export interface ImportRecord {
  id: string;
  institution: string;
  accountId: string;
  maskedAccount: string;
  createdAt: string;
  status: 'committed';
  positionCount: number;
  storagePaths: string[];
  storageErrors?: string[];
  approvedExtraction: ExtractionResult;
}

export interface PortfolioSnapshot {
  id: string; // e.g. snap_1730000000000
  createdAt: string; // ISO date string
  totalNetWorth: number;
  positionsCount: number;
  accountsCount: number;
  institutions: string[];
  accounts: CanonicalAccount[];
}

export type CalendarEventType = 'CD' | 'Treasury' | 'CSP' | 'CoveredCall';

export interface CalendarTimelineEvent {
  id: string;
  symbol: string;
  name: string;
  eventType: CalendarEventType;
  date: string; // ISO date YYYY-MM-DD
  daysRemaining: number;
  urgency: 'urgent' | 'soon' | 'safe' | 'expired';
  institution: string;
  marketValue: number;
  apy?: number;
  strike?: number;
  underlying?: string;
  contracts?: number;
  collateralLocked?: number;
  marketPrice?: number;
  moneynessPct?: number;
  isItm?: boolean;
  optionBadgeLabel?: string;
  position: CanonicalPosition;
}

