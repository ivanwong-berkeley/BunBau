import { CanonicalPosition, CanonicalAccount, AssetClass } from './types';
import { parseFilenameMetadata, FilenameMetadata } from '../ingestion/filenameParser';
import { extractAccountSuffix } from './accountId';

export interface RawVisionScreenExtraction {
  fileName?: string;
  institution?: string;
  account?: string;
  accountType?: string;
  asOfDate?: string;
  netAccountValue?: number;
  cashBalance?: number;
  settledCash?: number;
  myPositionsCount?: number;
  positions: RawVisionPosition[];
}

export interface RawVisionPosition {
  symbol: string;
  description?: string;
  name?: string;
  category?: string;
  assetClass?: AssetClass | string;
  quantity: number;
  currentPrice?: number;
  costBasis?: number;
  marketValue?: number;
  unrealizedPnl?: number;
  openPnlPercent?: number;
  isCovered?: boolean;
  apy?: number;
  maturityDate?: string;
  // Options fields
  underlying?: string;
  strikePrice?: number;
  expirationDate?: string;
  optionType?: 'Call' | 'Put' | string;
  // WeBull tree grouping indicator
  isCoveredOptionGroup?: boolean;
  coveredChildren?: RawVisionPosition[];
}

export interface StitchedAccountResult {
  accountId: string;
  accountMasked: string;
  accountType: string;
  institution: string;
  asOfDate: string;
  netAccountValue?: number;
  cashBalance: number;
  settledCash: number;
  expectedPositionsCount?: number;
  deduplicatedPositions: CanonicalPosition[];
  overlapDuplicatesRemoved: number;
  isCountVerified: boolean;
  screenshotCount: number;
}

export interface StitchedBatchResult {
  accounts: StitchedAccountResult[];
  totalScreenshots: number;
  totalOverlapsRemoved: number;
  totalPositionsReconciled: number;
}

/**
 * Normalizes a position signature for intra-account scrolling overlap detection.
 */
function getIntraAccountSignature(pos: CanonicalPosition): string {
  if (pos.assetClass === 'CoveredCall' || pos.assetClass === 'CSP' || pos.option) {
    const underlying = (pos.option?.underlying || pos.symbol.split(' ')[0]).toUpperCase().replace(/\s+COVERED OPTION$/i, '').trim();
    const strike = pos.option?.strike || 0;
    const right = pos.option?.right || 'CALL';
    const contracts = pos.option?.contracts || Math.abs(pos.quantity) || 1;
    const expiry = pos.option?.expiry || '';
    return `OPT:${underlying}:${strike}:${right}:${contracts}:${expiry}`;
  }

  // Stock / ETF / Crypto: match symbol and share quantity (rounded to 4 decimal places)
  const sym = pos.symbol.toUpperCase().replace(/\s+COVERED OPTION$/i, '').replace(/^C-STK\s+/i, '').trim();
  const qty = Number(pos.quantity.toFixed(4));
  return `EQ:${sym}:${qty}`;
}

/**
 * Extracts a numeric sequence ID from filename or imageSeq (e.g. "IMG_6696" -> 6696).
 */
