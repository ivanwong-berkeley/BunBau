/**
 * BunBau Dual-Source Data Ingestion Pipeline - Canonical Type Contracts
 * Location: src/lib/types/ingestion.ts
 */

import type {
  AssetClass,
  CanonicalPosition as LegacyCanonicalPosition,
  CanonicalAccount as LegacyCanonicalAccount,
  OptionInfo,
  ExtractionResult,
  ExtractedRow,
} from '../portfolio/types';

export type AssetCategory =
  | 'Cash'
  | 'CD'
  | 'Bond_SGOV'
  | 'Stock'
  | 'ETF'
  | 'Option'
  | 'Crypto';

export type DataSourceOrigin = 'SCREENSHOT' | 'CSV' | 'MERGED' | 'MANUAL';

export interface CanonicalOptionDetails {
  underlying: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expirationDate: string; // ISO 8601: YYYY-MM-DD
  isCollateralizedCsp: boolean;
  contractsCount: number; // positive integer, e.g. 1, 2
  premium?: number;
  annualizedYield?: number;
}

export interface CanonicalPosition {
  positionKey: string;
  accountKey: string;
  symbol: string;
  description: string;
  assetCategory: AssetCategory;
  quantity: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
  yieldApy?: number;
  maturityDate?: string; // ISO 8601: YYYY-MM-DD
  optionDetails?: CanonicalOptionDetails | null;
  dataSource: DataSourceOrigin;
  updatedAt: string;
}

export interface RawSourceFileMeta {
  fileHash: string;
  fileName: string;
  fileType: 'IMAGE' | 'CSV';
  storagePath: string;
}

export interface CanonicalAccountPayload {
  accountKey: string;
  institution: string;
  accountName: string;
  accountMaskedNumber: string;
  accountType: 'Brokerage' | 'Roth IRA' | 'Traditional IRA' | '401(k)' | 'Checking' | 'Savings' | 'Crypto' | string;
  totalValue: number;
  cashBalance: number;
  positions: CanonicalPosition[];
  rawSourceFiles: RawSourceFileMeta[];
  sourceType: 'SCREENSHOT' | 'CSV' | 'DUAL';
  extractedAt: string;
  version: number;
}

export type DiffChangeType = 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'REMOVED';

export interface PositionDiffItem {
  positionKey: string;
  symbol: string;
  changeType: DiffChangeType;
  before?: Partial<CanonicalPosition>;
  after: Partial<CanonicalPosition>;
  reconciledSource: DataSourceOrigin;
  notes?: string[];
}

export interface ReconciliationDiff {
  accountKey: string;
  accountName: string;
  institution: string;
  statedCashBefore: number;
  statedCashAfter: number;
  totalLockedCollateral: number;
  netFreeCash: number;
  totalValueBefore: number;
  totalValueAfter: number;
  positionDiffs: PositionDiffItem[];
  warnings: string[];
}

export interface StagingIngestionResponse {
  stagingId: string;
  accounts: CanonicalAccountPayload[];
  diffs: ReconciliationDiff[];
  warnings: string[];
}

export interface IngestionLogRecord {
  ingestionId: string;
  userId: string;
  fileHash: string;
  fileName: string;
  fileType: 'IMAGE' | 'CSV';
  sourceType: 'SCREENSHOT' | 'CSV' | 'DUAL';
  status: 'PENDING' | 'MERGED' | 'REJECTED' | 'ROLLED_BACK';
  storagePath: string;
  matchedAccountKeys: string[];
  versionGenerated: number;
  createdAt: string;
}

export interface AccountVersionRecord {
  versionId: string;
  accountKey: string;
  version: number;
  payload: CanonicalAccountPayload;
  ingestionId: string;
  createdAt: string;
  restoredFromVersion?: number;
}

// -----------------------------------------------------------------------------
// Bidirectional Backward-Compatibility Converters with Legacy Portfolio Types
// -----------------------------------------------------------------------------

export function mapCategoryToLegacyAssetClass(
  category: AssetCategory,
  optionDetails?: CanonicalOptionDetails | null
): AssetClass {
  switch (category) {
    case 'Cash':
      return 'Cash';
    case 'CD':
      return 'CD';
    case 'Bond_SGOV':
      return 'Treasury';
    case 'Stock':
      return 'Stock';
    case 'ETF':
      return 'ETF';
    case 'Crypto':
      return 'Crypto';
    case 'Option':
      if (optionDetails?.type === 'PUT') {
        return 'CSP';
      }
      return 'CoveredCall';
    default:
      return 'Stock';
  }
}

