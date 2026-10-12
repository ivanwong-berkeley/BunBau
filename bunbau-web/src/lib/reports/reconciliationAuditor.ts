import { CanonicalPosition, CanonicalAccount, ExtractionResult, ExtractedRow } from '../portfolio/types';
import { extractAccountSuffix } from '../portfolio/accountId';
import { escapeCsv } from './csvExporter';

export type AuditTargetMode = 'all' | 'institution' | 'account';

export interface AuditTargetScope {
  mode: AuditTargetMode;
  institution?: string;
  accountId?: string;
  accountMasked?: string;
}

export interface ScopeValidationResult {
  isValid: boolean;
  mismatches: string[];
  missingAccounts: string[];
  warnings: string[];
}

export type DiscrepancyType =
  | 'MATCHED'
  | 'QUANTITY_MISMATCH'
  | 'VALUE_MISMATCH'
  | 'MISSING_IN_PORTFOLIO'
  | 'EXTRA_IN_PORTFOLIO'
  | 'OPTION_MISMATCH'
  | 'CASH_MISMATCH';

export interface PositionAuditItem {
  symbol: string;
  assetClass: string;
  description?: string;
  statementQuantity?: number;
  portfolioQuantity?: number;
  quantityDiff?: number;
  statementValue?: number;
  portfolioValue?: number;
  valueDiff?: number;
  statementStrike?: number;
  portfolioStrike?: number;
  statementExpiry?: string;
  portfolioExpiry?: string;
  status: DiscrepancyType;
  notes?: string;
}

export interface AccountAuditReport {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  statementBalance: number;
  portfolioBalance: number;
  balanceDiff: number;
  isBalanceReconciled: boolean;
  matchedCount: number;
  discrepancyCount: number;
  items: PositionAuditItem[];
}

export interface GlobalAuditGapReport {
  timestamp: string;
  targetScope: AuditTargetScope;
  validation: ScopeValidationResult;
  accounts: AccountAuditReport[];
  totalGapsFound: number;
  overallReconciled: boolean;
}

/**
 * Normalizes institution names across variations (e.g. Citi, Citi Bank, Citibank, Citigold).
 */
export function normalizeInstitution(inst?: string): string {
  if (!inst) return '';
  const s = inst.toLowerCase().trim();
  if (s.includes('schwab')) return 'schwab';
  if (s.includes('citi')) return 'citi';
  if (s.includes('fidelity')) return 'fidelity';
  if (s.includes('webull')) return 'webull';
  return s;
}

/**
 * Checks whether two institution names refer to the same underlying financial institution.
 */
export function isSameInstitution(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return normalizeInstitution(a) === normalizeInstitution(b);
}

/**
 * Validates whether the uploaded statement extractions match the user's selected audit target scope.
 */
export function validateAuditTargetScope(
  scope: AuditTargetScope,
  extractions: ExtractionResult[],
  existingAccounts: CanonicalAccount[]
): ScopeValidationResult {
  const mismatches: string[] = [];
  const missingAccounts: string[] = [];
  const warnings: string[] = [];

  // Filter expected accounts based on scope
  let expectedAccounts = existingAccounts;
  if (scope.mode === 'institution' && scope.institution) {
    expectedAccounts = existingAccounts.filter(
      (a) => isSameInstitution(a.institution, scope.institution)
    );
  } else if (scope.mode === 'account' && scope.accountId) {
    expectedAccounts = existingAccounts.filter((a) => a.id === scope.accountId);
  }

  // Check for Target Mismatches (uploaded files from an unexpected institution)
  if (scope.mode === 'institution' && scope.institution) {
    for (const ext of extractions) {
      if (!isSameInstitution(ext.institution, scope.institution)) {
        mismatches.push(
          `Target Mismatch: Selected ${scope.institution}, but uploaded file belongs to ${ext.institution} (${ext.account}).`
        );
      }
    }
  } else if (scope.mode === 'account' && scope.accountId) {
    const target = existingAccounts.find((a) => a.id === scope.accountId);
    if (target) {
      const targetSuffix = extractAccountSuffix(target.maskedAccount || target.id);
      for (const ext of extractions) {
        const extSuffix = extractAccountSuffix(ext.account);
        if (
          !isSameInstitution(ext.institution, target.institution) ||
          (extSuffix && targetSuffix && extSuffix !== targetSuffix)
        ) {
          mismatches.push(
            `Target Mismatch: Selected ${target.institution} ${target.maskedAccount}, but uploaded file is for ${ext.institution} (${ext.account}).`
          );
        }
      }
    }
  }

  // Check for Missing Accounts within selected scope
  for (const exp of expectedAccounts) {
    const expSuffix = extractAccountSuffix(exp.maskedAccount || exp.id);
    const hasStatement = extractions.some((ext) => {
      const extSuffix = extractAccountSuffix(ext.account);
      return (
        isSameInstitution(ext.institution, exp.institution) &&
        (!expSuffix || !extSuffix || expSuffix === extSuffix)
      );
    });

    if (!hasStatement) {
      missingAccounts.push(`${exp.institution} ${exp.maskedAccount} (${exp.accountType})`);
    }
  }

  if (missingAccounts.length > 0 && scope.mode !== 'account') {
    warnings.push(
      `Missing statement upload for ${missingAccounts.length} account(s): ${missingAccounts.join(', ')}.`
    );
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    missingAccounts,
    warnings,
  };
}

