/**
 * BunBau Reconciliation & Conflict Resolution Engine
 * Location: src/lib/ingestion/reconcile.ts
 */

import { generateAccountKey, generatePositionKey } from './keys';
import type {
  CanonicalAccountPayload,
  CanonicalPosition,
  ReconciliationDiff,
  PositionDiffItem,
  DiffChangeType,
} from '../types/ingestion';

export interface ReconciliationResult {
  mergedAccounts: CanonicalAccountPayload[];
  diffs: ReconciliationDiff[];
  warnings: string[];
}

export function reconcileAccounts(
  screenshotAccounts: CanonicalAccountPayload[],
  csvAccounts: CanonicalAccountPayload[],
  userId: string = 'demo-user'
): ReconciliationResult {
  const mergedAccounts: CanonicalAccountPayload[] = [];
  const diffs: ReconciliationDiff[] = [];
  const warnings: string[] = [];

  // Map accounts by normalized key
  const accountMap = new Map<
    string,
    { screenshot?: CanonicalAccountPayload; csv?: CanonicalAccountPayload }
  >();

  // Index screenshot accounts
  for (const acc of screenshotAccounts) {
    const accKey = generateAccountKey(userId, acc.institution, acc.accountMaskedNumber);
    const existing = accountMap.get(accKey) || {};
    existing.screenshot = acc;
    accountMap.set(accKey, existing);
  }

  // Index CSV accounts
  for (const acc of csvAccounts) {
    const accKey = generateAccountKey(userId, acc.institution, acc.accountMaskedNumber);
    const existing = accountMap.get(accKey) || {};
    existing.csv = acc;
    accountMap.set(accKey, existing);
  }

  for (const [accountKey, pair] of accountMap.entries()) {
    const { screenshot, csv } = pair;

    if (screenshot && !csv) {
      // Screenshot Only
      const normalizedAcc = normalizeSingleAccount(screenshot, accountKey, 'SCREENSHOT');
      mergedAccounts.push(normalizedAcc);
      diffs.push(createEmptyDiff(normalizedAcc, 'SCREENSHOT'));
      continue;
    }

    if (csv && !screenshot) {
      // CSV Only
      const normalizedAcc = normalizeSingleAccount(csv, accountKey, 'CSV');
      mergedAccounts.push(normalizedAcc);
      diffs.push(createEmptyDiff(normalizedAcc, 'CSV'));
      continue;
    }

    if (screenshot && csv) {
      // DUAL SOURCE RECONCILIATION
      const { mergedAccount, diff } = mergeDualAccount(screenshot, csv, accountKey, userId);
      mergedAccounts.push(mergedAccount);
      diffs.push(diff);
    }
  }

  return {
    mergedAccounts,
    diffs,
    warnings,
  };
}

function normalizeSingleAccount(
  acc: CanonicalAccountPayload,
  accountKey: string,
  sourceType: 'SCREENSHOT' | 'CSV'
): CanonicalAccountPayload {
  const positions: CanonicalPosition[] = acc.positions.map((pos) => {
    const dateKey = pos.optionDetails?.expirationDate || pos.maturityDate || 'NA';
    const positionKey = generatePositionKey(accountKey, pos.symbol, pos.assetCategory, dateKey);
    return {
      ...pos,
      accountKey,
      positionKey,
      dataSource: sourceType,
    };
  });

  // Calculate CSP locked collateral
  const lockedCollateral = positions.reduce((sum, p) => {
    if (p.assetCategory === 'Option' && p.optionDetails?.type === 'PUT') {
      const strike = p.optionDetails.strike || 0;
      const count = p.optionDetails.contractsCount || 1;
      return sum + strike * 100 * count;
    }
    return sum;
  }, 0);

  const totalPosValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalValue = acc.cashBalance + totalPosValue;

  return {
    ...acc,
    accountKey,
    positions,
    totalValue,
    sourceType,
  };
}