export function mapLegacyAssetClassToCategory(assetClass: AssetClass | string): AssetCategory {
  const norm = String(assetClass || '').trim().toLowerCase();
  switch (norm) {
    case 'cash':
    case 'savings':
    case 'checking':
    case 'high yield savings':
    case 'hysa':
    case 'deposit':
    case 'money market':
      return 'Cash';
    case 'cd':
    case 'certificate of deposit':
    case 'cert of deposit':
    case 'time deposit':
    case 'term deposit':
    case 'bank cd':
      return 'CD';
    case 'treasury':
    case 'treasury bill':
    case 'treasury note':
    case 'treasury bond':
    case 't-bill':
    case 'tbill':
    case 'bondetf':
    case 'bond_sgov':
    case 'bond/sgov':
    case 'fixed income':
    case 'fixed_income':
    case 'bond':
    case 'bonds':
      return 'Bond_SGOV';
    case 'stock':
    case 'equity':
      return 'Stock';
    case 'etf':
      return 'ETF';
    case 'crypto':
      return 'Crypto';
    case 'csp':
    case 'coveredcall':
    case 'covered call':
    case 'option':
      return 'Option';
    default:
      if (norm.includes('certificate of deposit') || norm.includes('time deposit') || norm === 'cd' || norm.includes(' cd') || norm.startsWith('cd ')) return 'CD';
      if (norm.includes('treasury') || norm.includes('t-bill') || norm.includes('tbill') || norm.includes('fixed income') || norm.includes('bond')) return 'Bond_SGOV';
      return 'Stock';
  }
}

export function toLegacyPosition(pos: CanonicalPosition): LegacyCanonicalPosition {
  const assetClass = mapCategoryToLegacyAssetClass(pos.assetCategory, pos.optionDetails);

  let option: OptionInfo | undefined;
  if (pos.optionDetails) {
    option = {
      underlying: pos.optionDetails.underlying,
      strike: pos.optionDetails.strike,
      expiry: pos.optionDetails.expirationDate,
      right: pos.optionDetails.type,
      contracts: pos.optionDetails.contractsCount,
      premium: pos.optionDetails.premium,
    };
  }

  return {
    id: pos.positionKey,
    symbol: pos.symbol,
    name: pos.description || pos.symbol,
    assetClass,
    quantity: pos.quantity,
    marketValue: pos.marketValue,
    costBasis: pos.costBasis > 0 ? pos.costBasis : undefined,
    unrealizedPnl: pos.unrealizedGainLoss,
    apy: pos.yieldApy,
    maturityDate: pos.maturityDate,
    option,
    institution: pos.accountKey.split('_')[1] || 'Unknown',
    accountId: pos.accountKey,
  };
}

export function toLegacyAccount(accountPayload: CanonicalAccountPayload): LegacyCanonicalAccount {
  return {
    id: accountPayload.accountKey,
    institution: accountPayload.institution,
    maskedAccount: accountPayload.accountMaskedNumber,
    accountType: accountPayload.accountType,
    positions: accountPayload.positions.map(toLegacyPosition),
    lastImportId: accountPayload.rawSourceFiles[0]?.fileHash,
    updatedAt: accountPayload.extractedAt,
  };
}

/**
 * Converts a CanonicalAccountPayload into the UI's ExtractionResult format
 * to seamlessly power table views, Ask AI, and Approve & Import workflows.
 */
export function toExtractionResult(accountPayload: CanonicalAccountPayload): ExtractionResult {
  const legacyPositions = accountPayload.positions.map(toLegacyPosition);
  const rows: ExtractedRow[] = [];

  // If cashBalance is present, add Cash row
  if (accountPayload.cashBalance > 0) {
    rows.push({
      symbol: 'Cash (USD)',
      name: 'Cash Balance',
      category: 'Cash',
      value: accountPayload.cashBalance,
      quantity: 1,
      apy: 4.95, // Prevailing money market yield
    });
  }

  for (const pos of legacyPositions) {
    const extractedRow: ExtractedRow = {
      symbol: pos.symbol,
      name: pos.name,
      category: pos.assetClass,
      value: pos.marketValue,
      quantity: pos.quantity,
      costBasis: pos.costBasis,
      apy: pos.apy,
      maturityDate: pos.maturityDate,
    };
    if (pos.option) {
      extractedRow.metadata = {
        underlyingSymbol: pos.option.underlying,
        strikePrice: pos.option.strike,
        expiry: pos.option.expiry,
      };
    }
    rows.push(extractedRow);
  }

  return {
    institution: accountPayload.institution,
    account: accountPayload.accountMaskedNumber,
    accountType: accountPayload.accountType as any,
    portfolioTotal: accountPayload.totalValue,
    unsettledCash: 0,
    asOfDate: accountPayload.extractedAt,
    positions: rows,
  };
}

/**
 * Converts a Legacy CanonicalAccount into a CanonicalAccountPayload
 * for ingestion & reconciliation processing.
 */