/**
 * Consolidates multiple statement extractions belonging to the same account into a single coherent extraction.
 * Merges position rows by symbol and category, preventing duplicate rows from multi-screenshot sequences.
 */
export function consolidateStatementExtractions(extractions: ExtractionResult[]): ExtractionResult[] {
  const grouped = new Map<string, ExtractionResult>();

  for (const ext of extractions) {
    const suffix = extractAccountSuffix(ext.account) || 'UNKNOWN';
    const key = `${normalizeInstitution(ext.institution)}__${suffix.toLowerCase()}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        institution: ext.institution,
        account: ext.account,
        accountType: ext.accountType,
        portfolioTotal: ext.portfolioTotal,
        asOfDate: ext.asOfDate,
        positions: [...ext.positions],
        reconciliation: ext.reconciliation ? { ...ext.reconciliation } : undefined,
      });
    } else {
      const existing = grouped.get(key)!;
      const existingDate = existing.asOfDate || '';
      const newDate = ext.asOfDate || '';

      if (newDate && existingDate && newDate > existingDate) {
        // Strictly newer statement replaces older one
        grouped.set(key, {
          institution: ext.institution,
          account: ext.account,
          accountType: ext.accountType,
          portfolioTotal: ext.portfolioTotal,
          asOfDate: ext.asOfDate,
          positions: [...ext.positions],
          reconciliation: ext.reconciliation ? { ...ext.reconciliation } : undefined,
        });
      } else if (newDate && existingDate && existingDate > newDate) {
        // Older statement file; ignore
        continue;
      } else {
        // Same date or missing date: Merge unique positions by symbol + category
        for (const p of ext.positions) {
          const pSym = p.symbol.toUpperCase().trim();
          const pCat = (p.category || 'Stock').toUpperCase();
          const alreadyExists = existing.positions.some(
            (ep) =>
              ep.symbol.toUpperCase().trim() === pSym &&
              (ep.category || 'Stock').toUpperCase() === pCat
          );
          if (!alreadyExists) {
            existing.positions.push(p);
          }
        }
        // Balance takes the latest or maximum stated balance from the sequence
        if (ext.portfolioTotal && (!existing.portfolioTotal || ext.portfolioTotal > existing.portfolioTotal)) {
          existing.portfolioTotal = ext.portfolioTotal;
        }
        if (
          ext.reconciliation?.statedTotal &&
          (!existing.reconciliation?.statedTotal || ext.reconciliation.statedTotal > existing.reconciliation.statedTotal)
        ) {
          if (!existing.reconciliation) {
            existing.reconciliation = { ...ext.reconciliation };
          } else {
            existing.reconciliation.statedTotal = ext.reconciliation.statedTotal;
          }
        }
      }
    }
  }

  return Array.from(grouped.values());
}

/**
 * Executes a deep audit gap analysis comparing fresh statement extractions against current portfolio positions.
 */
export function runStatementReconciliationAudit(
  scope: AuditTargetScope,
  extractions: ExtractionResult[],
  portfolioAccounts: CanonicalAccount[],
  portfolioPositions: CanonicalPosition[]
): GlobalAuditGapReport {
  const validation = validateAuditTargetScope(scope, extractions, portfolioAccounts);
  const accountReports: AccountAuditReport[] = [];
  let totalGaps = 0;

  // 1. Consolidate multi-file extractions by unique account
  const consolidated = consolidateStatementExtractions(extractions);

  // 2. Filter consolidated extractions strictly to target scope
  let scopedExtractions = consolidated;
  if (scope.mode === 'account' && scope.accountId) {
    const targetAccount = portfolioAccounts.find((a) => a.id === scope.accountId);
    const targetSuffix = extractAccountSuffix(targetAccount?.maskedAccount || targetAccount?.id || '');
    scopedExtractions = consolidated.filter((ext) => {
      const extSuffix = extractAccountSuffix(ext.account);
      return (
        isSameInstitution(ext.institution, targetAccount?.institution) &&
        (!targetSuffix || !extSuffix || targetSuffix === extSuffix)
      );
    });
  } else if (scope.mode === 'institution' && scope.institution) {
    scopedExtractions = consolidated.filter(
      (ext) => isSameInstitution(ext.institution, scope.institution)
    );
  }

  const processedAccountIds = new Set<string>();

  for (const ext of scopedExtractions) {
    const extSuffix = extractAccountSuffix(ext.account);

    // Find corresponding portfolio account
    let parentAccount = portfolioAccounts.find((a) => {
      const aSuffix = extractAccountSuffix(a.maskedAccount || a.id);
      return (
        isSameInstitution(a.institution, ext.institution) &&
        (!aSuffix || !extSuffix || aSuffix === extSuffix)
      );
    });

    if (!parentAccount) {
      parentAccount = portfolioAccounts.find((a) => isSameInstitution(a.institution, ext.institution));
    }

    const accountId = parentAccount?.id || ext.account;
    if (processedAccountIds.has(accountId)) continue;
    processedAccountIds.add(accountId);
    const accountMasked = parentAccount?.maskedAccount || `***-${extSuffix || 'NEW'}`;
    const accountType = parentAccount?.accountType || ext.accountType || 'Brokerage';

    // Account positions currently in BunBau
    const currentPositions = parentAccount
      ? portfolioPositions.filter((p) => p.accountId === parentAccount.id)
      : [];

    const statementBalance = ext.reconciliation?.statedTotal ?? ext.portfolioTotal ?? 0;

    const statementOptionsSum = ext.positions
      .filter((p) => p.category === 'CoveredCall' || p.category === 'CSP' || p.category === 'Option')
      .reduce((s, p) => s + (p.value || 0), 0);

    const statementNonOptionsSum = ext.positions
      .filter((p) => !(p.category === 'CoveredCall' || p.category === 'CSP' || p.category === 'Option'))
      .reduce((s, p) => s + (p.value || 0), 0);

    const statementAllSum = statementNonOptionsSum + statementOptionsSum;

    // Detect if statement balance includes options (e.g. Fidelity/Schwab liquidation value) or excludes them (e.g. WeBull gross equity)
    const statementIncludesOptions =
      statementOptionsSum !== 0 &&
      Math.abs(statementBalance - statementAllSum) < Math.abs(statementBalance - statementNonOptionsSum);

    const currentWorth = statementIncludesOptions
      ? currentPositions.reduce((s, p) => s + p.marketValue, 0)
      : currentPositions
          .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
          .reduce((s, p) => s + p.marketValue, 0);

    let linkedContainerAdjustment = 0;

    const items: PositionAuditItem[] = [];
    const matchedPortfolioIds = new Set<string>();

    // 1. Audit each row from the fresh statement
    for (const sRow of ext.positions) {
      const sSym = sRow.symbol.toUpperCase().trim();
      const sCat = sRow.category || 'Stock';
      const sQty = sRow.quantity || 1;
      const sVal = sRow.value;
      const sStrike = sRow.metadata?.strikePrice;
      const sExpiry = sRow.metadata?.expiry;

      // Find candidate in portfolio
      const candidateIdx = currentPositions.findIndex((p, idx) => {
        if (matchedPortfolioIds.has(p.id || String(idx))) return false;
        const pSym = p.symbol.toUpperCase().trim();
        const isCashMatch =
          (p.assetClass === 'Cash' || pSym.includes('CASH') || pSym === 'USD') &&
          (sCat === 'Cash' || sSym.includes('CASH') || sSym === 'USD');
        const isCryptoMatch =
          (p.assetClass === 'Crypto' || sCat === 'Crypto') &&
          (pSym === sSym ||
            pSym.replace('/USD', '') === sSym.replace('/USD', '') ||
            (pSym.includes('BTC') && sSym.includes('BTC')) ||
            (pSym.includes('ETH') && sSym.includes('ETH')));
        return isCashMatch || isCryptoMatch || pSym === sSym || pSym.split(' ')[0] === sSym.split(' ')[0];
      });

      if (candidateIdx === -1) {
        // Check if this is a linked sub-account container row (e.g. BROKERAGELINK in Oracle 401(k))
        const isBrokerageLinkContainer =
          sSym.includes('BROKERAGELINK') ||
          (sRow.name && sRow.name.toUpperCase().includes('BROKERAGELINK'));

        const linkedSubAccount = portfolioAccounts.find((a) => {
          const aSuffix = extractAccountSuffix(a.maskedAccount || a.id);
          return (
            a.institution.toLowerCase() === ext.institution.toLowerCase() &&
            (a.accountType === 'BrokerageLink' || aSuffix === '6847')
          );
        });

        if (isBrokerageLinkContainer && linkedSubAccount) {
          items.push({
            symbol: sRow.symbol,
            assetClass: sCat,
            description: sRow.name,
            statementQuantity: sQty,
            portfolioQuantity: sQty,
            quantityDiff: 0,
            statementValue: sVal,
            portfolioValue: sVal,
            valueDiff: 0,
            status: 'MATCHED',
            notes: `Linked Sub-Account Container Reconciled to BrokerageLink (${linkedSubAccount.maskedAccount}).`,
          });
          linkedContainerAdjustment += sVal;
        } else {
          // Missing in portfolio
          items.push({
            symbol: sRow.symbol,
            assetClass: sCat,
            description: sRow.name,
            statementQuantity: sQty,
            portfolioQuantity: 0,
            quantityDiff: sQty,
            statementValue: sVal,
            portfolioValue: 0,
            valueDiff: sVal,
            statementStrike: sStrike,
            statementExpiry: sExpiry,
            status: 'MISSING_IN_PORTFOLIO',
            notes: 'Present on statement, missing from portfolio.',
          });
          totalGaps++;
        }
      } else {
        const candidate = currentPositions[candidateIdx];
        matchedPortfolioIds.add(candidate.id || String(candidateIdx));

        const pQty = candidate.quantity || 0;
        const pVal = candidate.marketValue || 0;
        const qtyDiff = Math.abs(pQty - sQty);
        const valDiff = Math.abs(pVal - sVal);

        const isCash =
          candidate.assetClass === 'Cash' ||
          candidate.symbol.toUpperCase().includes('CASH') ||
          candidate.symbol.toUpperCase() === 'USD' ||
          sCat === 'Cash' ||
          sSym.includes('CASH') ||
          sSym === 'USD';

        const isCrypto = candidate.assetClass === 'Crypto' || sCat === 'Crypto';
        const isQtyMismatch = !isCash && (isCrypto ? qtyDiff > 0.00001 : qtyDiff > 0.005);
        const isValMismatch = valDiff > 0.10;

        let status: DiscrepancyType = 'MATCHED';
        let notes = 'Exact match.';

        if (candidate.assetClass === 'CoveredCall' || candidate.assetClass === 'CSP') {
          const pStrike = candidate.option?.strike;
          const pExpiry = candidate.option?.expiry;
          if (sStrike && pStrike && Math.abs(sStrike - pStrike) > 0.01) {
            status = 'OPTION_MISMATCH';
            notes = `Option strike variance (Statement: ${sStrike}, Portfolio: ${pStrike}).`;
            totalGaps++;
          }
        } else if (isQtyMismatch) {
          status = 'QUANTITY_MISMATCH';
          notes = `Share count variance (Statement: ${sQty}, Portfolio: ${pQty}).`;
          totalGaps++;
        } else if (isValMismatch) {
          status = 'VALUE_MISMATCH';
          notes = `Value variance (Statement: $${sVal}, Portfolio: $${pVal}).`;
          totalGaps++;
        }

        const effectiveQtyDiff = isCash
          ? 0
          : isCrypto
          ? Math.round((sQty - pQty) * 100000000) / 100000000
          : Math.round((sQty - pQty) * 100000) / 100000;

        items.push({
          symbol: candidate.symbol,
          assetClass: candidate.assetClass,
          description: candidate.name,
          statementQuantity: sQty,
          portfolioQuantity: isCash ? sQty : pQty,
          quantityDiff: effectiveQtyDiff,
          statementValue: sVal,
          portfolioValue: pVal,
          valueDiff: Math.round((sVal - pVal) * 100) / 100,
          statementStrike: sStrike,
          portfolioStrike: candidate.option?.strike,
          statementExpiry: sExpiry,
          portfolioExpiry: candidate.option?.expiry,
          status,
          notes,
        });
      }
    }

    // 2. Identify extra positions in portfolio not on statement
    currentPositions.forEach((p, idx) => {
      if (!matchedPortfolioIds.has(p.id || String(idx))) {
        items.push({
          symbol: p.symbol,
          assetClass: p.assetClass,
          description: p.name,
          statementQuantity: 0,
          portfolioQuantity: p.quantity,
          quantityDiff: -p.quantity,
          statementValue: 0,
          portfolioValue: p.marketValue,
          valueDiff: -p.marketValue,
          portfolioStrike: p.option?.strike,
          portfolioExpiry: p.option?.expiry,
          status: 'EXTRA_IN_PORTFOLIO',
          notes: 'Present in portfolio, missing from fresh statement.',
        });
        totalGaps++;
      }
    });

    const matchedCount = items.filter((i) => i.status === 'MATCHED').length;
    const discrepancyCount = items.length - matchedCount;

    const effectiveStatementBalance = Math.round((statementBalance - linkedContainerAdjustment) * 100) / 100;
    const balanceDiff = Math.round((currentWorth - effectiveStatementBalance) * 100) / 100;
    const isBalanceReconciled = effectiveStatementBalance > 0 ? Math.abs(balanceDiff) <= 0.05 : true;

    accountReports.push({
      institution: ext.institution,
      accountId,
      accountMasked,
      accountType,
      statementBalance: effectiveStatementBalance,
      portfolioBalance: currentWorth,
      balanceDiff,
      isBalanceReconciled,
      matchedCount,
      discrepancyCount,
      items,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    targetScope: scope,
    validation,
    accounts: accountReports,
    totalGapsFound: totalGaps,
    overallReconciled: totalGaps === 0 && accountReports.length > 0 && accountReports.every((a) => a.isBalanceReconciled),
  };
}

/**
 * Formats the audit gap report into CSV format for downloading and auditing.
 */
export function generateAuditGapCsv(report: GlobalAuditGapReport): string {
  const lines: string[] = [];

  lines.push('BUNBAU STATEMENT RECONCILIATION AUDIT GAP REPORT');
  lines.push(`Audit Timestamp,${escapeCsv(report.timestamp)}`);
  lines.push(`Scope Mode,${escapeCsv(report.targetScope.mode)}`);
  lines.push(`Target Institution,${escapeCsv(report.targetScope.institution || 'All')}`);
  lines.push(`Target Account,${escapeCsv(report.targetScope.accountMasked || 'All')}`);
  lines.push(`Total Gaps / Discrepancies,${report.totalGapsFound}`);
  lines.push(`Overall Audit Status,${report.overallReconciled ? 'RECONCILED (100% MATCH)' : 'DISCREPANCIES IDENTIFIED'}`);
  lines.push('');

  for (const acc of report.accounts) {
    lines.push(`--- ACCOUNT: ${acc.institution} ${acc.accountMasked} (${acc.accountType}) ---`);
    lines.push(`Statement Total,$${acc.statementBalance.toFixed(2)}`);
    lines.push(`Portfolio Total,$${acc.portfolioBalance.toFixed(2)}`);
    lines.push(`Variance,$${acc.balanceDiff.toFixed(2)}`);
    lines.push(`Account Status,${acc.isBalanceReconciled ? 'Reconciled' : 'Variance'}`);
    lines.push(`Matched Items,${acc.matchedCount}`);
    lines.push(`Discrepancies,${acc.discrepancyCount}`);
    lines.push('');

    lines.push(
      [
        'Symbol',
        'Asset Class',
        'Audit Status',
        'Statement Qty',
        'Portfolio Qty',
        'Qty Diff',
        'Statement Value',
        'Portfolio Value',
        'Value Diff',
        'Notes',
      ].join(',')
    );

    for (const item of acc.items) {
      lines.push(
        [
          escapeCsv(item.symbol),
          escapeCsv(item.assetClass),
          escapeCsv(item.status),
          item.statementQuantity !== undefined ? item.statementQuantity : '',
          item.portfolioQuantity !== undefined ? item.portfolioQuantity : '',
          item.quantityDiff !== undefined ? item.quantityDiff : '',
          item.statementValue !== undefined ? `$${item.statementValue.toFixed(2)}` : '',
          item.portfolioValue !== undefined ? `$${item.portfolioValue.toFixed(2)}` : '',
          item.valueDiff !== undefined ? `$${item.valueDiff.toFixed(2)}` : '',
          escapeCsv(item.notes || ''),
        ].join(',')
      );
    }
    lines.push('');
  }

  return lines.join('\r\n');
}