function mergeDualAccount(
  screenshot: CanonicalAccountPayload,
  csv: CanonicalAccountPayload,
  accountKey: string,
  userId: string
): { mergedAccount: CanonicalAccountPayload; diff: ReconciliationDiff } {
  const positionDiffs: PositionDiffItem[] = [];
  const mergedPositions: CanonicalPosition[] = [];
  const warnings: string[] = [];

  // Two-phase matching: first exact match, then flexible match for CDs/Bonds with missing maturity
  const remainingCsv = [...csv.positions];
  const remainingScreenshot = [...screenshot.positions];

  const matchedPairs: { csvPos?: CanonicalPosition; ssPos?: CanonicalPosition }[] = [];

  // 1. Exact matches
  for (let i = remainingCsv.length - 1; i >= 0; i--) {
    const cPos = remainingCsv[i];
    const ssIndex = remainingScreenshot.findIndex((sPos) => {
      if (cPos.assetCategory !== sPos.assetCategory) return false;
      const cSym = cPos.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const sSym = sPos.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cSym !== sSym) return false;

      if (cPos.assetCategory === 'Option') {
        return (
          cPos.optionDetails?.type === sPos.optionDetails?.type &&
          cPos.optionDetails?.strike === sPos.optionDetails?.strike &&
          cPos.optionDetails?.expirationDate === sPos.optionDetails?.expirationDate
        );
      }

      // For CDs or Bonds, exact match on maturity if both have it
      if (cPos.maturityDate && sPos.maturityDate) {
        return cPos.maturityDate === sPos.maturityDate;
      }

      return true;
    });

    if (ssIndex >= 0) {
      const matchedSS = remainingScreenshot.splice(ssIndex, 1)[0];
      remainingCsv.splice(i, 1);
      matchedPairs.push({ csvPos: cPos, ssPos: matchedSS });
    }
  }

  // 2. Unmatched CSV items
  for (const cPos of remainingCsv) {
    matchedPairs.push({ csvPos: cPos });
  }

  // 3. Unmatched Screenshot items
  for (const sPos of remainingScreenshot) {
    matchedPairs.push({ ssPos: sPos });
  }

  for (const pair of matchedPairs) {
    const { csvPos, ssPos } = pair;

    if (csvPos && !ssPos) {
      // Position only in CSV
      const dateKey = csvPos.optionDetails?.expirationDate || csvPos.maturityDate || 'NA';
      const positionKey = generatePositionKey(accountKey, csvPos.symbol, csvPos.assetCategory, dateKey);
      const pos: CanonicalPosition = {
        ...csvPos,
        accountKey,
        positionKey,
        dataSource: 'CSV',
      };
      mergedPositions.push(pos);
      positionDiffs.push({
        positionKey,
        symbol: pos.symbol,
        changeType: 'ADDED',
        after: pos,
        reconciledSource: 'CSV',
      });
      continue;
    }

    if (ssPos && !csvPos) {
      // Position only in Screenshot
      const dateKey = ssPos.optionDetails?.expirationDate || ssPos.maturityDate || 'NA';
      const positionKey = generatePositionKey(accountKey, ssPos.symbol, ssPos.assetCategory, dateKey);
      const pos: CanonicalPosition = {
        ...ssPos,
        accountKey,
        positionKey,
        dataSource: 'SCREENSHOT',
      };
      mergedPositions.push(pos);
      positionDiffs.push({
        positionKey,
        symbol: pos.symbol,
        changeType: 'ADDED',
        after: pos,
        reconciledSource: 'SCREENSHOT',
      });
      continue;
    }

    if (csvPos && ssPos) {
      // PRESENT IN BOTH -> APPLY 5-RULE PRECEDENCE
      const dateKey = csvPos.optionDetails?.expirationDate || csvPos.maturityDate || ssPos.maturityDate || 'NA';
      const positionKey = generatePositionKey(accountKey, csvPos.symbol, csvPos.assetCategory, dateKey);

      // Rule 1 & 2: CSV 100% precedence for quantity, costBasis, optionDetails
      const finalQuantity = csvPos.quantity ?? ssPos.quantity ?? 0;
      const finalCostBasis = (csvPos.costBasis && csvPos.costBasis > 0) ? csvPos.costBasis : (ssPos.costBasis || 0);
      const finalMarketValue = csvPos.marketValue !== 0 ? (csvPos.marketValue ?? 0) : (ssPos.marketValue ?? 0);
      const finalPrice =
        (csvPos.currentPrice && csvPos.currentPrice > 0)
          ? csvPos.currentPrice
          : (ssPos.currentPrice && ssPos.currentPrice > 0)
          ? ssPos.currentPrice
          : (finalQuantity !== 0 ? Math.abs(finalMarketValue / finalQuantity) : 0);

      // Rule 3: CD Maturity - CSV takes precedence, but if missing, screenshot enriches!
      const finalMaturityDate = csvPos.maturityDate || ssPos.maturityDate;
      const finalYieldApy = csvPos.yieldApy !== undefined ? csvPos.yieldApy : ssPos.yieldApy;

      const mergedPos: CanonicalPosition = {
        positionKey,
        accountKey,
        symbol: csvPos.symbol,
        description: csvPos.description || ssPos.description,
        assetCategory: csvPos.assetCategory,
        quantity: finalQuantity,
        costBasis: finalCostBasis,
        currentPrice: finalPrice,
        marketValue: finalMarketValue,
        unrealizedGainLoss: finalMarketValue - finalCostBasis,
        unrealizedGainLossPct: finalCostBasis > 0 ? ((finalMarketValue - finalCostBasis) / finalCostBasis) * 100 : 0,
        maturityDate: finalMaturityDate,
        yieldApy: finalYieldApy,
        optionDetails: csvPos.optionDetails || ssPos.optionDetails,
        dataSource: 'MERGED',
        updatedAt: new Date().toISOString(),
      };

      mergedPositions.push(mergedPos);

      const notes: string[] = [];
      if (ssPos.quantity !== csvPos.quantity) {
        notes.push(`Quantity reconciled to CSV precision (${csvPos.quantity} vs screenshot ${ssPos.quantity})`);
      }
      if (!csvPos.maturityDate && ssPos.maturityDate) {
        notes.push(`Enriched CD maturity date from screenshot (${ssPos.maturityDate})`);
      }

      positionDiffs.push({
        positionKey,
        symbol: mergedPos.symbol,
        changeType: 'UPDATED',
        before: ssPos,
        after: mergedPos,
        reconciledSource: 'MERGED',
        notes,
      });
    }
  }

  // Cash reconciliation
  const reconciledCash = csv.cashBalance > 0 ? csv.cashBalance : screenshot.cashBalance;

  // Collateral calculation
  const totalLockedCollateral = mergedPositions.reduce((sum, p) => {
    if (p.assetCategory === 'Option' && p.optionDetails?.type === 'PUT') {
      const strike = p.optionDetails.strike || 0;
      const count = p.optionDetails.contractsCount || 1;
      return sum + strike * 100 * count;
    }
    return sum;
  }, 0);

  const netFreeCash = reconciledCash - totalLockedCollateral;
  const totalPosValue = mergedPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalValue = reconciledCash + totalPosValue;

  const rawSourceFiles = [
    ...(screenshot.rawSourceFiles || []),
    ...(csv.rawSourceFiles || []),
  ];

  const mergedAccount: CanonicalAccountPayload = {
    accountKey,
    institution: csv.institution || screenshot.institution,
    accountName: csv.accountName || screenshot.accountName,
    accountMaskedNumber: csv.accountMaskedNumber || screenshot.accountMaskedNumber,
    accountType: csv.accountType || screenshot.accountType,
    totalValue,
    cashBalance: reconciledCash,
    positions: mergedPositions,
    rawSourceFiles,
    sourceType: 'DUAL',
    extractedAt: new Date().toISOString(),
    version: Math.max(csv.version || 1, screenshot.version || 1) + 1,
  };

  const diff: ReconciliationDiff = {
    accountKey,
    accountName: mergedAccount.accountName,
    institution: mergedAccount.institution,
    statedCashBefore: screenshot.cashBalance,
    statedCashAfter: reconciledCash,
    totalLockedCollateral,
    netFreeCash,
    totalValueBefore: screenshot.totalValue,
    totalValueAfter: totalValue,
    positionDiffs,
    warnings,
  };

  return { mergedAccount, diff };
}