export function extractSequenceNumber(item: {
  fileName?: string;
  name?: string;
  imageSeq?: string;
}): number {
  const str = item.fileName || item.name || item.imageSeq || '';
  const match = str.match(/IMG[-_]?(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  const genericNum = str.match(/(\d+)/);
  return genericNum ? parseInt(genericNum[1], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * Orders screenshots within an account dataset into their natural scrolling sequence.
 * Top overview screens (with netAccountValue or myPositionsCount) are anchored first,
 * followed by ascending sequence numbers (e.g. IMG_6696 -> IMG_6697 -> IMG_6698 -> IMG_6699).
 */
export function orderScreenshotsInDataset<
  T extends {
    fileName?: string;
    name?: string;
    imageSeq?: string;
    netAccountValue?: number;
    myPositionsCount?: number;
  }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. If one has top header overview (netAccountValue > 0 or myPositionsCount > 0) and the other doesn't, anchor header first
    const aIsTop =
      (a.netAccountValue !== undefined && a.netAccountValue > 0) ||
      (a.myPositionsCount !== undefined && a.myPositionsCount > 0);
    const bIsTop =
      (b.netAccountValue !== undefined && b.netAccountValue > 0) ||
      (b.myPositionsCount !== undefined && b.myPositionsCount > 0);
    if (aIsTop && !bIsTop) return -1;
    if (!aIsTop && bIsTop) return 1;

    // 2. Sort by sequence number ascending (e.g. 6696 < 6697 < 6698 < 6699)
    const seqA = extractSequenceNumber(a);
    const seqB = extractSequenceNumber(b);
    if (seqA !== seqB) return seqA - seqB;

    // 3. Fallback to filename alphabetical
    const nameA = a.fileName || a.name || '';
    const nameB = b.fileName || b.name || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Stitches multi-screenshot extractions into deduplicated canonical accounts.
 * Eliminates consecutive scrolling overlaps within the same account while strictly
 * preserving identical symbols that coexist across different accounts.
 */
export function stitchWebullScreenshots(
  extractions: RawVisionScreenExtraction[]
): StitchedBatchResult {
  // 1. Group extractions by Account ID
  const accountClusters = new Map<string, { meta: FilenameMetadata; screens: RawVisionScreenExtraction[] }>();

  for (const ext of extractions) {
    const fileMeta = ext.fileName ? parseFilenameMetadata(ext.fileName) : {};
    const acctId = fileMeta.accountRaw || ext.account || 'DEFAULT_ACCOUNT';
    const clusterKey = `${fileMeta.institution || ext.institution || 'WeBull'}_${acctId}`;

    if (!accountClusters.has(clusterKey)) {
      accountClusters.set(clusterKey, {
        meta: fileMeta,
        screens: [],
      });
    }
    accountClusters.get(clusterKey)!.screens.push(ext);
  }

  const stitchedAccounts: StitchedAccountResult[] = [];
  let totalOverlapsRemoved = 0;
  let totalPositionsReconciled = 0;

  // 2. Process each account cluster in total isolation
  for (const [clusterKey, cluster] of accountClusters.entries()) {
    const { meta } = cluster;
    // Order screenshots in dataset sequence (e.g. 6696 -> 6697 -> 6698 -> 6699)
    const screens = orderScreenshotsInDataset(cluster.screens);
    const institution = meta.institution || screens[0].institution || 'WeBull';
    const accountRaw = meta.accountRaw || screens[0].account || 'UNKNOWN';
    const accountMasked = meta.accountSuffix ? `***-${meta.accountSuffix}` : `***-${extractAccountSuffix(accountRaw)}`;
    const accountType = meta.accountType || screens[0].accountType || 'Brokerage';
    const asOfDate = meta.asOfDate || screens[0].asOfDate || new Date().toISOString().split('T')[0];

    // Find top-level header metrics (from the screen that captured the header cards)
    let netAccountValue: number | undefined;
    let cashBalance = 0;
    let settledCash = 0;
    let expectedPositionsCount: number | undefined;

    for (const screen of screens) {
      if (screen.cashBalance !== undefined && screen.cashBalance > 0 && cashBalance === 0) {
        cashBalance = screen.cashBalance;
      }
      if (screen.settledCash !== undefined && screen.settledCash > 0 && settledCash === 0) {
        settledCash = screen.settledCash;
      }
      if (screen.netAccountValue !== undefined && screen.netAccountValue > 0 && netAccountValue === undefined) {
        netAccountValue = screen.netAccountValue;
      }
      if (screen.myPositionsCount !== undefined && screen.myPositionsCount > 0 && expectedPositionsCount === undefined) {
        expectedPositionsCount = screen.myPositionsCount;
      }
    }

    // Collect all covered call underlyings in this account cluster to distinguish
    // collateral shares from uncovered equity pools
    const coveredCallUnderlyings = new Set<string>();
    for (const screen of screens) {
      for (const p of screen.positions) {
        const isCall =
          p.optionType === 'Call' ||
          p.category?.includes('Call') ||
          p.symbol.includes('Call') ||
          p.category === 'Covered Call';
        if (isCall) {
          const und = (p.underlying || p.symbol.split(' ')[0])
            .toUpperCase()
            .replace(/\s+COVERED OPTION$/i, '')
            .trim();
          if (und) coveredCallUnderlyings.add(und);
        }
        if (p.isCoveredOptionGroup || p.category === 'Covered Option') {
          const und = p.symbol.split(' ')[0].toUpperCase();
          if (und) coveredCallUnderlyings.add(und);
        }
      }
    }

    // Intra-account deduplication structures
    const seenSignatures = new Set<string>();
    const deduplicatedPositions: CanonicalPosition[] = [];
    let overlapsInAccount = 0;

    // Process positions across all screens in this account
    for (const screen of screens) {
      for (const rawPos of screen.positions) {
        // Handle WeBull tree hierarchy: Covered Option group
        if (rawPos.isCoveredOptionGroup || rawPos.category === 'Covered Option') {
          // Deconstruct children: Stock + Short Call
          if (rawPos.coveredChildren && rawPos.coveredChildren.length > 0) {
            for (const child of rawPos.coveredChildren) {
              processAndAddPosition(child, true);
            }
          }
          // The parent group row itself is discarded (avoids double-counting net value)
          continue;
        }

        processAndAddPosition(rawPos, rawPos.isCovered || false);
      }
    }

    // Add exactly ONE canonical cash position if cashBalance > 0
    if (cashBalance > 0 && !deduplicatedPositions.some((p) => p.assetClass === 'Cash')) {
      deduplicatedPositions.unshift({
        id: `pos_${accountRaw}_CASH`,
        symbol: 'USD',
        name: 'US Dollar (Cash Balance)',
        assetClass: 'Cash',
        quantity: cashBalance,
        marketValue: cashBalance,
        institution,
        accountId: accountRaw,
      });
    }

    function processAndAddPosition(pos: RawVisionPosition, isCoveredFlag: boolean) {
      // 1. Strict semantic Cash ledger isolation (never add Cash as a stock row)
      const upperSym = (pos.symbol || '').toUpperCase().trim();
      if (pos.category === 'Cash' || upperSym === 'USD' || upperSym === 'CASH') {
        const cashAmt = pos.marketValue !== undefined ? pos.marketValue : (pos.quantity || 0);
        if (cashAmt > 0 && cashBalance === 0) {
          cashBalance = cashAmt;
        }
        return;
      }

      // Determine assetClass
      let assetClass: AssetClass = 'Stock';
      const posCatLower = (pos.category || '').toLowerCase();
      const posSymUpper = (pos.symbol || '').toUpperCase();
      const isCallOption = pos.optionType === 'Call' || pos.category?.includes('Call') || pos.symbol.includes('Call');
      const isPutOption = pos.optionType === 'Put' || pos.category?.includes('Put') || pos.symbol.includes('Put');

      if (pos.assetClass === 'CD' || posCatLower === 'cd' || posCatLower.includes('certificate of deposit') || posCatLower.includes('time deposit') || posSymUpper.includes('CERTIFICATE OF DEPOSIT') || /\bCD\b/.test(pos.symbol)) {
        assetClass = 'CD';
      } else if (pos.assetClass === 'Treasury' || posCatLower === 'treasury' || posCatLower.includes('treasury') || posCatLower.includes('t-bill') || posCatLower.includes('tbill') || posCatLower.includes('fixed income')) {
        assetClass = 'Treasury';
      } else if (pos.assetClass === 'BondETF' || posCatLower === 'bondetf' || posCatLower === 'bond etf') {
        assetClass = 'BondETF';
      } else if (isCoveredFlag && isCallOption) {
        assetClass = 'CoveredCall';
      } else if (pos.category === 'CoveredCall' || pos.category === 'Covered Call') {
        assetClass = 'CoveredCall';
      } else if (isPutOption) {
        assetClass = 'CSP';
      } else if (isCallOption) {
        assetClass = 'CoveredCall';
      } else if (pos.category === 'ETF' || pos.symbol === 'GLDM' || pos.symbol === 'BITB' || pos.symbol === 'FBTC' || pos.symbol === 'SPY') {
        assetClass = 'ETF';
      } else if (pos.category === 'Crypto') {
        assetClass = 'Crypto';
      }

      let cleanSymbol = pos.symbol.trim();
      if (cleanSymbol.toUpperCase().includes('COVERED OPTION')) {
        cleanSymbol = cleanSymbol.replace(/\s*covered option/i, '').trim();
      }
      if (cleanSymbol.toUpperCase().startsWith('C-STK')) {
        cleanSymbol = cleanSymbol.replace(/^c-stk\s+/i, '').trim();
      }
      if (assetClass === 'Stock' || assetClass === 'ETF') {
        cleanSymbol = cleanSymbol.replace(/\s+(stock|equity)$/i, '').trim();
      }

      const mktValue =
        pos.marketValue !== undefined
          ? pos.marketValue
          : (pos.currentPrice || 0) * (pos.quantity || 1);

      const canonical: CanonicalPosition = {
        id: `pos_${accountRaw}_${cleanSymbol}_${deduplicatedPositions.length}`,
        symbol: cleanSymbol,
        name: pos.description || pos.name || pos.symbol,
        assetClass,
        quantity: pos.quantity,
        marketValue: mktValue,
        costBasis: pos.costBasis,
        apy: pos.apy,
        maturityDate: pos.maturityDate,
        institution,
        accountId: accountRaw,
      };

      if ((pos as any).currentPrice) {
        (canonical as any).currentPrice = pos.currentPrice;
      }
      (canonical as any).isCovered = !!isCoveredFlag;

      // Populate OptionInfo if option
      if (assetClass === 'CoveredCall' || assetClass === 'CSP') {
        let parsedStrike = pos.strikePrice ?? (pos as any).strike ?? 0;
        if (!parsedStrike) {
          const strikeMatch = pos.symbol.match(/\$?(\d+(?:\.\d+)?)\s*(?:Call|Put)/i);
          if (strikeMatch) {
            parsedStrike = parseFloat(strikeMatch[1]);
          }
        }

        const parsedExpiry =
          pos.expirationDate ||
          (pos as any).expiry ||
          (pos as any).optionDetails?.expiry;
        const parsedUnderlying =
          pos.underlying ||
          (pos as any).underlyingSymbol ||
          (pos as any).optionDetails?.underlying ||
          pos.symbol.split(' ')[0].replace(/\s+COVERED OPTION$/i, '').trim();

        canonical.option = {
          underlying: parsedUnderlying,
          strike: parsedStrike,
          right: isCallOption ? 'CALL' : 'PUT',
          contracts: Math.abs(pos.quantity) || 1,
          expiry: parsedExpiry,
        };

        const optUnderlying = canonical.option.underlying.toUpperCase();
        const optStrike = canonical.option.strike;
        const optRight = canonical.option.right;

        // Search for an existing option in this account with the same underlying and right
        // If strike matches OR one of them has strike 0 (truncated/cut-off at screen boundary)
        const existingOptIdx = deduplicatedPositions.findIndex(
          (p) =>
            (p.assetClass === 'CoveredCall' || p.assetClass === 'CSP') &&
            (p.option?.underlying || p.symbol.split(' ')[0]).toUpperCase() === optUnderlying &&
            ((optStrike > 0 && Math.abs((p.option?.strike || 0) - optStrike) < 0.01) ||
              (p.option?.strike || 0) === 0 ||
              optStrike === 0) &&
            (p.option?.right || 'CALL') === optRight
        );

        if (existingOptIdx !== -1) {
          const existingOpt = deduplicatedPositions[existingOptIdx];
          const newHasExpiry = !!canonical.option.expiry && canonical.option.expiry !== '—';
          const existHasExpiry = !!existingOpt.option?.expiry && existingOpt.option.expiry !== '—';
          const newHasStandardValue = Math.abs(canonical.marketValue) >= 0.50;
          const existHasTinyValue = Math.abs(existingOpt.marketValue) < 0.50;

          // If the incoming option is complete (has expiry, valid strike, or standard value) while existing is cut-off/partial:
          if (
            (newHasExpiry && !existHasExpiry) ||
            (newHasStandardValue && existHasTinyValue) ||
            (canonical.option.strike > 0 && (existingOpt.option?.strike || 0) === 0)
          ) {
            deduplicatedPositions[existingOptIdx] = canonical;
            overlapsInAccount++;
            return;
          }

          // Existing is already complete or identical scrolling overlap
          overlapsInAccount++;
          return;
        }

        const sig = getIntraAccountSignature(canonical);
        if (seenSignatures.has(sig)) {
          overlapsInAccount++;
          return;
        }
        seenSignatures.add(sig);
        deduplicatedPositions.push(canonical);
        return;
      }

      // Intra-account deduplication & consolidation for Equities (Stock / ETF)
      if (assetClass === 'Stock' || assetClass === 'ETF') {
        const normSym = cleanSymbol.toUpperCase();
        const hasCoveredCall = coveredCallUnderlyings.has(normSym);

        const sig = getIntraAccountSignature(canonical);
        if (seenSignatures.has(sig)) {
          // Exact scrolling duplicate of this specific pool
          overlapsInAccount++;
          return;
        }

        const existingIdx = deduplicatedPositions.findIndex(
          (p) =>
            (p.assetClass === 'Stock' || p.assetClass === 'ETF') &&
            p.symbol.toUpperCase() === normSym
        );

        if (existingIdx !== -1) {
          const existing = deduplicatedPositions[existingIdx];

          if (!hasCoveredCall) {
            // Case 1: Plain stock with NO covered calls.
            // There can only EVER be ONE position for this symbol in this account.
            // Supersede if incoming row has larger value or higher precision.
            const newDecimals = (String(canonical.quantity).split('.')[1] || '').length;
            const existDecimals = (String(existing.quantity).split('.')[1] || '').length;

            if (
              canonical.marketValue > existing.marketValue ||
              (newDecimals > existDecimals && canonical.marketValue >= existing.marketValue * 0.9)
            ) {
              deduplicatedPositions[existingIdx] = canonical;
            }
            seenSignatures.add(sig);
            overlapsInAccount++;
            return;
          } else {
            // Case 2: Stock WITH covered call(s) (e.g. SOFI).
            // Consolidate distinct pools (unhedged shares + covered collateral shares) into ONE unified holding.
            seenSignatures.add(sig);
            existing.quantity = Number((existing.quantity + canonical.quantity).toFixed(5));
            existing.marketValue = Number((existing.marketValue + canonical.marketValue).toFixed(2));
            if (canonical.costBasis !== undefined || existing.costBasis !== undefined) {
              existing.costBasis = Number(
                (
                  (existing.costBasis || existing.marketValue) +
                  (canonical.costBasis || canonical.marketValue)
                ).toFixed(2)
              );
            }
            if (isCoveredFlag) {
              (existing as any).isCovered = true;
            }
            overlapsInAccount++;
            return;
          }
        }

        seenSignatures.add(sig);
        deduplicatedPositions.push(canonical);
        return;
      }

      const sig = getIntraAccountSignature(canonical);
      if (seenSignatures.has(sig)) {
        // Duplicate scrolling overlap detected within the same account
        overlapsInAccount++;
      } else {
        seenSignatures.add(sig);
        deduplicatedPositions.push(canonical);
      }
    }

    const nonCashPositionsCount = deduplicatedPositions.filter((p) => p.assetClass !== 'Cash').length;
    const uniqueUnderlyingsCount = new Set(
      deduplicatedPositions
        .filter((p) => p.assetClass !== 'Cash')
        .map((p) => (p.option?.underlying || p.symbol).toUpperCase())
    ).size;
    const isCountVerified =
      expectedPositionsCount !== undefined
        ? nonCashPositionsCount === expectedPositionsCount || uniqueUnderlyingsCount === expectedPositionsCount
        : true;

    totalOverlapsRemoved += overlapsInAccount;
    totalPositionsReconciled += deduplicatedPositions.length;

    stitchedAccounts.push({
      accountId: accountRaw,
      accountMasked,
      accountType,
      institution,
      asOfDate,
      netAccountValue,
      cashBalance,
      settledCash,
      expectedPositionsCount,
      deduplicatedPositions,
      overlapDuplicatesRemoved: overlapsInAccount,
      isCountVerified,
      screenshotCount: screens.length,
    });
  }

  return {
    accounts: stitchedAccounts,
    totalScreenshots: extractions.length,
    totalOverlapsRemoved,
    totalPositionsReconciled,
  };
}