export function legacyAccountToPayload(
  acc: LegacyCanonicalAccount,
  userId: string = 'demo-user',
  sourceType: DataSourceOrigin = 'SCREENSHOT'
): CanonicalAccountPayload {
  let cashBalance = 0;
  const nonCashPositions: CanonicalPosition[] = [];

  for (const pos of acc.positions) {
    if (pos.assetClass === 'Cash' || pos.symbol.toLowerCase().includes('cash')) {
      cashBalance += pos.marketValue;
    } else {
      const assetCategory = mapLegacyAssetClassToCategory(pos.assetClass);
      let optionDetails: CanonicalOptionDetails | null = null;
      if (pos.option) {
        optionDetails = {
          underlying: pos.option.underlying,
          type: pos.option.right === 'PUT' ? 'PUT' : 'CALL',
          strike: pos.option.strike,
          expirationDate: pos.option.expiry || '',
          isCollateralizedCsp: pos.assetClass === 'CSP',
          contractsCount: pos.option.contracts,
          premium: pos.option.premium,
        };
      }
      nonCashPositions.push({
        positionKey: pos.id,
        accountKey: acc.id,
        symbol: pos.symbol,
        description: pos.name,
        assetCategory,
        quantity: pos.quantity ?? 1,
        costBasis: pos.costBasis || 0,
        currentPrice:
          pos.quantity && pos.quantity !== 0
            ? Math.abs(pos.marketValue / pos.quantity)
            : pos.marketValue || 0,
        marketValue: pos.marketValue || 0,
        unrealizedGainLoss: pos.unrealizedPnl || 0,
        unrealizedGainLossPct:
          pos.costBasis && pos.costBasis > 0
            ? ((pos.unrealizedPnl || 0) / pos.costBasis) * 100
            : 0,
        yieldApy: pos.apy,
        maturityDate: pos.maturityDate,
        optionDetails,
        dataSource: sourceType,
        updatedAt: acc.updatedAt || new Date().toISOString(),
      });
    }
  }

  const totalValue = cashBalance + nonCashPositions.reduce((sum, p) => sum + p.marketValue, 0);

  return {
    accountKey: acc.id,
    institution: acc.institution,
    accountName: acc.accountType || `${acc.institution} Account`,
    accountMaskedNumber: acc.maskedAccount,
    accountType: acc.accountType || 'Brokerage',
    totalValue,
    cashBalance,
    positions: nonCashPositions,
    rawSourceFiles: [],
    sourceType: sourceType === 'CSV' ? 'CSV' : 'SCREENSHOT',
    extractedAt: acc.updatedAt || new Date().toISOString(),
    version: 1,
  };
}

/**
 * Converts an ExtractionResult into a CanonicalAccountPayload
 * for dual-source reconciliation comparison.
 */
export function extractionResultToPayload(
  extraction: ExtractionResult,
  userId: string = 'demo-user',
  sourceType: DataSourceOrigin = 'CSV'
): CanonicalAccountPayload {
  let cashBalance = 0;
  const positions: CanonicalPosition[] = [];

  for (let i = 0; i < extraction.positions.length; i++) {
    const row = extraction.positions[i];
    const isCash =
      row.category === 'Cash' ||
      row.symbol.toLowerCase().includes('cash') ||
      (row.name ? row.name.toLowerCase().includes('cash') : false);

    if (isCash) {
      cashBalance += row.value;
    } else {
      const assetCategory = mapLegacyAssetClassToCategory(row.category as AssetClass);
      let optionDetails: CanonicalOptionDetails | null = null;
      if (row.metadata) {
        const isPut =
          row.category === 'CSP' ||
          (row.name ? row.name.toLowerCase().includes('put') : false) ||
          (row.metadata as any)?.type === 'PUT';
        optionDetails = {
          underlying: row.metadata.underlyingSymbol || row.symbol,
          type: isPut ? 'PUT' : 'CALL',
          strike: row.metadata.strikePrice || 0,
          expirationDate: row.metadata.expiry || '',
          isCollateralizedCsp: row.category === 'CSP' || isPut,
          contractsCount: Math.abs(row.quantity ?? 1) || 1,
        };
      }

      const calcPrice =
        (row as any).price ??
        (row.quantity && row.quantity !== 0 ? Math.abs(row.value / row.quantity) : row.value) ??
        0;

      positions.push({
        positionKey: `row_${i}_${row.symbol}`,
        accountKey: extraction.account,
        symbol: row.symbol,
        description: row.name || row.symbol,
        assetCategory,
        quantity: row.quantity ?? 1,
        costBasis: row.costBasis || 0,
        currentPrice: Number(calcPrice) || 0,
        marketValue: row.value || 0,
        unrealizedGainLoss: ((row.value || 0) - (row.costBasis || 0)),
        unrealizedGainLossPct:
          row.costBasis && row.costBasis > 0
            ? (((row.value || 0) - row.costBasis) / row.costBasis) * 100
            : 0,
        yieldApy: row.apy,
        maturityDate: row.maturityDate,
        optionDetails,
        dataSource: sourceType,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const statedTotal = extraction.reconciliation?.statedTotal ?? (extraction as any).portfolioTotal ?? 0;
  const totalValue =
    statedTotal > 0
      ? statedTotal
      : cashBalance + positions.reduce((sum, p) => sum + p.marketValue, 0);

  return {
    accountKey: extraction.account,
    institution: extraction.institution,
    accountName: extraction.accountType || `${extraction.institution} Account`,
    accountMaskedNumber: extraction.account,
    accountType: extraction.accountType || 'Brokerage',
    totalValue,
    cashBalance,
    positions,
    rawSourceFiles: [],
    sourceType: sourceType === 'CSV' ? 'CSV' : 'SCREENSHOT',
    extractedAt: new Date().toISOString(),
    version: 1,
  };
}