function createEmptyDiff(
  acc: CanonicalAccountPayload,
  source: 'SCREENSHOT' | 'CSV'
): ReconciliationDiff {
  const lockedCollateral = acc.positions.reduce((sum, p) => {
    if (p.assetCategory === 'Option' && p.optionDetails?.type === 'PUT') {
      return sum + (p.optionDetails.strike || 0) * 100 * (p.optionDetails.contractsCount || 1);
    }
    return sum;
  }, 0);

  return {
    accountKey: acc.accountKey,
    accountName: acc.accountName,
    institution: acc.institution,
    statedCashBefore: acc.cashBalance,
    statedCashAfter: acc.cashBalance,
    totalLockedCollateral: lockedCollateral,
    netFreeCash: acc.cashBalance - lockedCollateral,
    totalValueBefore: acc.totalValue,
    totalValueAfter: acc.totalValue,
    positionDiffs: acc.positions.map((p) => ({
      positionKey: p.positionKey,
      symbol: p.symbol,
      changeType: 'ADDED' as DiffChangeType,
      after: p,
      reconciledSource: source,
    })),
    warnings: [],
  };
}

/**
 * De-duplicates linked parent-child sub-accounts (e.g. Fidelity Oracle 401(k) and BrokerageLink).
 * Prevents double-counting the container summary line when the detailed sub-account is present.
 */
export function reconcileLinkedSubAccounts(accounts: CanonicalAccountPayload[]): CanonicalAccountPayload[] {
  const hasBrokerageLink = accounts.some(
    (a) =>
      a.accountType === 'BrokerageLink' ||
      a.accountName.toLowerCase().includes('brokeragelink') ||
      a.accountMaskedNumber.includes('6847')
  );

  if (!hasBrokerageLink) {
    return accounts;
  }

  return accounts.map((account) => {
    const isOracle401k =
      account.accountType === '401(k)' ||
      account.accountName.toLowerCase().includes('oracle') ||
      account.accountMaskedNumber.includes('5004');

    if (!isOracle401k) {
      return account;
    }

    // Filter out the placeholder container row BROKERAGELINK
    const filteredPositions = account.positions.filter(
      (p) =>
        !p.symbol.toUpperCase().includes('BROKERAGELINK') &&
        !p.description.toUpperCase().includes('BROKERAGELINK')
    );

    const newPosValue = filteredPositions.reduce((sum, p) => sum + p.marketValue, 0);

    return {
      ...account,
      positions: filteredPositions,
      totalValue: +(newPosValue + account.cashBalance).toFixed(2),
    };
  });
}
